// src/utils/stations.js — gares et stations d'Île-de-France (stations.json, open data IDFM).
//
// - loadStations() : charge la liste une seule fois (≈ 46 Ko, à la demande) ;
// - nearestStations(point) : gares les plus proches d'un espace, avec temps à pied ;
// - renderLines(stations) / renderLineList(lignes) : pastilles de lignes (classe Webflow
//   transport-line, data-line = slug CMS, couleur et picto via _transport-lines.scss).

import { ASSET_BASE } from "./load-asset.js";
import { distanceKm, normalize } from "./geo.js";

const WALK_SPEED = 80; // mètres par minute
const DETOUR = 1.3; // la marche réelle est plus longue que la ligne droite
const MODE_ORDER = { M: 0, RER: 1, T: 2, TRAM: 3, BUS: 4, VAL: 5, CABLE: 6 };

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

// Pastilles de lignes depuis des gares : un picto de mode puis les numéros
export function renderLines(stations, { maxLines = 4 } = {}) {
  const lines = [];
  stations.forEach((s) => lines.push(...s.lines));
  return renderLineList(lines, { maxLines });
}

// Ordre d'affichage : métro, RER, train, tram, bus, puis numéro
export function sortLines(lines) {
  return [...lines].sort(
    (a, b) => (MODE_ORDER[a[0]] ?? 9) - (MODE_ORDER[b[0]] ?? 9) || a[1].localeCompare(b[1], "fr", { numeric: true }),
  );
}

const MODE_LABEL = { M: "Métro", RER: "RER", T: "Train", TRAM: "Tramway", BUS: "Bus", VAL: "Navette", CABLE: "Câble" };

// Nom lisible d'une ligne : « Métro 13 », « RER A », « Train L », « Tram T2 »
export function lineLabel([mode, line]) {
  return mode === "TRAM" ? `Tram T${line}` : `${MODE_LABEL[mode] || mode} ${line}`;
}

// Pastilles depuis une liste [[mode, ligne]] : même balisage que les pastilles
// posées dans Webflow (.transport-line + data-line="metro-13" + data-line-mode),
// couleur et picto de mode viennent du CSS (styles/_transport-lines.scss).
const MODE_CMS = { M: "Métro", RER: "RER", T: "Train", TRAM: "Tram", BUS: "Bus", VAL: "Navette", CABLE: "Câble" };

export function lineSlug([mode, line]) {
  const id = String(line).toLowerCase();
  return { M: `metro-${id}`, RER: `rer-${id}`, T: `train-${id}`, TRAM: `tram-t${id}`, BUS: `bus-${id}` }[mode] || `${mode.toLowerCase()}-${id}`;
}

export function renderLineList(list, { maxLines = 4, sort = false } = {}) {
  const box = document.createElement("span");
  box.className = "transport-lines";
  box.setAttribute("data-space-lines", "");

  const seen = new Set();
  const lines = [];
  (sort ? sortLines(list) : list).forEach(([mode, line]) => {
    const key = `${mode}-${line}`;
    if (!seen.has(key)) {
      seen.add(key);
      lines.push([mode, line]);
    }
  });

  lines.slice(0, maxLines).forEach(([mode, line]) => {
    const badge = document.createElement("span");
    badge.className = mode === "T" || mode === "RER" ? "transport-line is-square" : "transport-line";
    badge.setAttribute("data-line", lineSlug([mode, line]));
    badge.setAttribute("data-line-mode", MODE_CMS[mode] || mode);
    badge.title = lineLabel([mode, line]);
    badge.textContent = mode === "TRAM" ? `T${line}` : line;
    box.appendChild(badge);
  });

  box.setAttribute("aria-hidden", "true"); // le nom de gare et le texte suffisent aux lecteurs d'écran
  return lines.length ? box : null;
}
