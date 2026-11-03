// src/components/space-map.js — carte d'accès d'une page espace (« Venir à… ») :
// même carte que celle des espaces (MapLibre + OpenFreeMap, couleurs Work &
// Share, pin « maison »), avec le seul pin de l'espace.
//
// STRUCTURE (attributs posés dans Webflow, reliés au CMS) :
//   [data-map][data-lat][data-lng]   zone carte (hors [data-map-module])
//     data-map-label="Villejuif"     nom affiché sous le pin
//     data-map-zoom="14"             zoom de départ (optionnel)
//     img, .space-map_pin, .space-map_credit   image, faux pin et crédits de
//                                    repli (masqués une fois la carte prête)
//
// Chargée seulement à l'approche de la section (MapLibre est lourd). Molette :
// la page défile (boutons + / − pour zoomer) ; mobile : deux doigts.

import { loadMapLibre, STYLE_URL, applyTheme, PIN_SVG, escapeHtml } from "../utils/map-base.js";
import { t } from "../utils/i18n.js";
import { prefersReducedMotion } from "../utils/motion.js";

const DESKTOP = window.matchMedia("(min-width: 992px)");
const DEFAULT_ZOOM = 14.5;

const ICON_PLUS = "M10 4v12M4 10h12";
const ICON_MINUS = "M4 10h12";
const ICON_RECENTER =
  "M7 3H5a2 2 0 0 0-2 2v2M13 3h2a2 2 0 0 1 2 2v2M13 17h2a2 2 0 0 0 2-2v-2M7 17H5a2 2 0 0 1-2-2v-2M12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z";

export function initSpaceMaps(root = document) {
  const maps = [...root.querySelectorAll("[data-map][data-lat][data-lng]")].filter(
    (el) => !el.closest("[data-map-module]"),
  );
  if (!maps.length) return;

  // Chargement à l'approche (600 px avant d'arriver à l'écran)
  if (!("IntersectionObserver" in window)) return maps.forEach(createMap);
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        createMap(entry.target);
      }),
    { rootMargin: "600px 0px" },
  );
  maps.forEach((el) => observer.observe(el));
}

function iconButton(path, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "map-control";
  button.setAttribute("aria-label", label);
  button.innerHTML = `<span class="icon-20"><svg viewBox="0 0 20 20" width="100%" height="100%" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  button.addEventListener("click", (e) => {
    e.preventDefault();
    onClick();
  });
  return button;
}

async function createMap(el) {
  const lat = parseFloat(el.getAttribute("data-lat"));
  const lng = parseFloat(el.getAttribute("data-lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const name = el.getAttribute("data-map-label") || "";
  const zoom = parseFloat(el.getAttribute("data-map-zoom")) || DEFAULT_ZOOM;

  const maplibregl = await loadMapLibre();
  if (!maplibregl) return;

  const canvas = document.createElement("div");
  canvas.className = "map-module_canvas";
  el.prepend(canvas);

  const center = [lng, lat];
  const map = new maplibregl.Map({
    container: canvas,
    style: STYLE_URL,
    center,
    zoom,
    attributionControl: false, // crédits affichés dans le coin (texte du site)
    scrollZoom: false, // la molette fait défiler la page
    cooperativeGestures: !DESKTOP.matches, // mobile : deux doigts pour bouger la carte
    dragRotate: false,
    pitchWithRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  map.on("style.load", () => applyTheme(map));
  map.once("load", () => el.classList.add("is-map-ready"));

  // Pin de l'espace (toujours « actif » : nom affiché)
  const pin = document.createElement("div");
  pin.className = "map-pin is-active";
  pin.setAttribute("role", "img");
  pin.setAttribute("aria-label", t("map.pin", { name }));
  pin.innerHTML = `${PIN_SVG}${name ? `<span class="map-pin_label">${escapeHtml(name)}</span>` : ""}`;
  new maplibregl.Marker({ element: pin, anchor: "bottom" }).setLngLat(center).addTo(map);

  // Zoom + / − et recentrage
  const animate = !prefersReducedMotion();
  const controls = document.createElement("div");
  controls.className = "map-controls";
  controls.append(
    iconButton(ICON_PLUS, t("map.zoomIn"), () => map.zoomIn({ animate })),
    iconButton(ICON_MINUS, t("map.zoomOut"), () => map.zoomOut({ animate })),
    iconButton(ICON_RECENTER, t("map.recenter"), () => map.easeTo({ center, zoom, duration: animate ? 600 : 0 })),
  );
  el.appendChild(controls);

  // Crédits de la carte réelle
  const credit = el.querySelector(".space-map_credit, [data-map-attribution]");
  if (credit) credit.textContent = t("map.attribution");
}
