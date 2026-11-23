// src/animations/zoom-scale.js — zoom des photos au survol des cartes, identique
// partout : la photo grandit du même nombre de pixels quelle que soit la taille
// de la carte (une grande carte bento ne zoome pas plus qu'une petite).
//
// Le zoom lui-même est dans le CSS (_card-zoom.scss, _article-card.scss,
// _event-card.scss, _press.scss) : transform: scale(var(--zoom)). Ici on pose
// --zoom sur chaque photo selon sa largeur : zoom = (largeur + 2 × GROW) / largeur.
// Recalculé quand la photo change de taille (fenêtre, carrousel, menu ouvert).
// Sans JS : zoom de repli de 1,05 (dans le CSS).
//
// STRUCTURE : rien à poser dans Webflow, les photos sont reconnues par leur
// classe (liste PHOTOS ci-dessous).

import { prefersReducedMotion } from "../utils/motion.js";

const GROW = 10; // px gagnés de chaque côté au survol
const MAX_ZOOM = 1.12; // plafond pour les toutes petites vignettes

// Photos qui zooment au survol de leur carte
const PHOTOS = [
  ".bento-card_image",
  ".events-format-card_image",
  ".event-card_photo",
  ".article-card_image",
  ".press-card_photo",
  ".blog-featured_image",
  ".space-item_photo",
  ".space-card_image",
  ".mega-menu_banner-img",
  ".space-gallery_thumb .space-cover",
  ".space-gallery_more > *",
].join(", ");

export function initZoomScale(root = document) {
  if (prefersReducedMotion() || !("ResizeObserver" in window)) return;
  const photos = root.querySelectorAll(PHOTOS);
  if (!photos.length) return;

  const observer = new ResizeObserver((entries) => {
    entries.forEach(({ target, contentRect }) => {
      const width = contentRect.width;
      // Photo masquée (menu fermé, onglet caché) : on garde la valeur précédente
      if (width < 1) return;
      const zoom = Math.min(MAX_ZOOM, (width + 2 * GROW) / width);
      target.style.setProperty("--zoom", zoom.toFixed(4));
    });
  });
  photos.forEach((photo) => observer.observe(photo));
}
