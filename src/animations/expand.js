// src/animations/expand.js — bloc qui passe de « carte dans les marges du site »
// (coins arrondis) à « pleine largeur » au fil du scroll (carte de l'accueil).
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-expand]   bloc pleine largeur (ex. section map-module), non inclus
//                   dans un .padding-global
//
// OPTIONS :
//   data-expand-radius="24"   coins arrondis au départ (px)
//   data-expand-bg="#fff"     fond derrière le bloc, dans les marges (blanc par défaut)
//
// Effet de zoom (transform: scale) : le bloc entier (contenu compris) part
// réduit à la largeur du contenu du site, coins arrondis, puis grandit jusqu'à
// sa taille réelle. Rien n'est redimensionné (pas de recalcul de mise en page,
// la carte ne vibre pas). Les coins sont compensés pour garder leur taille à
// l'écran pendant le zoom. Le bloc est entouré par le JS d'un .expand-wrap qui
// porte le fond visible autour.
//
// Au départ (haut du bloc qui entre en bas de l'écran) : marges du site
// (.padding-global + largeur max .container-large) et coins arrondis, comme la
// carte de la page Événementiel. Arrivée (haut du bloc à 15 % du haut de
// l'écran) : pleine largeur, coins droits. L'avancement suit le scroll et se
// défait en remontant. Seule la largeur change (pas la hauteur) : la page ne
// bouge pas. Rien si l'utilisateur a réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const START = 1; // haut du bloc à 100 % de la hauteur d'écran (il entre)
const END = 0.15; // haut du bloc à 15 % : pleine largeur
const DEFAULT_RADIUS = 24;
const MAX_WIDTH = 1280; // largeur de .container-large

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function initExpand(root = document) {
  const blocks = [...root.querySelectorAll("[data-expand]")];
  if (!blocks.length || prefersReducedMotion()) return;

  // Marge du site lue sur un .padding-global de la page (80 px desktop…)
  const sitePadding = () => {
    const ref = document.querySelector(".padding-global");
    return ref ? parseFloat(getComputedStyle(ref).paddingLeft) || 0 : 0;
  };

  let padding = sitePadding();
  let frame = 0;

  const update = () => {
    frame = 0;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    // Bord de départ : comme un contenu dans .padding-global > .container-large
    const edge0 = Math.max(padding, (vw - MAX_WIDTH) / 2);
    // Lectures d'abord…
    const states = blocks.map((el) => {
      const top = el.getBoundingClientRect().top;
      const raw = (vh * START - top) / (vh * (START - END));
      return [el, easeInOut(Math.min(Math.max(raw, 0), 1))];
    });
    // … puis écritures
    states.forEach(([el, p]) => {
      const radius = parseFloat(el.getAttribute("data-expand-radius")) || DEFAULT_RADIUS;
      // Échelle de départ : largeur du contenu du site / largeur du bloc
      const width = el.offsetWidth || vw;
      const start = Math.min((width - edge0 * 2) / width, 1);
      const scale = start + (1 - start) * p;
      if (p >= 1) {
        el.style.transform = "";
        el.style.borderRadius = "";
      } else {
        el.style.transform = `scale(${scale})`;
        // Coins : divisés par l'échelle pour garder « radius » px à l'écran
        el.style.borderRadius = `${(radius * (1 - p)) / scale}px`;
      }
      el.classList.toggle("is-expanded", p >= 1);
    });
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      padding = sitePadding();
      schedule();
    },
    { passive: true },
  );
  // Fond derrière le bloc (dans les marges)
  blocks.forEach((el) => {
    el.classList.add("has-expand");
    if (el.parentElement?.classList.contains("expand-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "expand-wrap";
    const bg = el.getAttribute("data-expand-bg");
    if (bg) wrap.style.backgroundColor = bg;
    el.before(wrap);
    wrap.appendChild(el);
  });
  update();
}
