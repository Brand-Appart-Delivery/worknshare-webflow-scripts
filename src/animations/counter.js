// src/animations/counter.js — chiffres qui s'incrémentent à l'arrivée à l'écran.
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-count]   élément texte contenant un nombre, ex. « 14 », « 3 000 », « + 50 ».
//                  Le texte autour du nombre (« + », « m² »…) est conservé,
//                  ainsi que le séparateur de milliers d'origine.
//
// OPTIONS :
//   data-count-duration="1800"   durée de l'animation (ms)
//
// Le texte final reste dans le HTML (SEO, sans JS). Pas d'animation si
// l'utilisateur a réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const DEFAULT_DURATION = 1800;
const NUMBER_REGEX = /\d[\d\s  .,]*\d|\d/;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// « 3 000 » -> { value: 3000, separator: " " } ; garde le texte avant / après
function parse(text) {
  const match = text.match(NUMBER_REGEX);
  if (!match) return null;
  const raw = match[0];
  const separator = (raw.match(/[\s  .,]/) || [""])[0];
  const value = parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    separator,
    before: text.slice(0, match.index),
    after: text.slice(match.index + raw.length),
  };
}

function format(n, separator) {
  const digits = String(Math.round(n));
  if (!separator) return digits;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function animate(el, data, duration) {
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = data.before + format(data.value * easeOutCubic(progress), data.separator) + data.after;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initCounters(root = document) {
  const items = [...root.querySelectorAll("[data-count]")];
  if (!items.length || prefersReducedMotion() || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const el = entry.target;
        animate(el, el._count, parseFloat(el.getAttribute("data-count-duration")) || DEFAULT_DURATION);
      });
    },
    { threshold: 0.4 },
  );

  items.forEach((el) => {
    const data = parse(el.textContent.trim());
    if (!data) return;
    el._count = data;
    // Accessibilité : les lecteurs d'écran lisent directement la valeur finale
    el.setAttribute("aria-label", el.textContent.trim());
    el.textContent = data.before + format(0, data.separator) + data.after;
    observer.observe(el);
  });
}
