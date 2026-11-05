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
// Pin « maison » Work & Share (Figma 4681:26138) : maison arrondie au toit bas
// (.map-pin_house) et logo WS (.map-pin_logo, tracé du logo de la nav)
const PIN_LOGO =
  "M57.124 0C57.5655 0 57.9237 0.355883 57.9238 0.794922C57.9238 1.20466 57.6074 1.54533 57.2002 1.60742C48.2446 2.97316 45.6529 13.2223 45.6221 17.6855C45.5878 22.2667 48.1198 25.5007 52.7588 25.7705C57.3967 26.0403 59.0722 22.2331 62.4941 13.1719C65.9135 4.10938 68.5442 1.8861 74.0381 1.21289C76.0902 0.961397 77.6286 1.12776 78.75 1.43555C79.6133 1.6725 79.2753 2.34755 78.3877 2.46582C73.4269 3.1268 73.3957 12.0463 70.1562 22.1992C66.3759 34.0557 53.7789 32.9104 49.1396 29.542C46.0903 27.3268 44.6476 23.7929 43.9648 20.9189C43.7348 19.9521 41.9479 19.7078 41.5781 20.6309L37.3301 31.2324C37.1931 31.5742 36.8602 31.7987 36.4902 31.7988H35.7139C35.3404 31.7988 35.0057 31.5702 34.8711 31.2236L26.4492 9.54102C26.1534 8.77981 25.0733 8.77294 24.7676 9.53027L16.0498 31.1348C15.9123 31.4756 15.5802 31.6992 15.2109 31.6992H14.707C14.329 31.699 13.9944 31.4728 13.8633 31.1201C12.7929 28.243 7.99807 15.3504 5.49316 8.52441C3.50982 3.11277 1.60634 1.7294 0.646484 1.38574C0.321876 1.26956 0 0.966166 0 0.623047C0.000155884 0.317057 0.250951 0.0697539 0.558594 0.0722656L15.0215 0.197266C15.319 0.200032 15.5586 0.441345 15.5586 0.737305C15.5585 1.02305 15.3308 1.25572 15.0469 1.2998C10.9822 1.92953 12.96 7.04102 12.96 7.04102L17.5625 19.6387C17.8478 20.4197 18.9578 20.4343 19.2637 19.6611C20.3338 16.9544 22.2407 12.1901 24.1768 7.64648C26.5679 2.02988 23.1607 1.25118 21.8359 1.1543C21.5717 1.13499 21.3477 0.921777 21.3477 0.658203C21.3479 0.40641 21.5535 0.202148 21.8066 0.202148H36.1865C36.5105 0.202148 36.7734 0.463893 36.7734 0.786133C36.7733 1.09905 36.5204 1.35204 36.209 1.39648C31.9025 2.00992 34.209 7.51172 34.209 7.51172L38.7607 19.583C39.0493 20.3481 40.1304 20.3677 40.4414 19.6113C41.7087 16.5302 44.0804 10.7502 45.6543 6.83789C47.3761 2.55973 45.1008 1.51508 43.9629 1.26074C43.6452 1.18976 43.385 0.92049 43.3848 0.59668C43.3848 0.267373 43.6532 0 43.9844 0H57.124Z";

export const PIN_SVG = `<svg viewBox="0 0 48 32" aria-hidden="true" class="map-pin_shape"><path class="map-pin_house" d="M22.6 1.5a3 3 0 0 1 2.8 0l18.9 9.2a3.5 3.5 0 0 1 2 3.1V27.5a3 3 0 0 1-3 3H4.7a3 3 0 0 1-3-3V13.8a3.5 3.5 0 0 1 2-3.1Z"/><path class="map-pin_logo" transform="translate(11 13.4) scale(0.328)" d="${PIN_LOGO}"/></svg>`;

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
