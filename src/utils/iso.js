// src/utils/iso.js — petit moteur de dessin isométrique en SVG (traits fins),
// repris du prototype « plan d'implantation » (moteur « hairline »).
//
// Monde : x / y au sol, z vers le haut. Caméra Cam(azimut, k = sin(élévation),
// échelle). Les volumes sont des « prismes » : une empreinte arrondie au sol
// (ring) extrudée de z0 à z1, tracée en silhouette + arête avant (crease).
// Les volumes sont peints de l'arrière vers l'avant : le plus proche recouvre.
//
// Animation : tween(v) = valeur qui glisse en 700 ms sur la courbe
// (.32, .72, 0, 1) ; tset() la relance vers une cible avec un délai.

const NS = "http://www.w3.org/2000/svg";

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rad = (d) => (d * Math.PI) / 180;
const r2 = (n) => Math.round(n * 100) / 100;

export const poly = (pts) => "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
export const seg = (a, b) => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
const open = (pts) => (pts.length < 2 ? "" : "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L"));

// ---------- Caméra ----------
export const Cam = (azDeg, k, S) => ({ az: rad(azDeg), k, S, ox: 0, oy: 0 });

export function proj(C) {
  const c = Math.cos(C.az),
    s = Math.sin(C.az),
    zf = Math.sqrt(1 - C.k * C.k);
  return (x, y, z) => {
    const X = x * c - y * s,
      Y = x * s + y * c;
    return [C.ox + C.S * X, C.oy + C.S * (Y * C.k - z * zf)];
  };
}

// Boîte projetée de points [x, y, z] (pour choisir l'échelle et centrer)
export function bounds(C, pts) {
  const P = proj({ ...C, ox: 0, oy: 0 });
  let a = 1e9,
    b = -1e9,
    c = 1e9,
    d = -1e9;
  for (const p of pts) {
    const q = P(p[0], p[1], p[2]);
    a = Math.min(a, q[0]);
    b = Math.max(b, q[0]);
    c = Math.min(c, q[1]);
    d = Math.max(d, q[1]);
  }
  return { x0: a, x1: b, y0: c, y1: d };
}

// Centre la boîte des points sur (cx, cy)
export function fit(C, pts, cx, cy) {
  const b = bounds(C, pts);
  C.ox = cx - (b.x0 + b.x1) / 2;
  C.oy = cy - (b.y0 + b.y1) / 2;
}

// Côté visible d'un échantillon d'empreinte
export const facing = (C) => {
  const s = Math.sin(C.az),
    c = Math.cos(C.az);
  return (q) => q.nu * s + q.nv * c >= -1e-6;
};

// ---------- Volumes ----------
function rrect(u0, v0, u1, v1, r, n = 4) {
  r = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const out = [];
  for (const [cu, cv, a0] of [
    [u1 - r, v1 - r, 0],
    [u0 + r, v1 - r, 90],
    [u0 + r, v0 + r, 180],
    [u1 - r, v0 + r, 270],
  ])
    for (let k = 0; k <= n; k++) {
      const a = rad(a0 + (90 * k) / n),
        ca = Math.cos(a),
        sa = Math.sin(a);
      out.push({ u: cu + r * ca, v: cv + r * sa, nu: ca, nv: sa });
    }
  return out;
}

// Cercle (empreinte) de rayon R centré en (cx, cy)
export function disc(cx, cy, R, n = 20) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2,
      ca = Math.cos(a),
      sa = Math.sin(a);
    out.push({ u: cx + R * ca, v: cy + R * sa, nu: ca, nv: sa });
  }
  return out;
}

function hull(input) {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [],
    up = [];
  for (const p of pts) {
    while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (up.length > 1 && x(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}

const ringAt = (P, ring, z) => ring.map((q) => P(q.u, q.v, z));

// La seule suite continue d'échantillons qui passent keep
function run(ring, keep) {
  const n = ring.length;
  let s = -1;
  for (let i = 0; i < n; i++)
    if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) {
      s = i;
      break;
    }
  if (s < 0) return keep(ring[0]) ? ring.slice() : [];
  const out = [];
  for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n]);
  return out;
}

// Volume de z0 à z1 : { sil, crease } (deux chemins SVG)
export function prism(P, front, ring, inner, z0, z1) {
  return {
    sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))),
    crease: inner ? open(ringAt(P, run(inner, front), z1)) : "",
  };
}

// Empreinte rectangulaire arrondie + son arête intérieure (retrait b)
export const rings = (x0, y0, x1, y1, r, b) => [rrect(x0, y0, x1, y1, r), rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b))];

// Points d'où tombent les pointillés (gauche, droite, le plus proche)
export function extremes(P, ring) {
  const pr = ring.map((q) => P(q.u, q.v, 0));
  let a = 0,
    b = 0,
    c = 0;
  pr.forEach((p, k) => {
    if (p[0] < pr[a][0]) a = k;
    if (p[0] > pr[b][0]) b = k;
    if (p[1] > pr[c][1]) c = k;
  });
  return [ring[a], ring[b], ring[c]];
}

// ---------- Animation : 700 ms sur (.32, .72, 0, 1) ----------
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const X = (u) => ((ax * u + bx) * u + cx) * u;
  const Y = (u) => ((ay * u + by) * u + cy) * u;
  const dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = X(u) - t;
      if (Math.abs(e) < 1e-5) break;
      const d = dX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    return Y(clamp(u, 0, 1));
  };
}

const EASE_LIFT = bezier(0.32, 0.72, 0, 1);

export const tween = (v, dur = 700) => ({ from: v, to: v, t0: -1e9, dur, instant: false });
export const tval = (tw, now) => {
  if (tw.instant) return tw.to;
  const p = clamp((now - tw.t0) / tw.dur, 0, 1);
  return tw.from + (tw.to - tw.from) * EASE_LIFT(p);
};
// instant : pas d'animation (mouvement réduit)
export const tset = (tw, to, now, delay, instant = false) => {
  if (tw.to === to && !instant) return;
  tw.from = tval(tw, now);
  tw.to = to;
  tw.t0 = now + delay;
  tw.instant = instant;
};
export const tdone = (tw, now) => tw.instant || now >= tw.t0 + tw.dur;

// ---------- SVG ----------
export function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

// Un volume : silhouette + arête
export function solid(parent) {
  const g = mk("g", {}, parent);
  return { g, sil: mk("path", { class: "sil" }, g), cr: mk("path", { class: "nf lo" }, g) };
}

export const put = (el, s) => {
  el.sil.setAttribute("d", s.sil);
  el.cr.setAttribute("d", s.crease);
};
