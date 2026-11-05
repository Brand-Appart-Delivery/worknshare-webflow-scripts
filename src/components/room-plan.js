// src/components/room-plan.js — plan d'implantation d'une salle, dessiné en SVG
// isométrique (utils/iso.js), d'après le prototype « plan d'implantation ».
//
// La salle est un rectangle calculé depuis sa surface (proportion 8 × 5) : deux
// murs du fond (fenêtres, écran, porte), puis les meubles de chaque disposition,
// générés selon sa jauge :
//   reunion   une ou plusieurs tables, chaises des deux côtés
//   en-u      tables en U ouvert vers l'écran, chaises à l'extérieur
//   theatre   rangs de chaises face à l'écran
//   cocktail  un comptoir le long des fenêtres et des mange-debout
//
// Changement de disposition : les meubles de l'ancienne se couchent dans le sol,
// puis ceux de la nouvelle se relèvent, en cascade depuis le centre de la salle
// (700 ms). Sans animation si l'utilisateur a réduit les animations.
//
// Utilisation : const plan = createRoomPlan(stage, { surface: 40, configs });
//   configs = [{ key: "reunion", n: 16 }, …] ; plan.show("theatre")

import { Cam, bounds, clamp, disc, extremes, facing, fit, mk, poly, prism, proj, put, rings, seg, solid, tdone, tset, tval, tween } from "../utils/iso.js";
import { prefersReducedMotion } from "../utils/motion.js";

const IN = 450; // la nouvelle disposition attend que l'ancienne soit presque couchée
const STAGGER = 40; // cascade : ms de décalage par mètre depuis le centre
const WALL = 24, WT = 1.2; // hauteur et épaisseur des murs (décimètres)
const SEAT = 4.2, BACKTOP = 9, TABLE = 7.2, BAR = 10.5, HIGH = 10.4, CH = 4.2;

// ---------- Dispositions, en décimètres : [genre, x, y, détail] ----------
// L'écran est sur le mur x = 0, les fenêtres sur le mur y = 0.

// Réunion : îlots de tables, chaises des deux côtés
function reunion(n, RW, RD) {
  const L = [];
  const pitch = 6.4;
  const maxSide = Math.max(2, Math.floor((RW - 26) / pitch));
  const islands = clamp(Math.ceil(n / (2 * maxSide)), 1, Math.max(1, Math.floor(RD / 26)));
  let left = n;
  for (let k = 0; k < islands; k++) {
    const count = Math.ceil(left / (islands - k));
    left -= count;
    const side = Math.ceil(count / 2);
    const len = side * pitch + 3;
    const x0 = (RW - len) / 2 + 3;
    const cy = (RD / islands) * (k + 0.5);
    L.push(["table", x0, cy - 6, [len, 12]]);
    for (let i = 0; i < side; i++) {
      const x = x0 + 1.5 + i * pitch;
      L.push(["chair", x, cy - 11.5, "-y"]);
      if (i < count - side) L.push(["chair", x, cy + 7.5, "+y"]);
    }
  }
  return L;
}

// En U : ouvert vers l'écran, chaises à l'extérieur
function enU(n, RW, RD) {
  const L = [];
  const xa = 14, xb = RW - 18; // début des bras, table du fond
  const yt = 6, yb = RD - 12; // bras du haut et du bas (6 dm de profondeur)
  L.push(["table", xa, yt, [xb - xa, 6]], ["table", xa, yb, [xb - xa, 6]], ["table", xb, yt, [6, yb + 6 - yt]]);
  const armLen = xb - xa - 4, endLen = yb - yt - 8;
  let end = clamp(Math.round((n * endLen) / (2 * armLen + endLen)), 1, Math.max(1, Math.floor(endLen / 6)));
  if (n < 6) end = 0;
  const top = Math.ceil((n - end) / 2), bottom = n - end - top;
  const along = (count, from, len) => Array.from({ length: count }, (_, i) => from + ((i + 0.5) * len) / count - CH / 2);
  along(top, xa + 2, armLen).forEach((x) => L.push(["chair", x, yt - 4.6, "-y"]));
  along(bottom, xa + 2, armLen).forEach((x) => L.push(["chair", x, yb + 6.6, "+y"]));
  along(end, yt + 10, endLen).forEach((y) => L.push(["chair", xb + 7.4, y, "+x"]));
  return L;
}

// Théâtre : rangs de chaises face à l'écran
function theatre(n, RW, RD) {
  const L = [];
  const cols = Math.max(1, Math.floor((RD - 10) / 6.6));
  const rows = Math.ceil(n / cols);
  const pitch = clamp((RW - 22) / Math.max(rows, 1), 6, 11);
  let left = n;
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, left);
    left -= inRow;
    const y0 = (RD - inRow * 6.6) / 2 + 1.2;
    for (let c = 0; c < inRow; c++) L.push(["chair", 16 + r * pitch, y0 + c * 6.6, "+x"]);
  }
  return L;
}

// Petit hasard reproductible (même plan à chaque visite)
const seeded = (seed) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

// Cocktail : comptoir le long des fenêtres + mange-debout (≈ 4,5 personnes chacun)
function cocktail(n, RW, RD) {
  const L = [];
  if (RW > 40) L.push(["bar", RW * 0.42, 3, [Math.min(26, RW * 0.33), 6]]);
  const count = clamp(Math.round(n / 4.5), 2, 60);
  const x0 = 14, x1 = RW - 8, y0 = 14, y1 = RD - 6;
  const W = x1 - x0, H = y1 - y0;
  const cols = Math.max(1, Math.round(Math.sqrt((count * W) / H)));
  const rows = Math.ceil(count / cols);
  const rnd = seeded(n * 7 + Math.round(RW));
  let placed = 0;
  for (let r = 0; r < rows && placed < count; r++)
    for (let c = 0; c < cols && placed < count; c++, placed++) {
      const jx = (rnd() - 0.5) * (W / cols) * 0.4, jy = (rnd() - 0.5) * (H / rows) * 0.4;
      const x = x0 + ((c + 0.5) * W) / cols + jx + (r % 2 ? W / cols / 4 : 0);
      L.push(["high", clamp(x, x0, x1), y0 + ((r + 0.5) * H) / rows + jy]);
    }
  return L;
}

const BUILDERS = { reunion, "en-u": enU, theatre, cocktail };

// Ordre de peinture : un meuble entièrement derrière un autre (en x ou en y)
// passe avant lui ; le reste suit x + y du centre
function depthOrder(items) {
  const behind = (a, b) => a.b[2] <= b.b[0] || a.b[3] <= b.b[1];
  const key = (it) => (it.b[0] + it.b[2] + it.b[1] + it.b[3]) / 2;
  const n = items.length, ins = new Array(n).fill(0), out = items.map(() => []);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j && behind(items[i], items[j]) && !behind(items[j], items[i])) {
        out[i].push(j);
        ins[j]++;
      }
  const ready = items.map((_, i) => i).filter((i) => ins[i] === 0), res = [];
  while (ready.length) {
    ready.sort((a, b) => key(items[a]) - key(items[b]));
    const i = ready.shift();
    res.push(items[i]);
    for (const j of out[i]) if (--ins[j] === 0) ready.push(j);
  }
  items.splice(0, n, ...res);
}

export function createRoomPlan(stage, { surface = 40, configs = [] } = {}) {
  // Salle : surface (m²) -> rectangle 8 × 5 en décimètres, bornée pour rester lisible
  const area = clamp(surface || 40, 12, 400) * 100;
  const RW = Math.sqrt(area * 1.6), RD = area / RW;

  const svg = mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
  const corners = [[-WT, -WT, WALL], [RW, -WT, WALL], [-WT, RD, WALL], [RW, RD, 0], [-WT, RD, 0], [RW, -WT, 0]];
  // Échelle : la salle occupe au mieux 360 × 270 du cadre
  const C = Cam(45, 0.5, 1);
  const b0 = bounds(C, corners);
  C.S = Math.min(360 / (b0.x1 - b0.x0), 270 / (b0.y1 - b0.y0));
  fit(C, corners, 200, 165);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // ---------- La salle, fixe ----------
  const box = (x0, y0, x1, y1, z0, z1, r = 0.6, bv = 0.3) => {
    const s = solid(g);
    const [ring, inner] = rings(x0, y0, x1, y1, r, bv);
    put(s, prism(P, front, ring, inner, z0, z1));
  };
  box(0, 0, RW, RD, -1.2, 0, 2.5, 1.2);
  box(-WT, -WT, RW, 0, 0, WALL, 0.4, 0.2);
  box(-WT, 0, 0, RD, 0, WALL, 0.4, 0.2);
  const onBack = (pts) => poly(pts.map(([x, z]) => P(x, 0, z)));
  const onLeft = (pts) => poly(pts.map(([y, z]) => P(0, y, z)));
  const windows = Math.max(1, Math.floor((RW - 12) / 23));
  const step = (RW - 12) / windows;
  for (let i = 0; i < windows; i++) {
    const x0 = 10 + i * step + (step - 16) / 2;
    mk("path", { d: onBack([[x0, 9], [x0 + 16, 9], [x0 + 16, 22], [x0, 22]]), class: "nf lo" }, g);
    mk("path", { d: seg(P(x0 + 8, 0, 9), P(x0 + 8, 0, 22)), class: "nf lo" }, g);
  }
  const sw = Math.min(10, RD * 0.2);
  const screen = mk("path", { d: onLeft([[RD / 2 - sw, 10], [RD / 2 + sw, 10], [RD / 2 + sw, 21], [RD / 2 - sw, 21]]), class: "nf hi" }, g);
  mk("path", { d: onLeft([[RD - 13, 0], [RD - 4, 0], [RD - 4, 21], [RD - 13, 21]]), class: "nf lo" }, g);

  // ---------- Les meubles de toutes les dispositions, peints une fois ----------
  const keys = configs.map((c) => c.key);
  const items = [];
  configs.forEach(({ key, n }) => {
    (BUILDERS[key]?.(n, RW, RD) || []).forEach(([kind, x, y, d]) => items.push({ key, kind, x, y, d }));
  });
  const flat = (it) => it.kind === "table" || it.kind === "bar";
  const centre = (it) => (flat(it) ? [it.x + it.d[0] / 2, it.y + it.d[1] / 2] : it.kind === "high" ? [it.x, it.y] : [it.x + CH / 2, it.y + CH / 2]);
  const foot = (it) =>
    flat(it) ? [it.x, it.y, it.x + it.d[0], it.y + it.d[1]] : it.kind === "high" ? [it.x - 3.5, it.y - 3.5, it.x + 3.5, it.y + 3.5] : [it.x, it.y, it.x + CH, it.y + CH];
  for (const it of items) it.b = foot(it);
  depthOrder(items);
  for (const it of items) {
    it.g = mk("g", {}, g);
    it.h = tween(0);
    it.parts = it.kind === "chair" || it.kind === "high" ? [solid(it.g), solid(it.g)] : [solid(it.g)];
    if (it.kind === "table" || it.kind === "high") {
      it.drop = mk("path", { class: "nf dash" }, it.g);
      it.g.insertBefore(it.drop, it.g.firstChild); // pointillés derrière leur plateau
    }
  }

  // Dessine un meuble à la hauteur h (0 : couché dans le sol, 1 : debout)
  function draw(it, h) {
    if (h < 0.03) {
      for (const s of it.parts) {
        s.sil.setAttribute("d", "");
        s.cr.setAttribute("d", "");
      }
      it.drop?.setAttribute("d", "");
      return;
    }
    const { x, y } = it;
    if (it.kind === "chair") {
      const [seat, back] = it.parts;
      let [r, i] = rings(x, y, x + CH, y + CH, 0.8, 0.4);
      put(seat, prism(P, front, r, i, SEAT * h - 0.4, SEAT * h));
      const bx = {
        "+x": [x + CH - 0.5, y, x + CH, y + CH],
        "-x": [x, y, x + 0.5, y + CH],
        "+y": [x, y + CH - 0.5, x + CH, y + CH],
        "-y": [x, y, x + CH, y + 0.5],
      }[it.d];
      [r, i] = rings(bx[0], bx[1], bx[2], bx[3], 0.2, 0.1);
      put(back, prism(P, front, r, i, SEAT * h, BACKTOP * h));
    } else if (flat(it)) {
      const top = it.kind === "table" ? TABLE : BAR;
      const [r, i] = rings(x, y, x + it.d[0], y + it.d[1], 1, it.kind === "table" ? 1.2 : 0.8);
      put(it.parts[0], prism(P, front, r, i, it.kind === "table" ? (top - 0.5) * h : 0, top * h));
      if (it.drop) {
        const e = extremes(P, r).map((q) => [P(q.u, q.v, (top - 0.5) * h), P(q.u, q.v, 0)]);
        it.drop.setAttribute("d", e.map(([a, c]) => seg(a, c)).join(""));
      }
    } else {
      put(it.parts[0], prism(P, front, disc(x, y, 2.5), disc(x, y, 1.6), 0, 0.3 * h));
      put(it.parts[1], prism(P, front, disc(x, y, 3.5), disc(x, y, 2.4), (HIGH - 0.4) * h, HIGH * h));
      it.drop.setAttribute("d", seg(P(x, y, 0.3 * h), P(x, y, (HIGH - 0.4) * h)));
    }
  }

  // ---------- Boucle d'animation (seulement pendant un changement) ----------
  let raf = 0;
  function frame() {
    const now = performance.now();
    let moving = false;
    for (const it of items) {
      draw(it, tval(it.h, now));
      if (!tdone(it.h, now)) moving = true;
    }
    raf = moving ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  let current = null;
  function show(key) {
    if (!keys.includes(key) || key === current) return;
    const first = current === null;
    current = key;
    const now = performance.now();
    const instant = first || prefersReducedMotion();
    const [wx, wy] = [RW / 2, RD / 2];
    // L'ancienne disposition se couche, puis la nouvelle se relève : jamais les deux debout
    for (const it of items) {
      const [cx, cy] = centre(it);
      const far = (Math.hypot(cx - wx, cy - wy) / 10) * STAGGER;
      if (it.key === key) tset(it.h, 1, now, IN + far, instant);
      else tset(it.h, 0, now, far / 2, instant);
    }
    // L'écran s'allume sauf en cocktail ; le comptoir ressort en cocktail
    screen.setAttribute("class", key === "cocktail" ? "nf lo" : "nf hi");
    for (const it of items) if (it.kind === "bar") it.parts[0].sil.classList.toggle("hi", key === "cocktail");
    if (instant) frame();
    else wake();
  }

  show(keys[0]);
  return { show, keys };
}
