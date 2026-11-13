// src/animations/parallax.js — léger effet de parallaxe sur une image au scroll.
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-parallax]            sur l'image elle-même (ex. image du haut des
//                              articles, .post-hero_image), ou sur un bloc qui
//                              la contient et qui coupe ce qui dépasse
//
// OPTIONS (sur [data-parallax]) :
//   data-parallax="0.08"       amplitude : part de la hauteur de l'image dont
//                              elle glisse de chaque côté (0,08 par défaut)
//
// Posé sur une image : le JS l'enveloppe dans un cadre (.parallax_frame) qui
// reprend ses coins arrondis et coupe ce qui dépasse. L'image est agrandie
// juste assez pour ne jamais laisser de vide, puis glisse moins vite que la
// page (GSAP ScrollTrigger, lu sur window). Rien si l'utilisateur a réduit les
// animations. Styles : _parallax.scss.

import { prefersReducedMotion } from "../utils/motion.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";

const DEFAULT_AMOUNT = 0.08;

export function initParallax(root = document) {
  const targets = [...root.querySelectorAll("[data-parallax]")];
  const { gsap, ScrollTrigger } = window;
  if (!targets.length || !gsap || !ScrollTrigger || prefersReducedMotion()) return;
  gsap.registerPlugin(ScrollTrigger);

  targets.forEach((target) => {
    const amount = Math.min(Math.max(parseFloat(target.getAttribute("data-parallax")) || DEFAULT_AMOUNT, 0), 0.3);
    let frame = target;
    let img = target.querySelector("img");

    if (target.tagName === "IMG") {
      // Cadre autour de l'image : mêmes coins arrondis, coupe ce qui dépasse
      img = target;
      frame = document.createElement("div");
      frame.className = "parallax_frame";
      frame.style.borderRadius = getComputedStyle(img).borderRadius;
      img.before(frame);
      frame.appendChild(img);
    } else {
      frame.classList.add("parallax_frame");
    }
    if (!img) return;

    // Agrandie de 2 × amplitude : le glissement (± amplitude) ne découvre jamais le fond
    gsap.set(img, { scale: 1 + amount * 2 });
    gsap.fromTo(
      img,
      { yPercent: -amount * 100 },
      {
        yPercent: amount * 100,
        ease: "none",
        scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true },
      },
    );
  });

  requestScrollRefresh();
}
