// src/utils/transit.js — temps de trajet en transports en commun vers les espaces.
//
// Interroge le relais Cloudflare « wns-prim-journeys » (calculateur IDFM PRIM,
// voir workers/prim-journeys/). Sans URL ou en cas d'échec, renvoie une Map vide :
// le module carte garde alors la distance « à vol d'oiseau ».

// URL du Worker (vide = fonction désactivée, la distance reste affichée)
export const TRANSIT_URL = "https://wns-prim-journeys.amprod.workers.dev";

const TIMEOUT = 8000; // ms : au-delà, on garde la distance
const cache = new Map(); // point de départ arrondi -> Promise<Map<slug, minutes>>

const round = (n) => Math.round(n * 1000) / 1000;

// Map slug -> minutes (seulement les espaces pour lesquels un trajet a été trouvé)
export function transitTimes(origin, spaces) {
  if (!TRANSIT_URL || !origin || !spaces.length) return Promise.resolve(new Map());
  const key = `${round(origin.lat)},${round(origin.lng)}`;
  if (cache.has(key)) return cache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  const request = fetch(TRANSIT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      from: { lat: origin.lat, lng: origin.lng },
      to: spaces.map((s) => ({ id: s.slug, lat: s.lat, lng: s.lng })),
    }),
    signal: controller.signal,
  })
    .then((r) => (r.ok ? r.json() : { times: {} }))
    .then(({ times = {} }) => new Map(Object.entries(times).filter(([, min]) => Number.isFinite(min))))
    .catch(() => new Map())
    .finally(() => clearTimeout(timer));

  // Un échec n'est pas gardé en cache : une nouvelle recherche réessaie
  request.then((times) => {
    if (!times.size) cache.delete(key);
  });
  cache.set(key, request);
  return request;
}

// Temps de marche estimé depuis la distance à vol d'oiseau (minutes, au moins 1) :
// 80 m/min, rues 30 % plus longues que la ligne droite (mêmes valeurs que stations.js)
export function walkMinutes(km) {
  return Math.max(1, Math.ceil((km * 1000 * 1.3) / 80));
}

// « 25 min », « 1 h 05 »
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
