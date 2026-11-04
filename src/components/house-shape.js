// src/components/house-shape.js — angles arrondis des formes « maison ».
//
// Les formes maison sont posées dans Webflow en clip-path: polygon(...) à
// 5 points (faîte, avant-toits, coins du bas) : cartes espace, photo du hero
// d'un espace, blocs « Venez visiter »… Un polygon n'a que des angles vifs ;
// la maquette Figma les arrondit. Ce module lit la forme de Webflow (qui reste
// la référence, breakpoints compris) et la redessine en path() aux angles
// arrondis, à la taille réelle de l'élément.
//
// Aucun attribut à poser : toute forme maison du site est prise en charge.
//
// RAYON des angles : --house-radius (propriété CSS réglable dans Webflow sur
// la classe), sinon l'arrondi des coins de l'élément dans Webflow (border
// radius), sinon 16 px comme Figma.
//
// Classe posée : .is-house, avec --house-path (forme) et --house-path-zoom
// (même forme réduite de 1/1,05, pour le zoom au survol des cartes, cf.
// _card-zoom.scss). Styles : _house-shape.scss.

const DEFAULT_RADIUS = 16;
const ZOOM = 1.05; // zoom des photos au survol (cf. _card-zoom.scss)

export function initHouseShapes(root = document) {
  // Repérage : éléments dont la forme Webflow est un polygon à 5 points
  const shapes = [];
  root.querySelectorAll("body *").forEach((el) => {
    const clip = getComputedStyle(el).clipPath;
    if (clip && clip.startsWith("polygon(") && clip.split(",").length === 5) shapes.push(el);
  });
  if (!shapes.length) return;

  const update = (el) => {
    // Forme de Webflow pour la largeur actuelle (sans notre surcharge)
    el.classList.remove("is-house");
    const clip = getComputedStyle(el).clipPath;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const points = parsePolygon(clip, w, h);
    if (!points || !w || !h) return;

    // Rayon : --house-radius, sinon l'arrondi des coins posé dans Webflow
    // (ex. bloc « Venez visiter » à 48 px), sinon 16 px comme Figma
    const style = getComputedStyle(el);
    const radius =
      parseFloat(style.getPropertyValue("--house-radius")) ||
      parseFloat(style.borderBottomLeftRadius) ||
      DEFAULT_RADIUS;
    el.style.setProperty("--house-path", `path("${roundedPath(points, radius)}")`);

    // Version réduite autour du centre : compense le zoom au survol
    const cx = w / 2;
    const cy = h / 2;
    const small = points.map(([x, y]) => [cx + (x - cx) / ZOOM, cy + (y - cy) / ZOOM]);
    el.style.setProperty("--house-path-zoom", `path("${roundedPath(small, radius / ZOOM)}")`);
    el.classList.add("is-house");
  };

  shapes.forEach(update);

  // Taille ou breakpoint qui change : on redessine
  if (typeof ResizeObserver !== "undefined") {
    const pending = new Set();
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      entries.forEach((e) => pending.add(e.target));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        pending.forEach(update);
        pending.clear();
      });
    });
    // Taille totale (border-box) : l'élargissement au scroll (widen.js) ajoute
    // du padding sans changer la zone de contenu
    shapes.forEach((el) => ro.observe(el, { box: "border-box" }));
  }
}

// "polygon(50% 0%, 100% 24%, …)" -> [[x, y], …] en px
function parsePolygon(clip, w, h) {
  const inner = clip.slice(clip.indexOf("(") + 1, clip.lastIndexOf(")"));
  const toPx = (v, size) => {
    v = v.trim();
    if (v.endsWith("%")) return (parseFloat(v) / 100) * size;
    return parseFloat(v) || 0; // px ou 0
  };
  const points = inner.split(",").map((pair) => {
    const [x, y] = pair.trim().split(/\s+/);
    return [toPx(x, w), toPx(y, h)];
  });
  return points.length === 5 && points.every((p) => p.every(Number.isFinite)) ? points : null;
}

// Polygone -> chemin SVG aux angles arrondis (courbe à chaque sommet)
function roundedPath(points, radius) {
  const n = points.length;
  const r = (v) => Math.round(v * 100) / 100;
  let d = "";
  points.forEach((v, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const d1 = Math.hypot(prev[0] - v[0], prev[1] - v[1]);
    const d2 = Math.hypot(next[0] - v[0], next[1] - v[1]);
    const k = Math.min(radius, d1 / 2, d2 / 2);
    const a = [v[0] + ((prev[0] - v[0]) * k) / d1, v[1] + ((prev[1] - v[1]) * k) / d1];
    const b = [v[0] + ((next[0] - v[0]) * k) / d2, v[1] + ((next[1] - v[1]) * k) / d2];
    d += `${i === 0 ? "M" : "L"}${r(a[0])} ${r(a[1])}Q${r(v[0])} ${r(v[1])} ${r(b[0])} ${r(b[1])}`;
  });
  return `${d}Z`;
}
