// scripts/build-stations.js — génère stations.json (gares et stations d'Île-de-France)
// à partir de l'open data Île-de-France Mobilités (« Emplacement des gares IDF »).
//
//   node scripts/build-stations.js
//
// Sortie : stations.json à la racine, servi à côté de main.js (jsDelivr / dev).
// Format compact : [nom, lat, lng, "mode:ligne|mode:ligne"], une entrée par lieu
// de correspondance (une gare desservie par 3 lignes = 1 entrée, 3 lignes).
// À relancer quand le réseau change (nouvelle ligne, nouvelle gare).

const fs = require("fs");
const path = require("path");

const SOURCE =
  "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf/exports/json";
const OUT = path.join(__dirname, "..", "stations.json");

// Modes IDFM -> code court utilisé par le JS (pastilles de ligne)
const MODES = { METRO: "M", RER: "RER", TRAIN: "T", TRAMWAY: "TRAM", VAL: "VAL", CABLE: "CABLE" };

async function run() {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`IDFM : HTTP ${res.status}`);
  const rows = await res.json();

  // Regroupement par zone de correspondance (même nom, même lieu)
  const byZone = new Map();
  for (const r of rows) {
    const name = r.nom_zdc || r.nom_gares;
    const point = r.geo_point_2d;
    if (!name || !point) continue;
    const key = r.id_ref_zdc || name;
    if (!byZone.has(key)) byZone.set(key, { name, lats: [], lngs: [], lines: new Set() });
    const zone = byZone.get(key);
    zone.lats.push(point.lat);
    zone.lngs.push(point.lon);
    const mode = MODES[r.mode] || r.mode;
    const line = (r.indice_lig || "").trim();
    if (line) zone.lines.add(`${mode}:${line}`);
  }

  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const stations = [...byZone.values()]
    .map((z) => [
      z.name,
      Math.round(avg(z.lats) * 1e5) / 1e5,
      Math.round(avg(z.lngs) * 1e5) / 1e5,
      [...z.lines].sort().join("|"),
    ])
    .sort((a, b) => a[0].localeCompare(b[0], "fr"));

  fs.writeFileSync(OUT, JSON.stringify(stations));
  console.log(`✅ ${stations.length} stations -> stations.json (${Math.round(fs.statSync(OUT).size / 1024)} Ko)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
