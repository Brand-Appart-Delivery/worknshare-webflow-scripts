// src/components/photo-slider.js — carrousel photo qui glisse (bloc « Le rooftop »
// de la page Événementiel et des pages Lieux) : l'ancienne photo part d'un côté,
// la nouvelle arrive de l'autre ; la carte de texte reste fixe.
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
// PLUSIEURS ESPACES (pages Lieux, collection Espaces privatisables) :
//     [data-photo-space]       élément de liste CMS d'un espace (classe
//                              cms-contents), qui contient ses photos (liste
//                              imbriquée Photos [data-cms-unwrap]) et sa carte
//       [data-photo-card]      la carte de l'espace
//   On défile les photos de l'espace 1, puis celles de l'espace 2, etc. ; la
//   carte affichée suit l'espace de la photo visible. Un point par photo.
//
// OPTIONS (sur [data-photo-slider]) :
//   data-photo-slider-autoplay="6000"   temps par photo (ms, 5000 par défaut ;
//                                       "0" = pas de défilement automatique)
//
// Comme la fiche de la carte (place-carousel.js) : le point actif se remplit
// en rose puis photo suivante ; flèches et points n'existent que s'il y a
// plusieurs photos, et glissent à leur place au survol (_photo-slider.scss).
// Flèches, points, glisser (doigt / souris), flèches du clavier dans le bloc.

import { prefersReducedMotion } from "../utils/motion.js";
import { t } from "../utils/i18n.js";

const SWIPE = 40; // px de glissé pour changer de photo
const DURATION = 800; // ms, durée de la glissade (cf. _photo-slider.scss)
const AUTOPLAY_MS = 5000; // temps passé sur chaque photo (comme la carte)
const CARD_OUT_MS = 280; // changement d'espace : sortie de l'ancienne carte
const CARD_IN_MS = 520; // puis entrée de la nouvelle

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

  // Espace de chaque photo (0 si pas d'espaces) et cartes à suivre
  const spaces = [...block.querySelectorAll("[data-photo-space]")];
  const spaceOf = slides.map((slide) => Math.max(0, spaces.indexOf(slide.closest("[data-photo-space]"))));
  const cards = [...block.querySelectorAll("[data-photo-card]")];

  // Affiche la carte de l'espace de la photo visible. Changement d'espace :
  // l'ancienne carte s'efface en descendant un peu, puis la nouvelle monte
  // en apparaissant (environ la durée de la glissade des photos)
  let cardSpace = -1;
  let cardAnims = [];
  function showCard(space, animate = true) {
    if (cards.length < 2 || space === cardSpace) return;
    const old = cards.find((card) => !card.hidden); // celle qu'on voit vraiment
    const incoming = cards[space];
    cardSpace = space;
    cardAnims.forEach((a) => a.cancel());
    cardAnims = [];
    const swap = () => {
      cards.forEach((card, k) => {
        card.hidden = k !== space;
        card.classList.toggle("is-active", k === space);
      });
    };
    if (!animate || !old || prefersReducedMotion()) {
      swap();
      return;
    }
    const out = old.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(16px)" },
      ],
      { duration: CARD_OUT_MS, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "forwards" },
    );
    cardAnims.push(out);
    out.finished
      .then(() => {
        if (cardSpace !== space) return; // un autre changement a pris la main
        swap();
        out.cancel();
        const into = incoming.animate(
          [
            { opacity: 0, transform: "translateY(24px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: CARD_IN_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
        cardAnims.push(into);
      })
      .catch(() => {}); // annulée par un changement plus récent
  }

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
      // Les autres photos se rangent hors cadre, sans animation
      slides.forEach((slide, k) => k !== index && k !== old && place(slide, 100, false));
      const incoming = slides[index];
      place(incoming, dir * 100, false); // posée hors cadre, côté d'arrivée
      void incoming.offsetWidth; // force le navigateur à prendre ce point de départ
      place(incoming, 0, true);
      place(slides[old], -dir * 100, true); // l'ancienne sort de l'autre côté
    }
    showCard(spaceOf[index], !first);
    dots.forEach((dot, k) => {
      dot.classList.toggle(activeClass, k === index);
      dot.classList.toggle("is-active", k === index); // remplissage rose (CSS)
      dot.setAttribute("aria-current", k === index ? "true" : "false");
    });
    startProgress();
  }

  // Un changement à la fois : pendant la glissade, le dernier clic attend
  // son tour (sinon une photo en mouvement repartirait d'un bond)
  let busy = false;
  let pending = null;
  function go(change) {
    if (busy) {
      pending = change;
      return;
    }
    change();
    if (prefersReducedMotion()) return;
    busy = true;
    setTimeout(() => {
      busy = false;
      const next = pending;
      pending = null;
      if (next) go(next);
    }, DURATION + 20);
  }

  // Points : un par photo, cliquables
  if (dotsWrap) {
    dotsWrap.innerHTML = "";
    dots = slides.map((_, k) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slider_dot";
      dot.setAttribute("aria-label", t("map.photoGo", { n: k + 1 }));
      // Remplissage du point actif : temps écoulé sur la photo
      const fill = document.createElement("span");
      fill.className = "place-carousel_progress";
      fill.setAttribute("aria-hidden", "true");
      dot.appendChild(fill);
      dot.addEventListener("click", () => k !== index && go(() => show(k)));
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
      go(() => show(index + step, step));
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
      const step = dx < 0 ? 1 : -1;
      go(() => show(index + step, step));
    }
  });
  block.addEventListener("pointercancel", () => (startX = null));
  slides.forEach((slide) => (slide.draggable = false));

  // Clavier
  block.addEventListener("keydown", (e) => {
    if (single || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    go(() => show(index + step, step));
  });

  // ---------- Défilement automatique (comme la fiche de la carte) ----------
  // Le point actif se remplit en rose pendant `delay`, puis photo suivante.
  // En pause : bloc hors de l'écran, onglet caché, focus clavier dans le bloc,
  // doigt ou souris appuyé. Pas de défilement si mouvement réduit.
  const attr = block.getAttribute("data-photo-slider-autoplay");
  const delay = attr == null || attr === "" ? AUTOPLAY_MS : parseInt(attr, 10) || 0;
  let progress = null;
  let visible = false;
  let focused = false;
  let pressing = false;

  function startProgress() {
    progress?.cancel();
    progress = null;
    const fill = dots[index]?.querySelector(".place-carousel_progress");
    if (!fill || !delay || single || prefersReducedMotion()) return;
    const anim = fill.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: delay,
      easing: "linear",
      fill: "forwards",
    });
    progress = anim;
    updatePause();
    anim.finished
      .then(() => {
        if (progress === anim) go(() => show(index + 1, 1));
      })
      .catch(() => {}); // annulée (autre photo)
  }

  function updatePause() {
    if (!progress) return;
    const pause = !visible || document.hidden || focused || pressing;
    if (pause && progress.playState === "running") progress.pause();
    else if (!pause && progress.playState === "paused") progress.play();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePause();
  }).observe(block);
  document.addEventListener("visibilitychange", updatePause);
  block.addEventListener("focusin", (e) => {
    focused = e.target.matches(":focus-visible");
    updatePause();
  });
  block.addEventListener("focusout", () => {
    focused = false;
    updatePause();
  });
  block.addEventListener("pointerdown", () => {
    pressing = true;
    updatePause();
  });
  window.addEventListener("pointerup", () => {
    if (!pressing) return;
    pressing = false;
    updatePause();
  });

  block.classList.add("is-photo-ready");
  show(0, 1, true);
}
