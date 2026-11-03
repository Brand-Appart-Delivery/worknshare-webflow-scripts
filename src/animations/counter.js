// src/animations/counter.js — chiffres qui défilent à l'arrivée à l'écran, façon
// compteur mécanique.
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-count]   élément texte contenant un nombre, ex. « 14 », « 3 000 », « + 50 ».
//                  Le texte autour du nombre (« + », « m² »…) est conservé,
//                  ainsi que le séparateur de milliers d'origine.
//
// OPTIONS :
//   data-count-duration="1800"   durée de l'animation (ms)
//
// Chaque chiffre est une colonne qui tourne verticalement (0 → 9). À la fin,
// le texte final simple est remis en place.
//
// Le texte final reste dans le HTML (SEO, sans JS) et pour les lecteurs
// d'écran. La place du nombre final est réservée : le texte autour ne bouge
// pas. Pas d'animation si l'utilisateur a réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const DEFAULT_DURATION = 1800;
const NUMBER_REGEX = /\d[\d\s  .,]*\d|\d/;
const GAP = 0.35; // espace au-dessus et en dessous de chaque chiffre de la bande (en hauteur de ligne)
const WINDOW = 0.06; // marge de la fenêtre au-delà de la ligne : le chiffre n'est pas coupé, le défilement reste discret

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// « 3 000 » -> { value: 3000, separator: " " } ; garde le texte avant / après
function parse(text) {
  const match = text.match(NUMBER_REGEX);
  if (!match) return null;
  const raw = match[0];
  const separator = (raw.match(/[\s  .,]/) || [""])[0];
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

const finalText = (data) => data.before + format(data.value, data.separator) + data.after;

// Remplace le texte par les colonnes de chiffres (le texte final reste lisible
// par les lecteurs d'écran)
function buildRoll(el, data) {
  const text = finalText(data);
  el.textContent = "";

  // Taille d'une ligne et largeur de chaque caractère final
  const probe = document.createElement("span");
  probe.className = "count-roll";
  [...text].forEach((char) => {
    const cell = document.createElement("span");
    cell.textContent = char;
    probe.appendChild(cell);
  });
  el.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  const widths = [...probe.children].map((cell) => cell.getBoundingClientRect().width);
  probe.remove();

  const sr = document.createElement("span");
  sr.className = "count-sr";
  sr.textContent = text;
  const roll = document.createElement("span");
  roll.className = "count-roll";
  roll.setAttribute("aria-hidden", "true");
  // Bande : un chiffre toutes les « ligne + 2 × GAP » (les chiffres de la police
  // dépassent de leur ligne : sans cet espace on verrait le suivant). Fenêtre
  // de chaque colonne : à peine plus haute que la ligne (marges négatives, la
  // mise en page ne change pas), le défilement ne se voit que là.
  const gap = Math.round(height * GAP);
  const win = Math.round(height * WINDOW);
  roll.style.setProperty("--count-line", `${height}px`);
  roll.style.setProperty("--count-gap", `${gap}px`);
  roll.style.setProperty("--count-win", `${win}px`);

  // Colonnes : de droite à gauche, puissance de 10 croissante
  const digitsTotal = (text.match(/\d/g) || []).length;
  let digitIndex = 0;
  const columns = [];
  const numberStart = data.before.length;
  const numberEnd = text.length - data.after.length;
  [...text].forEach((char, i) => {
    const isDigit = /\d/.test(char) && i >= numberStart && i < numberEnd;
    if (!isDigit) {
      const cell = document.createElement("span");
      cell.className = "count-char";
      cell.textContent = char;
      roll.appendChild(cell);
      return;
    }
    const power = digitsTotal - 1 - digitIndex++;
    const col = document.createElement("span");
    col.className = "count-col";
    col.style.width = `${widths[i]}px`;
    const strip = document.createElement("span");
    strip.className = "count-strip";
    // 0 → 9 puis 0 : le passage de 9 à 0 se fait sans saut
    for (let d = 0; d <= 10; d++) {
      const cell = document.createElement("span");
      cell.textContent = d % 10;
      strip.appendChild(cell);
    }
    col.appendChild(strip);
    roll.appendChild(col);
    columns.push({ col, strip, power });
  });

  el.append(sr, roll);
  // Décalage pour centrer un chiffre de la bande dans la fenêtre
  return { roll, columns, pitch: height + gap * 2, offset: win - gap };
}

// Positions façon compteur mécanique : les unités tournent en continu ; une
// colonne ne tourne que pendant que celle de droite passe de 9 à 0.
function positions(columns, value) {
  const byPower = [...columns].sort((a, b) => a.power - b.power);
  const pos = new Map();
  let lower = null;
  byPower.forEach((c) => {
    const unit = Math.pow(10, c.power);
    let p;
    if (c.power === 0) p = value;
    else {
      const lowerDigit = lower % 10; // position de la colonne de droite (0 → 10)
      p = Math.floor(value / unit) + Math.max(lowerDigit - 9, 0);
    }
    pos.set(c, p);
    lower = p;
  });
  return pos;
}

function paint(state, value) {
  const { columns, pitch, offset } = state;
  const pos = positions(columns, value);
  columns.forEach((c) => {
    const unit = Math.pow(10, c.power);
    c.strip.style.transform = `translateY(${offset - (pos.get(c) % 10) * pitch}px)`;
    // Chiffres de tête pas encore atteints : masqués (pas de « 0 015 »)
    c.col.style.opacity = c.power === 0 ? 1 : Math.min(Math.max(value / unit - 0.6, 0) * 2.5, 1);
  });
}

// Taille du texte final réservée (le texte autour ne bouge pas)
function reserve(el) {
  const data = el._count;
  if (!data || data.done) return;
  el.style.minWidth = el.style.maxWidth = el.style.minHeight = "";
  const roll = el.querySelector(".count-roll");
  const saved = [...el.childNodes];
  el.textContent = finalText(data);
  const rect = el.getBoundingClientRect();
  el.textContent = "";
  el.append(...saved);
  el.style.minWidth = el.style.maxWidth = `${rect.width}px`;
  el.style.minHeight = `${rect.height}px`;
  return roll;
}

function finish(el, data) {
  data.done = true;
  el.textContent = finalText(data);
  el.style.minWidth = el.style.maxWidth = el.style.minHeight = "";
  el.classList.remove("is-counting");
}

function animate(el, data, duration) {
  const state = el._roll;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    if (progress >= 1) return finish(el, data);
    paint(state, data.value * easeOutCubic(progress));
    requestAnimationFrame(tick);
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
        el._count.started = true;
        animate(el, el._count, parseFloat(el.getAttribute("data-count-duration")) || DEFAULT_DURATION);
      });
    },
    { threshold: 0.4 },
  );

  const setup = (el) => {
    el._roll = buildRoll(el, el._count);
    paint(el._roll, 0);
    reserve(el);
  };

  items.forEach((el) => {
    const data = parse(el.textContent.trim());
    if (!data) return;
    el._count = data;
    // Un texte en ligne n'accepte pas de taille minimale
    if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
    el.classList.add("is-counting");
    setup(el);
    observer.observe(el);
  });

  // Polices chargées ou fenêtre redimensionnée : tailles recalculées (seulement
  // pour les compteurs pas encore lancés)
  const rebuild = () =>
    items.forEach((el) => {
      if (!el._count || el._count.done || el._count.started) return;
      setup(el);
    });
  document.fonts?.ready.then(rebuild);
  window.addEventListener("resize", rebuild, { passive: true });
}
