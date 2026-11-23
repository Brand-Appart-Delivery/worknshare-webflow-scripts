// src/utils/scroll-zone.js — zone qui défile seule sous la souris (liste de la
// carte…), sans bloquer le scroll de la page qui passe dessus.
//
// Avec Lenis, data-lenis-prevent fait défiler la zone au lieu de la page. Posé
// en permanence, il arrête net la page quand la zone glisse sous la souris
// pendant un scroll. Ici, le choix est fait au DÉBUT de chaque geste de
// défilement (molette ou trackpad) au-dessus de la zone, puis gardé jusqu'à sa
// fin :
// - la page est à l'arrêt, ou la souris a bougé sur la zone : la zone défile ;
// - la page est encore en mouvement (la zone arrive sous la souris) : la page
//   continue ;
// - la zone est déjà au bout dans le sens du geste (tout en bas en descendant,
//   tout en haut en remontant) : la page défile. Le relais se fait au geste
//   suivant, pas au milieu d'un même geste (l'élan du trackpad ne fait pas
//   sauter la page).

import { getLenis } from "../core/core.js";

const ATTR = "data-lenis-prevent";
const GESTURE_GAP = 200; // ms sans molette = nouveau geste
const STOPPED_VELOCITY = 1.5; // px par image : en dessous, la page est « à l'arrêt »

const zones = [];
let lastWheel = 0;
let started = false;

// La zone peut-elle encore défiler dans ce sens (dy > 0 : vers le bas) ?
function canScroll(zone, dy) {
  if (dy > 0) return zone.scrollTop + zone.clientHeight < zone.scrollHeight - 1;
  if (dy < 0) return zone.scrollTop > 0;
  return false;
}

export function initScrollZone(zone) {
  if (!zone) return;
  const lenis = getLenis();
  // Sans Lenis : défilement natif du navigateur, qui passe déjà à la page en
  // fin de zone (l'attribut l'en empêcherait : overscroll-behavior: contain)
  if (!lenis) return;
  zone.setAttribute(ATTR, ""); // par défaut : la zone défile seule

  const state = { zone, pointerMoved: true };
  zones.push(state);

  // Vrai mouvement de souris sur la zone (les événements simulés après un
  // scroll n'ont pas de déplacement)
  zone.addEventListener(
    "pointermove",
    (e) => {
      if (e.movementX || e.movementY) state.pointerMoved = true;
    },
    { passive: true },
  );

  if (started) return;
  started = true;

  // Phase de capture sur window : passe avant Lenis, qui lit l'attribut ensuite
  window.addEventListener(
    "wheel",
    (e) => {
      const now = performance.now();
      const newGesture = now - lastWheel > GESTURE_GAP;
      lastWheel = now;
      if (!newGesture) return; // même geste : on garde le choix fait au début
      const pageStopped = Math.abs(lenis.velocity || 0) < STOPPED_VELOCITY;
      // Seule la zone sous la souris au début du geste peut le prendre ; les
      // autres le laissent à la page même si elles arrivent sous la souris
      zones.forEach((s) => {
        const owns =
          s.zone.contains(e.target) && (pageStopped || s.pointerMoved) && canScroll(s.zone, e.deltaY);
        if (owns) s.zone.setAttribute(ATTR, "");
        else s.zone.removeAttribute(ATTR);
      });
    },
    { passive: true, capture: true },
  );

  // La page défile : la souris n'a plus « bougé sur la zone »
  lenis.on("scroll", () => zones.forEach((s) => (s.pointerMoved = false)));
}
