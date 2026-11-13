// workers/prim-journeys/worker.js — relais vers le calculateur d'itinéraires IDFM (PRIM).
//
// Le site demande « combien de temps en transports d'un point vers chaque espace » ;
// le Worker interroge PRIM (clé gardée en secret côté serveur) et renvoie les durées.
//
// Requête : POST { from: { lat, lng }, to: [{ id, lat, lng }, …] }   (20 destinations max)
// Réponse : { times: { id: minutes | null } }   (null = pas d'itinéraire ou erreur)
//
// Trajets en direct : départ maintenant (horaires réels du réseau IDFM).
// Chaque couple départ / arrivée est mis en cache 5 minutes (coordonnées arrondies à
// ~100 m) ; le cache ne fonctionne que sur un domaine personnalisé, pas sur workers.dev.
//
// Réglages (wrangler) :
//   secret PRIM_KEY          jeton PRIM (wrangler secret put PRIM_KEY)
//   var ALLOWED_ORIGINS      domaines autorisés, séparés par des virgules

const PRIM_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys";
const MAX_DESTINATIONS = 20;
const CACHE_SECONDS = 5 * 60;

// Coordonnée arrondie (3 décimales ≈ 100 m) : clé de cache et requête
const round = (n) => Math.round(Number(n) * 1000) / 1000;
const isCoord = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));

// Durée en minutes du meilleur itinéraire, ou null
async function journeyMinutes(from, to, env, ctx) {
  const key = `https://prim-cache.local/j?f=${round(from.lat)},${round(from.lng)}&t=${round(to.lat)},${round(to.lng)}`;
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return (await hit.json()).minutes;

  const url = new URL(PRIM_URL);
  url.searchParams.set("from", `${round(from.lng)};${round(from.lat)}`);
  url.searchParams.set("to", `${round(to.lng)};${round(to.lat)}`);
  url.searchParams.set("count", "3");

  let minutes = null;
  try {
    const res = await fetch(url, { headers: { apikey: env.PRIM_KEY, accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      const durations = (data.journeys || []).map((j) => j.duration).filter(Number.isFinite);
      if (durations.length) minutes = Math.max(1, Math.round(Math.min(...durations) / 60));
    }
  } catch {
    minutes = null;
  }

  // On ne met en cache que les réponses utiles (une erreur PRIM sera retentée)
  if (minutes != null) {
    const body = new Response(JSON.stringify({ minutes }), {
      headers: { "content-type": "application/json", "cache-control": `max-age=${CACHE_SECONDS}` },
    });
    ctx.waitUntil(cache.put(key, body));
  }
  return minutes;
}

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && allowed.includes(origin);
  return {
    "access-control-allow-origin": ok ? origin : allowed[0] || "",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, env);
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST attendu" }, 405);
    if (!env.PRIM_KEY) return json({ error: "PRIM_KEY manquant" }, 500);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "JSON invalide" }, 400);
    }
    const { from, to } = payload || {};
    if (!isCoord(from) || !Array.isArray(to)) return json({ error: "from / to invalides" }, 400);

    const targets = to.filter((t) => t && t.id != null && isCoord(t)).slice(0, MAX_DESTINATIONS);
    const results = await Promise.all(targets.map((t) => journeyMinutes(from, t, env, ctx)));

    const times = {};
    targets.forEach((t, i) => (times[t.id] = results[i]));
    return json({ times });
  },
};
