// src/animations/widen.js — blocs qui s'élargissent au fil du scroll.
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-widen]                 bloc (ex. « Venez visiter », footer) contenant
//     .padding-global            marges du site
//       .container-large         conteneur centré (1280 px)
//         (premier enfant)       carte (fond) : seul son fond s'élargit
//
// Les marges passent de celles du site à 24 px (comme la nav au scroll) et le
// conteneur s'étend sur toute la largeur. La carte reçoit la même quantité en
// marge intérieure : son contenu garde sa place et sa largeur exactes. Sans ça,
// le texte se remettait à la ligne, la hauteur de page changeait pendant le
// scroll et Lenis freinait (limite de scroll recalculée en plein mouvement). L'avancement suit le scroll (pas de
// durée) : il commence quand le haut du PREMIER bloc du groupe atteint le milieu
// de l'écran et finit quand il atteint le haut de l'écran. En remontant, l'effet
// se défait.
//
// OPTIONS :
//   data-widen="nom"   les blocs avec la même valeur s'animent ensemble, pilotés
//                      par le premier dans la page (vide = un seul groupe).
//
// Desktop uniquement (en mobile les marges sont déjà petites). Rien si
// l'utilisateur a réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const TARGET = 24; // px, marges finales (comme la nav au scroll)
const DESKTOP = "(min-width: 992px)";

export function initWiden(root = document) {
  const blocks = [...root.querySelectorAll("[data-widen]")];
  if (!blocks.length || prefersReducedMotion()) return;

  // Groupes : même valeur de data-widen
  const groups = new Map();
  blocks.forEach((block) => {
    const name = block.getAttribute("data-widen") || "";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(block);
  });

  const desktop = window.matchMedia(DESKTOP);

  // Par bloc : éléments à modifier et valeurs de départ (mesurées sans l'effet)
  const items = blocks
    .map((block) => {
      const pad = block.querySelector(".padding-global");
      const box = pad && pad.querySelector(".container-large");
      const card = box && box.firstElementChild;
      return pad ? { block, pad, box, card, pad0: 0, max0: 0, card0: 0, edge0: 0 } : null;
    })
    .filter(Boolean);
  const byBlock = new Map(items.map((item) => [item.block, item]));

  const clear = () =>
    items.forEach(({ pad, box, card }) => {
      pad.style.paddingLeft = pad.style.paddingRight = "";
      if (box) box.style.maxWidth = "";
      if (card) card.style.paddingLeft = card.style.paddingRight = "";
    });

  const measure = () => {
    clear();
    items.forEach((item) => {
      item.pad0 = parseFloat(getComputedStyle(item.pad).paddingLeft) || 0;
      const max = item.box && parseFloat(getComputedStyle(item.box).maxWidth);
      item.max0 = Number.isFinite(max) ? max : 0; // 0 = pas de largeur max
      item.card0 = item.card ? parseFloat(getComputedStyle(item.card).paddingLeft) || 0 : 0;
      // Bord de départ du fond (marge + centrage du conteneur)
      const width = item.pad.clientWidth;
      const inner = item.max0 ? Math.min(item.max0, width - item.pad0 * 2) : width - item.pad0 * 2;
      item.edge0 = (width - inner) / 2;
    });
  };

  // Le bord du fond avance de façon régulière : la marge prend toute la place,
  // le conteneur n'a plus de largeur max, et la carte compense en marge
  // intérieure (contenu immobile). Écritures seulement (pas de lecture ici).
  const apply = (item, p) => {
    const edge = item.edge0 + (TARGET - item.edge0) * p;
    item.pad.style.paddingLeft = item.pad.style.paddingRight = `${edge}px`;
    if (item.box) item.box.style.maxWidth = "none";
    if (item.card) item.card.style.paddingLeft = item.card.style.paddingRight = `${item.card0 + item.edge0 - edge}px`;
  };

  const update = () => {
    if (!desktop.matches) return;
    // 1. Lectures (une seule mise en page par image)…
    const vh = window.innerHeight;
    const y = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - vh;
    const progress = [...groups.values()].map((members) => {
      // Positions en coordonnées de page : début = haut au milieu de l'écran,
      // fin = haut en haut de l'écran (ou bas de page si on ne peut pas y aller)
      const top = members[0].getBoundingClientRect().top + y;
      const start = top - vh / 2;
      const end = Math.max(Math.min(top, maxScroll), start + 1);
      return [members, Math.min(Math.max((y - start) / (end - start), 0), 1)];
    });
    // 2. … puis écritures
    progress.forEach(([members, p]) => members.forEach((block) => byBlock.has(block) && apply(byBlock.get(block), p)));
  };

  // Un calcul par image au plus
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
  };

  const reset = () => {
    measure();
    if (desktop.matches) update();
  };

  reset();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", reset, { passive: true });
  desktop.addEventListener("change", reset);
  // Polices / images chargées : la hauteur de page change
  window.addEventListener("load", reset);
}
