// src/utils/stations.js — gares et stations d'Île-de-France (stations.json, open data IDFM).
//
// - loadStations() : charge la liste une seule fois (≈ 46 Ko, à la demande) ;
// - nearestStations(point) : gares les plus proches d'un espace, avec temps à pied ;
// - renderLines(stations) : pastilles de lignes (classes Webflow transport-line /
//   transport-mode, couleur officielle via data-line, cf. _transport-lines.scss).

import { ASSET_BASE } from "./load-asset.js";
import { distanceKm, normalize } from "./geo.js";

const WALK_SPEED = 80; // mètres par minute
const DETOUR = 1.3; // la marche réelle est plus longue que la ligne droite
const MODE_ORDER = { M: 0, RER: 1, T: 2, TRAM: 3, VAL: 4, CABLE: 5 };

let promise = null;

export function loadStations() {
  if (!promise) {
    promise = fetch(`${ASSET_BASE}stations.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) =>
        rows.map(([name, lat, lng, lines]) => ({
          name,
          lat,
          lng,
          key: normalize(name),
          lines: lines
            ? lines
                .split("|")
                .map((l) => l.split(":"))
                .sort((a, b) => (MODE_ORDER[a[0]] ?? 9) - (MODE_ORDER[b[0]] ?? 9) || a[1].localeCompare(b[1], "fr", { numeric: true }))
            : [],
        })),
      )
      .catch(() => []);
  }
  return promise;
}

// Temps de marche estimé, en minutes (arrondi au-dessus, minimum 1)
export function walkMinutes(km) {
  return Math.max(1, Math.ceil((km * 1000 * DETOUR) / WALK_SPEED));
}

// Gares à moins de radiusKm du point, les plus proches d'abord. La gare saisie
// dans le CMS (« Station la plus proche ») passe en premier si on la trouve.
export function nearestStations(stations, point, { radiusKm = 1.2, max = 2, prefer = "" } = {}) {
  const withDist = stations
    .map((s) => ({ ...s, km: distanceKm(point, s) }))
    .filter((s) => s.km <= radiusKm)
    .sort((a, b) => a.km - b.km);

  const wanted = normalize(prefer);
  if (wanted) {
    const i = withDist.findIndex((s) => s.key === wanted || s.key.includes(wanted) || wanted.includes(s.key));
    if (i > 0) withDist.unshift(withDist.splice(i, 1)[0]);
  }
  return withDist.slice(0, max).map((s) => ({ ...s, walk: walkMinutes(s.km) }));
}

// Pastilles de lignes : un picto de mode puis les numéros, sans doublon
export function renderLines(stations, { maxLines = 4 } = {}) {
  const box = document.createElement("span");
  box.className = "transport-lines";
  box.setAttribute("data-space-lines", "");

  const seen = new Set();
  const lines = [];
  stations.forEach((s) =>
    s.lines.forEach(([mode, line]) => {
      const key = `${mode}-${line}`;
      if (!seen.has(key)) {
        seen.add(key);
        lines.push([mode, line]);
      }
    }),
  );

  let lastMode = null;
  lines.slice(0, maxLines).forEach(([mode, line]) => {
    // Picto de mode à chaque changement de mode (M, RER, train, tram)
    if (mode !== lastMode) {
      const chip = document.createElement("span");
      chip.className = "transport-mode";
      chip.setAttribute("data-mode", mode);
      chip.title = { M: "Métro", RER: "RER", T: "Train", TRAM: "Tramway", VAL: "Navette", CABLE: "Câble" }[mode] || mode;
      chip.textContent = { M: "M", RER: "RER", T: "", TRAM: "T", VAL: "VAL", CABLE: "C" }[mode] ?? mode;
      if (mode === "T") chip.innerHTML = '<span class="icon-16"><span class="ico-train"></span></span>';
      box.appendChild(chip);
      lastMode = mode;
    }
    const badge = document.createElement("span");
    badge.className = mode === "T" || mode === "RER" ? "transport-line is-square" : "transport-line";
    badge.setAttribute("data-line", `${mode}-${line}`);
    badge.textContent = mode === "TRAM" ? `T${line}` : line;
    box.appendChild(badge);
  });

  box.setAttribute("aria-hidden", "true"); // le nom de gare et le texte suffisent aux lecteurs d'écran
  return lines.length ? box : null;
}
