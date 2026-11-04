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
// prévue, en grandissant jusqu'à sa taille et en se redressant (légèrement
// tournée dans le paquet). La carte de devant porte une ombre
// sur celle qu'elle recouvre, qui s'estompe quand celle-ci arrive à sa place.
// L'avancement suit le scroll (scrub) : en remontant, elles se rangent.
//
// Desktop uniquement (en tablette / mobile les cartes sont plus hautes que
// l'écran). Rien si l'utilisateur a réduit les animations ou sans GSAP.

import { prefersReducedMotion } from "../utils/motion.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";

const DESKTOP = "(min-width: 992px)";
const PEEK = 16; // px de bord visible par carte rangée dessous
const SHRINK = 0.08; // réduction par rang dans le paquet (profondeur)
const TILT = 2; // degrés de rotation dans le paquet, alternés d'une carte à l'autre
// Ombre de la carte de devant sur celle du dessous, estompée à l'arrivée
const SHADOW_FROM = "0 32px 64px rgba(18, 20, 4, 0.22)";
const SHADOW_TO = "0 0px 0px rgba(18, 20, 4, 0)";

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
        const front = cards[k]; // carte juste devant, qui la recouvre au départ
        const tl = gsap.timeline({
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
        });
        tl.fromTo(
          card,
          {
            // Rangée sous la première carte, bord qui dépasse en bas
            y: () => first.offsetTop + first.offsetHeight - card.offsetTop - card.offsetHeight + rank * PEEK,
            scale: 1 - rank * SHRINK,
            rotation: rank % 2 ? -TILT : TILT,
            transformOrigin: "50% 100%",
          },
          { y: 0, scale: 1, rotation: 0, ease: "none" },
          0,
        );
        // L'ombre est portée par la carte de devant sur celle qu'elle recouvre,
        // et s'estompe quand celle-ci arrive à sa place
        tl.fromTo(front, { boxShadow: SHADOW_FROM }, { boxShadow: SHADOW_TO, ease: "none" }, 0);
      });

      requestScrollRefresh();

      // Retour en tablette / mobile : on rend la mise en page de Webflow
      return () =>
        cards.forEach((card) => {
          card.style.position = "";
          card.style.zIndex = "";
          card.style.boxShadow = "";
        });
    });
  });
}
