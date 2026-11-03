// src/components/lightbox.js — visionneuse photo plein écran (maquette Figma
// « WS/Visionneuse ») : compteur « 1 / 18 », légende, bouton fermer, grande
// photo, flèches, miniatures.
//
// Utilisation : const box = createLightbox(); box.open(photos, index, déclencheur)
//   photos = [{ src, alt }]
//
// Clavier : ← → pour changer de photo, Échap pour fermer, focus gardé dans la
// visionneuse puis rendu au bouton qui l'a ouverte. Glisser au doigt / à la
// souris sur la photo. Page bloquée (Lenis arrêté) pendant l'ouverture.
// Textes générés : t() (FR / EN).

import { getLenis } from "../core/core.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { t } from "../utils/i18n.js";

const SWIPE = 40; // px de glissé pour changer de photo

const icon = (d) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CLOSE = "M18 6 6 18M6 6l12 12";
const ICON_PREV = "M14.5 7.5S10 10.8 10 12c0 1.2 4.5 4.5 4.5 4.5";
const ICON_NEXT = "M9.5 7.5S14 10.8 14 12c0 1.2-4.5 4.5-4.5 4.5";

let instance = null;

export function createLightbox() {
  if (instance) return instance;

  const root = document.createElement("div");
  root.className = "lightbox";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", t("lightbox.label"));
  root.setAttribute("data-lenis-prevent", "");
  root.innerHTML = `
    <div class="lightbox_bar">
      <p class="lightbox_count" aria-live="polite"></p>
      <p class="lightbox_caption"></p>
      <button type="button" class="lightbox_button lightbox_close" aria-label="${t("lightbox.close")}">${icon(ICON_CLOSE)}</button>
    </div>
    <div class="lightbox_stage">
      <button type="button" class="lightbox_button lightbox_prev" aria-label="${t("lightbox.prev")}">${icon(ICON_PREV)}</button>
      <figure class="lightbox_figure"><img class="lightbox_image" alt="" draggable="false"></figure>
      <button type="button" class="lightbox_button lightbox_next" aria-label="${t("lightbox.next")}">${icon(ICON_NEXT)}</button>
    </div>
    <div class="lightbox_thumbs" role="group" aria-label="${t("lightbox.thumbs")}"></div>`;
  document.body.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const count = $(".lightbox_count");
  const caption = $(".lightbox_caption");
  const image = $(".lightbox_image");
  const figure = $(".lightbox_figure");
  const thumbs = $(".lightbox_thumbs");
  const prev = $(".lightbox_prev");
  const next = $(".lightbox_next");

  let photos = [];
  let index = 0;
  let opener = null;
  let token = 0;

  function show(i) {
    index = (i + photos.length) % photos.length;
    const photo = photos[index];
    count.textContent = `${index + 1} / ${photos.length}`;
    caption.textContent = photo.alt || "";
    // Fondu : la nouvelle photo s'affiche une fois chargée
    const current = ++token;
    figure.classList.add("is-loading");
    const loader = new Image();
    loader.onload = loader.onerror = () => {
      if (current !== token) return;
      image.src = photo.src;
      image.alt = photo.alt || "";
      figure.classList.remove("is-loading");
    };
    loader.src = photo.src;
    // Miniatures : active marquée et gardée visible
    [...thumbs.children].forEach((thumb, k) => {
      const on = k === index;
      thumb.classList.toggle("is-active", on);
      thumb.setAttribute("aria-current", on ? "true" : "false");
      if (on) thumb.scrollIntoView({ block: "nearest", inline: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
    // Photos voisines préchargées
    [index - 1, index + 1].forEach((k) => (new Image().src = photos[(k + photos.length) % photos.length].src));
  }

  function renderThumbs() {
    thumbs.innerHTML = "";
    photos.forEach((photo, k) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "lightbox_thumb";
      thumb.setAttribute("aria-label", t("lightbox.goto", { n: k + 1 }));
      thumb.innerHTML = `<img src="${photo.thumb || photo.src}" alt="" loading="lazy" draggable="false">`;
      thumb.addEventListener("click", () => show(k));
      thumbs.appendChild(thumb);
    });
  }

  function open(list, start = 0, trigger = null) {
    photos = list.filter((p) => p && p.src);
    if (!photos.length) return;
    opener = trigger || document.activeElement;
    const several = photos.length > 1;
    prev.hidden = next.hidden = thumbs.hidden = !several;
    renderThumbs();
    root.hidden = false;
    document.documentElement.classList.add("is-lightbox-open");
    getLenis()?.stop();
    requestAnimationFrame(() => root.classList.add("is-open"));
    show(start);
    $(".lightbox_close").focus();
  }

  function close() {
    if (root.hidden) return;
    root.classList.remove("is-open");
    document.documentElement.classList.remove("is-lightbox-open");
    getLenis()?.start();
    const hide = () => (root.hidden = true);
    if (prefersReducedMotion()) hide();
    else setTimeout(hide, 250);
    opener?.focus?.();
  }

  $(".lightbox_close").addEventListener("click", close);
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  // Clic sur le fond (hors photo, boutons, miniatures) : fermeture
  root.addEventListener("click", (e) => {
    if (e.target === root || e.target.classList.contains("lightbox_stage")) close();
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowLeft" && photos.length > 1) return show(index - 1);
    if (e.key === "ArrowRight" && photos.length > 1) return show(index + 1);
    // Focus gardé dans la visionneuse
    if (e.key === "Tab") {
      const items = [...root.querySelectorAll("button:not([hidden])")].filter((b) => b.offsetParent);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Glisser sur la photo
  let startX = null;
  figure.addEventListener("pointerdown", (e) => (startX = e.clientX));
  figure.addEventListener("pointerup", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > SWIPE && photos.length > 1) show(index + (dx < 0 ? 1 : -1));
  });
  figure.addEventListener("pointercancel", () => (startX = null));

  instance = { open, close };
  return instance;
}
