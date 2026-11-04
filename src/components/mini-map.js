// src/components/mini-map.js — petite carte décorative (mega menu « Nos espaces ») :
// même carte que les autres (MapLibre + OpenFreeMap, couleurs Work & Share,
// pins « maison » qui poppent), sans aucun bouton ni interaction.
//
// STRUCTURE (attributs posés dans Webflow) :
//   img[data-mini-map]                image de repli : la carte prend sa place
//                                     (mêmes classes, donc même taille et arrondi)
//   [data-pin-lat][data-pin-lng]      un élément par pin, n'importe où dans la
//                                     page (liens des villes du mega menu)
//
// Chargée seulement quand l'image devient visible (ouverture du menu) :
// MapLibre est lourd. Sans animation si l'utilisateur les a réduites.

import { loadMapLibre, STYLE_URL, applyTheme, PIN_SVG } from "../utils/map-base.js";
import { prefersReducedMotion } from "../utils/motion.js";

const PIN_STAGGER = 50; // ms entre deux pins à l'apparition
const PADDING = 32; // px autour des pins

export function initMiniMaps(root = document) {
  const images = [...root.querySelectorAll("img[data-mini-map]")];
  if (!images.length || !("IntersectionObserver" in window)) return;

  // Pins : coordonnées lues une fois, sans doublon (desktop + mobile)
  const seen = new Set();
  const pins = [];
  root.querySelectorAll("[data-pin-lat][data-pin-lng]").forEach((el) => {
    const lat = parseFloat(el.getAttribute("data-pin-lat"));
    const lng = parseFloat(el.getAttribute("data-pin-lng"));
    const key = `${lat},${lng}`;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || seen.has(key)) return;
    seen.add(key);
    pins.push([lng, lat]);
  });
  if (!pins.length) return;

  // Visible = panneau ouvert (l'image passe de display:none à affichée)
  const observer = new IntersectionObserver((entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      createMap(entry.target, pins);
    }),
  );
  images.forEach((img) => observer.observe(img));
}

async function createMap(img, pins) {
  const maplibregl = await loadMapLibre();
  if (!maplibregl) return;

  // Conteneur à la place de l'image, avec ses classes Webflow
  const box = document.createElement("div");
  box.className = `${img.className} mini-map`;
  if (img.alt) {
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", img.alt);
  } else box.setAttribute("aria-hidden", "true");
  img.after(box);
  img.style.display = "none"; // la carte prend sa place (fond beige, puis fondu)
  const canvas = document.createElement("div");
  canvas.className = "mini-map_canvas";
  box.appendChild(canvas);

  const bounds = new maplibregl.LngLatBounds();
  pins.forEach((p) => bounds.extend(p));

  const map = new maplibregl.Map({
    container: canvas,
    style: STYLE_URL,
    bounds,
    fitBoundsOptions: { padding: PADDING },
    interactive: false, // ni glisser, ni zoom, ni molette
    attributionControl: false,
  });
  map.on("style.load", () => applyTheme(map));

  const reduced = prefersReducedMotion();
  const markers = pins.map((lngLat) => {
    const el = document.createElement("div");
    el.className = "map-pin mini-map_pin";
    if (!reduced) el.classList.add("is-pending");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = PIN_SVG;
    new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(lngLat).addTo(map);
    return el;
  });

  map.once("load", () => {
    // Taille réelle connue maintenant (panneau ouvert) : on recadre
    map.resize();
    map.fitBounds(bounds, { padding: PADDING, duration: 0 });
    box.classList.add("is-ready");
    if (reduced) return;
    // Pins qui poppent l'un après l'autre, dans un ordre aléatoire
    const order = [...markers].sort(() => Math.random() - 0.5);
    order.forEach((el, i) => {
      el.style.setProperty("--pin-delay", `${200 + i * PIN_STAGGER}ms`);
      el.classList.replace("is-pending", "is-popping");
    });
  });
}
