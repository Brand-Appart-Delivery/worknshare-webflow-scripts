// src/animations/stars.js — étoiles des avis qui apparaissent une par une
// (section « Les espaces les mieux notés d'Île-de-France »).
//
// STRUCTURE :
//   [data-stars] ou .review-card_stars   rangée d'étoiles (composants Webflow
//                                        « Carte avis » et « Note avis Google »)
//     enfants                            les étoiles
//
// Quand la rangée arrive à l'écran, chaque étoile « pop » (grandit avec un
// léger rebond et une petite rotation), l'une après l'autre. Le départ attend
// l'apparition de la carte qui la contient (délai --bento-delay posé par
// animations/bento-reveal.js), pour que les étoiles arrivent juste après.
// Une seule fois. Rien si l'utilisateur a réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const STEP = 90; // ms entre deux étoiles
const AFTER_CARD = 350; // ms après le début de l'apparition de la carte

export function initStars(root = document) {
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
  const rows = [...root.querySelectorAll("[data-stars], .review-card_stars")];
  if (!rows.length) return;

  rows.forEach((row) => {
    // Délai de la carte (bento-reveal) lu maintenant : il est retiré après l'apparition
    const tile = row.closest(".bento-tile");
    const cardDelay = tile ? parseFloat(getComputedStyle(tile).getPropertyValue("--bento-delay")) || 0 : 0;
    const base = (tile ? AFTER_CARD : 0) + cardDelay;
    [...row.children].forEach((star, i) => star.style.setProperty("--star-delay", `${base + i * STEP}ms`));
    row.classList.add("is-stars-pending");
  });

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const row = entry.target;
        row.classList.add("is-stars-in");
        row.classList.remove("is-stars-pending");
      }),
    { threshold: 0.6 },
  );
  rows.forEach((row) => observer.observe(row));
}
