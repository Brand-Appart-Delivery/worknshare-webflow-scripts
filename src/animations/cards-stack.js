// src/animations/cards-stack.js — cartes empilées qui se distribuent à leur
// place à l'arrivée sur la section (offres « Bureaux et coworking »…).
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-cards-stack]   grille de cartes (ses enfants directs sont les cartes)
//
// OPTIONS :
//   data-cards-stack-delay="90"   décalage entre deux cartes (ms)
//
// Au départ : cartes en paquet au centre de la grille, légèrement tournées et
// décalées. Quand la grille arrive à l'écran (35 % visible) : chacune part à sa
// place en se redressant, l'une après l'autre. Une seule fois.
// Seulement si les cartes sont côte à côte (sur mobile, une colonne : rien).
// Rien si l'utilisateur a réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const ROTATIONS = [-7, 5, -3, 6, -5, 3]; // degrés, carte par carte
const OFFSETS = [
  [-10, 6],
  [8, -4],
  [-4, -8],
  [10, 4],
  [-8, -2],
  [4, 8],
]; // px, petit désordre du paquet
const DEFAULT_DELAY = 90; // ms entre deux cartes
const DURATION = 900; // ms (cf. _cards-stack.scss)

export function initCardsStack(root = document) {
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
  root.querySelectorAll("[data-cards-stack]").forEach(initGrid);
}

function initGrid(grid) {
  const cards = [...grid.children];
  if (cards.length < 2) return;
  // Carrousel mobile (_mobile-slider.scss) : cartes à faire glisser, pas de paquet
  if (grid.hasAttribute("data-mobile-slider") && window.matchMedia("(max-width: 767px)").matches) return;

  // Cartes côte à côte (même ligne) ? Sinon pas d'effet
  const sameRow = () => cards.every((card) => Math.abs(card.offsetTop - cards[0].offsetTop) < 4);

  // Position du paquet : centre de la grille. Mesuré sans le paquet (classe
  // retirée le temps de la mesure, sans affichage entre-temps).
  const stack = () => {
    const stacked = grid.classList.contains("is-stacked");
    grid.classList.remove("is-stacked");
    const g = grid.getBoundingClientRect();
    const rects = cards.map((card) => card.getBoundingClientRect());
    const cx = g.left + g.width / 2;
    const cy = Math.min(...rects.map((r) => r.top + r.height / 2));
    cards.forEach((card, i) => {
      const r = rects[i];
      const [ox, oy] = OFFSETS[i % OFFSETS.length];
      card.style.setProperty("--stack-x", `${cx - (r.left + r.width / 2) + ox}px`);
      card.style.setProperty("--stack-y", `${cy - (r.top + r.height / 2) + oy}px`);
      card.style.setProperty("--stack-r", `${ROTATIONS[i % ROTATIONS.length]}deg`);
      // Première carte au-dessus du paquet, partie en premier
      card.style.zIndex = String(cards.length - i);
    });
    if (stacked) grid.classList.add("is-stacked");
  };

  if (!sameRow()) return;
  stack();
  grid.classList.add("is-stacked");

  const delay = parseFloat(grid.getAttribute("data-cards-stack-delay")) || DEFAULT_DELAY;

  const deal = () => {
    cards.forEach((card, i) => card.style.setProperty("--stack-delay", `${i * delay}ms`));
    grid.classList.add("is-dealing");
    grid.classList.remove("is-stacked");
    // Fin : on retire tout (les survols des cartes retrouvent leurs réglages)
    setTimeout(() => {
      grid.classList.remove("is-dealing");
      cards.forEach((card) => {
        ["--stack-x", "--stack-y", "--stack-r", "--stack-delay"].forEach((v) => card.style.removeProperty(v));
        card.style.zIndex = "";
      });
    }, DURATION + delay * cards.length + 50);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      deal();
    },
    { threshold: 0.35 },
  );
  observer.observe(grid);

  // Redimensionnement avant l'arrivée : paquet recalculé (ou annulé en mobile)
  function onResize() {
    if (!grid.classList.contains("is-stacked")) return;
    if (sameRow()) stack();
    else {
      grid.classList.remove("is-stacked");
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    }
  }
  window.addEventListener("resize", onResize, { passive: true });
}
