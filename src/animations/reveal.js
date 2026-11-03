// src/animations/reveal.js — éléments qui apparaissent l'un après l'autre au scroll.
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-reveal-stagger]          conteneur (ex. grille de cartes) : ses enfants
//                                  directs apparaissent en cascade (fondu + montée)
//                                  quand le conteneur entre à l'écran.
//
// OPTIONS :
//   data-reveal-stagger="140"      délai entre deux éléments (ms, défaut 140)
//   data-reveal-distance="32"      montée de départ (px, défaut 32)
//
// Une seule fois par chargement. Rien n'est masqué si l'utilisateur a réduit
// les animations ou si le navigateur ne gère pas IntersectionObserver.
// Styles : _reveal.scss (états .is-reveal-pending / .is-revealed).

import { prefersReducedMotion } from "../utils/motion.js";

const DEFAULT_STAGGER = 140; // ms
const DEFAULT_DISTANCE = 32; // px

export function initReveal(root = document) {
  const groups = [...root.querySelectorAll("[data-reveal-stagger]")];
  if (!groups.length || prefersReducedMotion() || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        reveal(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
  );

  groups.forEach((group) => {
    const stagger = parseFloat(group.getAttribute("data-reveal-stagger")) || DEFAULT_STAGGER;
    const distance = parseFloat(group.getAttribute("data-reveal-distance")) || DEFAULT_DISTANCE;
    group.style.setProperty("--reveal-distance", `${distance}px`);
    [...group.children].forEach((item, i) => {
      item.style.setProperty("--reveal-delay", `${i * stagger}ms`);
    });
    group.classList.add("is-reveal-pending");
    observer.observe(group);
  });
}

function reveal(group) {
  group.classList.add("is-revealed");
  group.classList.remove("is-reveal-pending");
  // Fin de la cascade : on retire transition et délai, pour ne pas retarder
  // les autres effets des éléments (survol…)
  const items = group.children.length;
  const stagger = parseFloat(group.getAttribute("data-reveal-stagger")) || DEFAULT_STAGGER;
  setTimeout(() => group.classList.add("is-reveal-done"), items * stagger + 800);
}
