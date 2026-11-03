// src/animations/bento-reveal.js — tuiles d'un bento qui apparaissent avec un
// léger zoom, de gauche à droite, à l'arrivée sur la section (bento « Salles
// et événements » de l'accueil).
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-bento-reveal]          conteneur du bento
//     tuiles                     .event-card par défaut (voir option)
//
// OPTIONS :
//   data-bento-reveal=".event-card"   sélecteur des tuiles (vide = .event-card ;
//                                     ":scope > *" = enfants directs ; "self" =
//                                     le bloc lui-même est la tuile)
//   data-bento-reveal-spread="450"    écart entre la tuile la plus à gauche et la
//                                     plus à droite (ms)
//
// Chaque tuile apparaît en fondu en grandissant légèrement (92 % → 100 %). Elle
// démarre selon sa position horizontale : de gauche à droite. Une seule fois,
// quand le bento est visible à 30 %.
// Rien si l'utilisateur a réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const DEFAULT_SELECTOR = ".event-card";
const DEFAULT_SPREAD = 450; // ms
const DURATION = 800; // ms (cf. _bento-reveal.scss)

export function initBentoReveal(root = document) {
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
  root.querySelectorAll("[data-bento-reveal]").forEach(initBento);
}

function initBento(bento) {
  const selector = bento.getAttribute("data-bento-reveal") || DEFAULT_SELECTOR;
  const tiles = selector === "self" ? [bento] : [...bento.querySelectorAll(selector)];
  if (!tiles.length) return;
  const spread = parseFloat(bento.getAttribute("data-bento-reveal-spread")) || DEFAULT_SPREAD;

  // Délai de chaque tuile selon sa position horizontale (gauche → droite)
  const box = bento.getBoundingClientRect();
  const lefts = tiles.map((tile) => tile.getBoundingClientRect().left - box.left);
  const far = Math.max(...lefts, 1);
  tiles.forEach((tile, i) => {
    tile.classList.add("bento-tile");
    tile.style.setProperty("--bento-delay", `${Math.round((lefts[i] / far) * spread)}ms`);
  });
  bento.classList.add("is-bento-pending");

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      bento.classList.add("is-bento-revealing");
      bento.classList.remove("is-bento-pending");
      // Fin : on rend la main aux styles de la carte (survol…)
      setTimeout(() => {
        bento.classList.remove("is-bento-revealing");
        tiles.forEach((tile) => {
          tile.classList.remove("bento-tile");
          tile.style.removeProperty("--bento-delay");
        });
      }, DURATION + spread + 50);
    },
    { threshold: 0.3 },
  );
  observer.observe(bento);
}
