// src/components/place-carousel.js — carrousel photo de la fiche espace sur la
// carte ([data-place-card]).
//
// STRUCTURE (dans la fiche, posée dans Webflow) :
//   [data-place-photo]   l'image affichée
//   [data-place-prev]    bouton photo précédente
//   [data-place-next]    bouton photo suivante
//   [data-place-dots]    points (recréés selon le nombre de photos)
//
// Les photos viennent de spaces-data.js (photo principale + galerie CMS).
// Flèches, points cliquables, glisser au doigt / à la souris, flèches du
// clavier quand le focus est dans la fiche. Navigation masquée s'il n'y a
// qu'une photo.

import { t } from "../utils/i18n.js";
import { prefersReducedMotion } from "../utils/motion.js";

const SWIPE = 40; // px de glissé pour changer de photo

export function createPlaceCarousel(card) {
  const img = card?.querySelector("[data-place-photo]");
  if (!img) return { set() {} };
  const prev = card.querySelector("[data-place-prev]");
  const next = card.querySelector("[data-place-next]");
  const dots = card.querySelector("[data-place-dots]");
  const media = img.parentElement;

  let photos = [];
  let index = 0;
  let name = "";
  let token = 0; // ignore une photo chargée trop tard (changement rapide)

  const label = () => t("map.photo", { name, n: index + 1, total: photos.length });

  function show(i, { instant = false } = {}) {
    if (!photos.length) return;
    index = (i + photos.length) % photos.length;
    const src = photos[index];
    const current = ++token;
    const apply = () => {
      if (current !== token) return;
      img.src = src;
      img.removeAttribute("srcset");
      img.alt = label();
      img.classList.remove("is-changing");
    };
    if (instant || prefersReducedMotion()) apply();
    else {
      // Fondu : on attend que la nouvelle photo soit chargée
      img.classList.add("is-changing");
      const loader = new Image();
      loader.onload = loader.onerror = apply;
      loader.src = src;
    }
    dots?.querySelectorAll(".slider_dot").forEach((dot, k) => {
      dot.classList.toggle("is-active", k === index);
      dot.setAttribute("aria-current", k === index ? "true" : "false");
    });
    // Photo suivante préchargée
    if (photos.length > 1) new Image().src = photos[(index + 1) % photos.length];
  }

  function renderDots() {
    if (!dots) return;
    dots.innerHTML = "";
    photos.forEach((_, k) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slider_dot";
      dot.setAttribute("aria-label", t("map.photoGo", { n: k + 1 }));
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        show(k);
      });
      dots.appendChild(dot);
    });
  }

  // Boutons (liens Webflow href="#") : pas de navigation ni de clic sur la carte
  const go = (step) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    show(index + step);
  };
  prev?.addEventListener("click", go(-1));
  next?.addEventListener("click", go(1));

  // Glisser (doigt ou souris)
  let startX = null;
  media.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    startX = e.clientX;
  });
  media.addEventListener("pointerup", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > SWIPE && photos.length > 1) show(index + (dx < 0 ? 1 : -1));
  });
  media.addEventListener("pointercancel", () => (startX = null));
  img.draggable = false;

  // Clavier : flèches gauche / droite quand le focus est dans la fiche
  card.addEventListener("keydown", (e) => {
    if (photos.length < 2 || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    if (e.target.closest("input, textarea")) return;
    e.preventDefault();
    show(index + (e.key === "ArrowRight" ? 1 : -1));
  });

  return {
    // Nouvel espace : ses photos, en commençant par la première
    set(list, spaceName) {
      photos = list.filter(Boolean);
      name = spaceName || "";
      const several = photos.length > 1;
      [prev, next, dots].forEach((el) => el && (el.hidden = !several));
      renderDots();
      show(0, { instant: true });
    },
  };
}
