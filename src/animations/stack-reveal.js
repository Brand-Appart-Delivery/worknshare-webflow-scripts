// src/animations/stack-reveal.js — cartes empilées qui se dévoilent au scroll
// (« Trois formules » de la page Bureaux flexibles).
//
// STRUCTURE (attributs à poser dans Webflow) :
//   [data-stack-reveal]            conteneur (cartes en colonne)
//     [data-stack-reveal-item]     carte (la première reste au-dessus)
//
// Au départ, les cartes suivantes sont rangées sous la première, en paquet
// (on voit juste leur bord dépasser). Au fil du scroll, la première reste à sa
// place et chaque carte suivante sort de dessous pour descendre à sa position
// prévue. L'avancement suit le scroll (scrub) : en remontant, elles se rangent.
//
// Desktop uniquement (en tablette / mobile les cartes sont plus hautes que
// l'écran). Rien si l'utilisateur a réduit les animations ou sans GSAP.

import { prefersReducedMotion } from "../utils/motion.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";

const DESKTOP = "(min-width: 992px)";
const PEEK = 16; // px de bord visible par carte rangée dessous
const SHRINK = 0.04; // réduction par rang dans le paquet (profondeur)

export function initStackReveal(root = document) {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger || prefersReducedMotion()) return;
  gsap.registerPlugin(ScrollTrigger);

  root.querySelectorAll("[data-stack-reveal]").forEach((stack) => {
    const cards = [...stack.querySelectorAll("[data-stack-reveal-item]")];
    if (cards.length < 2) return;

    const mm = gsap.matchMedia();
    mm.add(DESKTOP, () => {
      // La première carte passe devant les suivantes
      cards.forEach((card, i) => {
        card.style.position = "relative";
        card.style.zIndex = String(cards.length - i);
      });

      const first = cards[0];
      // Positions prévues (mise en page Webflow, sans l'animation) : offsetTop
      // ne tient pas compte des transformations
      const firstTop = () => first.getBoundingClientRect().top + window.scrollY;
      const naturalTop = (card) => firstTop() + card.offsetTop - first.offsetTop;

      cards.slice(1).forEach((card, k) => {
        const rank = k + 1;
        gsap.fromTo(
          card,
          {
            // Rangée sous la première carte, bord qui dépasse en bas
            y: () => first.offsetTop + first.offsetHeight - card.offsetTop - card.offsetHeight + rank * PEEK,
            scale: 1 - rank * SHRINK,
            transformOrigin: "50% 100%",
          },
          {
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: first,
              // Démarre quand la première carte arrive au tiers haut de
              // l'écran ; la carte atteint sa place quand le bas de sa
              // position prévue arrive en bas de l'écran
              start: () => firstTop() - window.innerHeight * 0.3,
              end: () => naturalTop(card) + card.offsetHeight - window.innerHeight,
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      requestScrollRefresh();

      // Retour en tablette / mobile : on rend la mise en page de Webflow
      return () =>
        cards.forEach((card) => {
          card.style.position = "";
          card.style.zIndex = "";
        });
    });
  });
}
