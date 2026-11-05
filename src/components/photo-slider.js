// src/components/photo-slider.js — carrousel photo qui glisse (bloc « Le rooftop
// de Clichy » de la page Événementiel) : l'ancienne photo part d'un côté, la
// nouvelle arrive de l'autre ; la carte de texte reste fixe.
//
// STRUCTURE (attributs à poser dans Webflow) :
//   [data-photo-slider]        le bloc
//     [data-photo-slide]       chaque photo (superposées en CSS par Webflow)
//     [data-slider-prev]       flèche précédente
//     [data-slider-next]       flèche suivante
//     .slider_dots             points : recréés selon le nombre de photos ; la
//                              classe « active » est reprise du point actif posé
//                              dans Webflow (ex. events-is-active)
//
// OPTIONS (sur [data-photo-slider]) :
//   data-photo-slider-autoplay="6000"   défilement automatique (ms), stoppé au
//                                       survol, au focus et si mouvement réduit
//
// Flèches, points, glisser (doigt / souris), flèches du clavier dans le bloc.

import { prefersReducedMotion } from "../utils/motion.js";
import { t } from "../utils/i18n.js";

const SWIPE = 40; // px de glissé pour changer de photo

export function initPhotoSliders(root = document) {
  root.querySelectorAll("[data-photo-slider]").forEach(initPhotoSlider);
}

function initPhotoSlider(block) {
  const slides = [...block.querySelectorAll("[data-photo-slide]")];
  if (!slides.length) return;
  const prev = block.querySelector("[data-slider-prev]");
  const next = block.querySelector("[data-slider-next]");
  const dotsWrap = block.querySelector(".slider_dots, [data-slider-dots]");

  // Classe « active » des points, reprise du point actif de Webflow
  const model = dotsWrap?.querySelector("[aria-current='true'], .slider_dot");
  const activeClass =
    [...(model?.classList || [])].find((c) => c !== "slider_dot" && /active/.test(c)) || "is-active";

  let index = 0;
  let dots = [];

  // Place une photo à x % (0 = visible, 100 = à droite, -100 = à gauche),
  // avec ou sans transition
  function place(slide, x, animate) {
    slide.classList.toggle("is-instant", !animate);
    slide.style.setProperty("--slide-x", `${x}%`);
  }

  // dir : 1 = suivante (arrive de la droite), -1 = précédente (de la gauche)
  function show(i, dir = Math.sign(i - index) || 1, first = false) {
    const old = index;
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, k) => {
      const on = k === index;
      slide.classList.toggle("is-active", on);
      slide.setAttribute("aria-hidden", on ? "false" : "true");
      // Photos voisines chargées à l'avance (Webflow les met en lazy)
      const n = slides.length;
      if (k === (index + 1) % n || k === (index - 1 + n) % n) slide.loading = "eager";
    });
    if (first) {
      slides.forEach((slide, k) => place(slide, k === index ? 0 : 100, false));
    } else if (old !== index) {
      const incoming = slides[index];
      place(incoming, dir * 100, false); // posée hors cadre, côté d'arrivée
      void incoming.offsetWidth; // force le navigateur à prendre ce point de départ
      place(incoming, 0, true);
      place(slides[old], -dir * 100, true); // l'ancienne sort de l'autre côté
    }
    dots.forEach((dot, k) => {
      dot.classList.toggle(activeClass, k === index);
      dot.setAttribute("aria-current", k === index ? "true" : "false");
    });
  }

  // Points : un par photo, cliquables
  if (dotsWrap) {
    dotsWrap.innerHTML = "";
    dots = slides.map((_, k) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slider_dot";
      dot.setAttribute("aria-label", t("map.photoGo", { n: k + 1 }));
      dot.addEventListener("click", () => {
        show(k);
        restart();
      });
      dotsWrap.appendChild(dot);
      return dot;
    });
  }

  // Flèches (liens Webflow href="#") : sans lien, pour éviter le saut d'ancre
  [
    [prev, -1],
    [next, 1],
  ].forEach(([arrow, step]) => {
    if (!arrow) return;
    if (arrow.tagName === "A") {
      arrow.removeAttribute("href");
      arrow.setAttribute("role", "button");
      if (!arrow.hasAttribute("tabindex")) arrow.setAttribute("tabindex", "0");
    }
    arrow.addEventListener("click", (e) => {
      e.preventDefault();
      show(index + step, step);
      restart();
    });
    arrow.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      arrow.click();
    });
  });
  const single = slides.length < 2;
  [prev, next, dotsWrap].forEach((el) => el && (el.hidden = single));

  // Glisser
  let startX = null;
  block.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    startX = e.clientX;
  });
  block.addEventListener("pointerup", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > SWIPE && !single) {
      show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      restart();
    }
  });
  block.addEventListener("pointercancel", () => (startX = null));
  slides.forEach((slide) => (slide.draggable = false));

  // Clavier
  block.addEventListener("keydown", (e) => {
    if (single || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    show(index + step, step);
    restart();
  });

  // Défilement automatique (option)
  const delay = parseInt(block.getAttribute("data-photo-slider-autoplay"), 10) || 0;
  let timer = null;
  let paused = false;
  function restart() {
    clearInterval(timer);
    if (!delay || single || paused || prefersReducedMotion()) return;
    timer = setInterval(() => show(index + 1, 1), delay);
  }
  const pause = (on) => () => {
    paused = on;
    restart();
  };
  block.addEventListener("mouseenter", pause(true));
  block.addEventListener("mouseleave", pause(false));
  block.addEventListener("focusin", pause(true));
  block.addEventListener("focusout", pause(false));

  block.classList.add("is-photo-ready");
  show(0, 1, true);
  restart();
}
