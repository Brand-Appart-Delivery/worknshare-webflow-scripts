// src/components/compare.js — tableau « Comparer les offres » (Bureaux flexibles).
//
// STRUCTURE (attribut posé dans Webflow) :
//   [data-compare]               boîte blanche du tableau
//     [role="table"]             tableau (880 px minimum)
//
// Le JS enveloppe la boîte dans une zone de défilement (.compare_scroller) et
// ajoute dessous un curseur (.compare_bar > .compare_thumb). Sous 992 px,
// c'est la zone qui défile, jusqu'aux bords de l'écran : la boîte blanche
// entière glisse, le titre de la section reste en place. Le curseur suit le
// défilement ; on peut glisser sa poignée ou cliquer sur le trait. Masqué
// quand tout tient. Styles : _compare.scss.

import { t } from "../utils/i18n.js";

const MIN_THUMB = 32; // px, largeur minimale de la poignée

export function initCompare(root = document) {
  root.querySelectorAll("[data-compare]").forEach(initOne);
}

function initOne(box) {
  if (box.parentElement.classList.contains("compare_scroller")) return;

  const scroller = document.createElement("div");
  scroller.className = "compare_scroller";
  // Zone défilable au clavier (flèches gauche / droite une fois focus)
  scroller.setAttribute("tabindex", "0");
  scroller.setAttribute("role", "region");
  scroller.setAttribute("aria-label", t("compare.scroll"));
  box.before(scroller);
  scroller.appendChild(box);

  // Curseur sous la boîte (décoratif : la zone reste défilable autrement)
  const bar = document.createElement("div");
  bar.className = "compare_bar";
  bar.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("div");
  thumb.className = "compare_thumb";
  bar.appendChild(thumb);
  scroller.after(bar);

  let thumbWidth = 0;
  const max = () => scroller.scrollWidth - scroller.clientWidth;

  const update = () => {
    const range = max();
    bar.hidden = range <= 1;
    if (bar.hidden) return;
    const track = bar.clientWidth;
    thumbWidth = Math.max(MIN_THUMB, (track * scroller.clientWidth) / scroller.scrollWidth);
    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translateX(${((track - thumbWidth) * scroller.scrollLeft) / range}px)`;
  };

  // Un calcul par image au plus
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
  };
  scroller.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(schedule).observe(scroller);

  // Glisser la poignée
  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startScroll = scroller.scrollLeft;
    const ratio = max() / Math.max(bar.clientWidth - thumbWidth, 1);
    thumb.setPointerCapture(e.pointerId);
    bar.classList.add("is-dragging");
    const move = (ev) => (scroller.scrollLeft = startScroll + (ev.clientX - startX) * ratio);
    const up = () => {
      bar.classList.remove("is-dragging");
      thumb.removeEventListener("pointermove", move);
      thumb.removeEventListener("pointerup", up);
      thumb.removeEventListener("pointercancel", up);
    };
    thumb.addEventListener("pointermove", move);
    thumb.addEventListener("pointerup", up);
    thumb.addEventListener("pointercancel", up);
  });

  // Clic sur le trait : la poignée vient se centrer sous le clic
  bar.addEventListener("pointerdown", (e) => {
    if (e.target !== bar) return;
    const x = e.clientX - bar.getBoundingClientRect().left - thumbWidth / 2;
    scroller.scrollTo({ left: (x / Math.max(bar.clientWidth - thumbWidth, 1)) * max(), behavior: "smooth" });
  });

  update();
}
