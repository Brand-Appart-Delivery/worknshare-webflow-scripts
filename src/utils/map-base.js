// src/utils/map-base.js — base commune des cartes MapLibre + OpenFreeMap
// (carte des espaces, carte d'accès d'une page espace) : chargement de la
// librairie, style, couleurs Work & Share, pin « maison ».

import { loadScript, loadStyle } from "./load-asset.js";

const MAPLIBRE_VERSION = "4.7.1";
const MAPLIBRE_JS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
export const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Charge MapLibre (JS + CSS) une seule fois ; renvoie window.maplibregl
export async function loadMapLibre() {
  await Promise.all([loadStyle(MAPLIBRE_CSS), loadScript(MAPLIBRE_JS)]);
  return window.maplibregl || null;
}

// Couleurs de la carte (charte Work & Share). Appliquées par-dessus le style
// Positron d'OpenFreeMap : modifier ici pour retoucher le fond de carte.
const THEME = {
  background: "#fbf3d5", // terre (beige)
  water: "#d6e2d3",
  park: "#ecebc4",
  building: "#f3e8c2",
  roadMajor: "#ffffff",
  roadMinor: "#fdf9ea",
  label: "#4a4d2c",
  labelHalo: "#fbf3d5",
};

// Pin « maison » Work & Share (SVG inline, couleurs gérées en CSS)
export const PIN_SVG =
  '<svg viewBox="0 0 40 44" aria-hidden="true" class="map-pin_shape"><path d="M20 1 39 13v29a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V13Z"/><text x="20" y="31" text-anchor="middle">W/</text></svg>';

// Recolore le style Positron aux couleurs de Work & Share
export function applyTheme(map) {
  const style = map.getStyle();
  if (!style || !style.layers) return;
  style.layers.forEach((layer) => {
    const id = layer.id;
    const paint = (prop, value) => {
      try {
        map.setPaintProperty(id, prop, value);
      } catch (e) {
        /* propriété absente pour ce calque */
      }
    };
    if (layer.type === "background") paint("background-color", THEME.background);
    else if (layer.type === "fill" && /water/.test(id)) paint("fill-color", THEME.water);
    else if (layer.type === "fill" && /park|landcover|landuse|wood|grass/.test(id)) paint("fill-color", THEME.park);
    else if (layer.type === "fill" && /building/.test(id)) paint("fill-color", THEME.building);
    else if (layer.type === "line" && /water|river/.test(id)) paint("line-color", THEME.water);
    else if (layer.type === "line" && /motorway|trunk|primary|major/.test(id)) paint("line-color", THEME.roadMajor);
    else if (layer.type === "line" && /road|street|minor|secondary|tertiary|path/.test(id)) paint("line-color", THEME.roadMinor);
    else if (layer.type === "symbol") {
      paint("text-color", THEME.label);
      paint("text-halo-color", THEME.labelHalo);
    }
  });
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
