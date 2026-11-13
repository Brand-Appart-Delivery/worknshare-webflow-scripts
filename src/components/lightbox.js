// src/components/lightbox.js — visionneuse photo plein écran (maquette Figma
// « WS/Visionneuse ») : compteur « 1 / 18 », légende, bouton fermer, grande
// photo, flèches, miniatures.
//
// Utilisation : const box = createLightbox(); box.open(photos, index, déclencheur)
//   photos = [{ src, alt }]
//
// Ouverture : la visionneuse monte depuis le bas de l'écran (translation
// seule, fluide), la photo arrive avec un léger décalage. Fermeture : elle
// redescend. Changement de photo : l'ancienne sort d'un côté en penchant, la
// nouvelle entre de l'autre en se redressant (comme les cartes des sliders).
// Pas d'animation si l'utilisateur a réduit les animations.
//
// Glisser (doigt ou souris) : la photo suit, en penchant ; relâchée assez loin
// (ou lancée vite), on passe à la voisine, sinon elle revient.
// Clic / tap sur la photo : zoom à cet endroit, tout le reste est masqué
// (.is-zoomed) ; on glisse pour se déplacer dans la photo ; nouveau clic ou
// Échap : retour.
//
// Clavier : ← → pour changer de photo, Échap pour fermer, focus gardé dans la
// visionneuse puis rendu au bouton qui l'a ouverte. Glisser au doigt / à la
// souris sur la photo. Page bloquée (Lenis arrêté) pendant l'ouverture.
// Textes générés : t() (FR / EN).

import { getLenis } from "../core/core.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { t } from "../utils/i18n.js";

const SWIPE = 60; // px de glissé pour changer de photo
const FLICK = 0.5; // px/ms : glissé rapide qui suffit, même court
const TAP = 6; // px : en dessous, c'est un clic, pas un glissé
const TILT = 6; // degrés d'inclinaison des photos qui partent / arrivent
const ZOOM = 2.5; // grossissement minimal du zoom
const ZOOM_MAX = 4; // au plus (assez pour remplir la largeur de l'écran)
const OPEN_DURATION = 550; // ms
const CLOSE_DURATION = 400; // ms
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.5, 0, 0.75, 0)";
const SLIDE_DURATION = 500; // ms, passage d'une photo à l'autre

const icon = (d) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CLOSE = "M18 6 6 18M6 6l12 12";
const ICON_PREV = "M14.5 7.5S10 10.8 10 12c0 1.2 4.5 4.5 4.5 4.5";
const ICON_NEXT = "M9.5 7.5S14 10.8 14 12c0 1.2-4.5 4.5-4.5 4.5";

let instance = null;

export function createLightbox() {
  if (instance) return instance;

  const root = document.createElement("div");
  root.className = "lightbox";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", t("lightbox.label"));
  root.setAttribute("data-lenis-prevent", "");
  root.innerHTML = `
    <div class="lightbox_bar">
      <p class="lightbox_count" aria-live="polite"></p>
      <p class="lightbox_caption"></p>
      <button type="button" class="lightbox_button lightbox_close" aria-label="${t("lightbox.close")}">${icon(ICON_CLOSE)}</button>
    </div>
    <div class="lightbox_stage">
      <button type="button" class="lightbox_button lightbox_prev" aria-label="${t("lightbox.prev")}">${icon(ICON_PREV)}</button>
      <figure class="lightbox_figure"><img class="lightbox_image" alt="" draggable="false"></figure>
      <button type="button" class="lightbox_button lightbox_next" aria-label="${t("lightbox.next")}">${icon(ICON_NEXT)}</button>
    </div>
    <div class="lightbox_thumbs" role="group" aria-label="${t("lightbox.thumbs")}"></div>`;
  document.body.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const count = $(".lightbox_count");
  const caption = $(".lightbox_caption");
  const image = $(".lightbox_image");
  const figure = $(".lightbox_figure");
  const thumbs = $(".lightbox_thumbs");
  const prev = $(".lightbox_prev");
  const next = $(".lightbox_next");

  let photos = [];
  let index = 0;
  let opener = null;
  let token = 0;
  let closing = null; // animation de fermeture en cours

  // Changement de photo : l'ancienne sort d'un côté pendant que la nouvelle
  // entre de l'autre (dir = 1 : suivante, entre par la droite ; -1 : l'inverse).
  // L'ancienne est une copie posée par-dessus, retirée à la fin.
  function slideTo(photo, dir, from = "none") {
    // Jusqu'au bord de l'écran : la photo entre / sort entièrement
    image.style.transform = "";
    const box = image.getBoundingClientRect();
    const distance = Math.max(innerWidth - box.left, box.right) + 80;
    const out = image.cloneNode();
    out.removeAttribute("class");
    out.className = "lightbox_image is-leaving";
    Object.assign(out.style, {
      left: `${image.offsetLeft}px`,
      top: `${image.offsetTop}px`,
      width: `${image.offsetWidth}px`,
      height: `${image.offsetHeight}px`,
    });
    out.setAttribute("aria-hidden", "true");
    figure.appendChild(out);

    image.getAnimations().forEach((a) => a.cancel());
    image.src = photo.src;
    image.alt = photo.alt || "";
    const timing = { duration: SLIDE_DURATION, easing: EASE_OUT };
    image.animate([{ transform: `translateX(${dir * distance}px) rotate(${dir * TILT}deg)` }, { transform: "none" }], timing);
    out.animate([{ transform: from }, { transform: `translateX(${-dir * distance}px) rotate(${-dir * TILT}deg)` }], timing).onfinish =
      () => out.remove();
  }

  function show(i, { animate = true, from = "none" } = {}) {
    if (zoomed) unzoom(false);
    const dir = Math.sign(i - index); // sens, avant le passage au début / à la fin
    index = (i + photos.length) % photos.length;
    const photo = photos[index];
    count.textContent = `${index + 1} / ${photos.length}`;
    caption.textContent = photo.alt || "";
    // La nouvelle photo s'affiche une fois chargée (en glissant si on navigue)
    const current = ++token;
    figure.classList.add("is-loading");
    const loader = new Image();
    loader.onload = loader.onerror = () => {
      if (current !== token) return;
      figure.classList.remove("is-loading");
      if (animate && dir && image.getAttribute("src") && !prefersReducedMotion()) return slideTo(photo, dir, from);
      image.style.transform = "";
      image.src = photo.src;
      image.alt = photo.alt || "";
    };
    loader.src = photo.src;
    // Miniatures : active marquée et gardée visible
    [...thumbs.children].forEach((thumb, k) => {
      const on = k === index;
      thumb.classList.toggle("is-active", on);
      thumb.setAttribute("aria-current", on ? "true" : "false");
      if (on) thumb.scrollIntoView({ block: "nearest", inline: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
    // Photos voisines préchargées
    [index - 1, index + 1].forEach((k) => (new Image().src = photos[(k + photos.length) % photos.length].src));
  }

  function renderThumbs() {
    thumbs.innerHTML = "";
    photos.forEach((photo, k) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "lightbox_thumb";
      thumb.setAttribute("aria-label", t("lightbox.goto", { n: k + 1 }));
      thumb.innerHTML = `<img src="${photo.thumb || photo.src}" alt="" loading="lazy" draggable="false">`;
      thumb.addEventListener("click", () => show(k));
      thumbs.appendChild(thumb);
    });
  }

  function open(list, start = 0, trigger = null) {
    photos = list.filter((p) => p && p.src);
    if (!photos.length) return;
    opener = trigger || document.activeElement;
    const several = photos.length > 1;
    prev.hidden = next.hidden = thumbs.hidden = !several;
    renderThumbs();
    // Rouverte pendant la fermeture : elle remonte depuis là où elle en est
    const reopening = closing;
    closing = null;
    if (reopening) {
      reopening.onfinish = () => reopening.cancel();
      reopening.reverse();
    }
    root.hidden = false;
    root.classList.add("is-open");
    document.documentElement.classList.add("is-lightbox-open");
    getLenis()?.stop();
    index = start;
    show(start, { animate: false });
    $(".lightbox_close").focus({ preventScroll: true });
    if (prefersReducedMotion() || reopening) return;
    root.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: OPEN_DURATION, easing: EASE_OUT });
    // La photo arrive un peu après le fond (léger décalage)
    figure.animate([{ transform: "translateY(15vh)" }, { transform: "none" }], {
      duration: OPEN_DURATION + 150,
      easing: EASE_OUT,
    });
  }

  function close() {
    if (root.hidden || closing) return;
    if (zoomed) unzoom(false);
    document.documentElement.classList.remove("is-lightbox-open");
    getLenis()?.start();
    const hide = () => {
      root.hidden = true;
      root.classList.remove("is-open");
    };
    opener?.focus?.({ preventScroll: true });
    if (prefersReducedMotion()) return hide();
    // Redescend ; fill « forwards » : pas de retour à l'écran d'une image
    // avant de masquer
    closing = root.animate([{ transform: "none" }, { transform: "translateY(100%)" }], {
      duration: CLOSE_DURATION,
      easing: EASE_IN,
      fill: "forwards",
    });
    closing.onfinish = () => {
      hide();
      closing?.cancel();
      closing = null;
    };
  }

  $(".lightbox_close").addEventListener("click", close);
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  // Clic sur le fond (hors photo, boutons, miniatures) : fermeture
  root.addEventListener("click", (e) => {
    if (e.target === root || e.target.classList.contains("lightbox_stage")) close();
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return zoomed ? unzoom() : close();
    if (zoomed) return;
    if (e.key === "ArrowLeft" && photos.length > 1) return show(index - 1);
    if (e.key === "ArrowRight" && photos.length > 1) return show(index + 1);
    // Focus gardé dans la visionneuse
    if (e.key === "Tab") {
      const items = [...root.querySelectorAll("button:not([hidden])")].filter((b) => b.offsetParent);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ---------- Zoom ----------
  // La photo grossit autour du point cliqué (origine au centre, décalage
  // calculé pour garder ce point sous le doigt), le reste est masqué.
  let zoomed = false;
  let pan = { x: 0, y: 0 };
  let base = null; // cadre de la photo avant zoom (centre, taille)
  let scale = ZOOM;

  const zoomTransform = () => `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;

  // Déplacement limité, par axe : photo agrandie plus petite que l'écran →
  // centrée ; plus grande → ses bords ne laissent jamais de vide à l'écran
  function clampAxis(value, center, size, screen) {
    const scaled = size * scale;
    if (scaled <= screen) return screen / 2 - center;
    return Math.min(Math.max(value, screen - center - scaled / 2), scaled / 2 - center);
  }

  function clampPan() {
    pan.x = clampAxis(pan.x, base.cx, base.w, innerWidth);
    pan.y = clampAxis(pan.y, base.cy, base.h, innerHeight);
  }

  function zoomAt(clientX, clientY) {
    const box = image.getBoundingClientRect();
    base = { cx: box.left + box.width / 2, cy: box.top + box.height / 2, w: box.width, h: box.height };
    scale = Math.min(Math.max(ZOOM, innerWidth / base.w), ZOOM_MAX);
    const dx = clientX - base.cx;
    const dy = clientY - base.cy;
    pan = { x: -dx * (scale - 1), y: -dy * (scale - 1) };
    clampPan();
    zoomed = true;
    root.classList.add("is-zoomed");
    image.getAnimations().forEach((a) => a.cancel());
    image.style.transformOrigin = "50% 50%"; // zoom autour du centre (pivot du bas sinon)
    image.style.transform = zoomTransform();
    if (!prefersReducedMotion()) {
      image.animate([{ transform: "none" }, { transform: zoomTransform() }], { duration: 450, easing: EASE_OUT });
    }
  }

  function unzoom(animate = true) {
    const from = image.style.transform;
    zoomed = false;
    root.classList.remove("is-zoomed");
    image.style.transform = "";
    if (animate && from && !prefersReducedMotion()) {
      image.animate([{ transform: from }, { transform: "none" }], { duration: 400, easing: EASE_OUT }).onfinish = () =>
        !zoomed && (image.style.transformOrigin = "");
    } else {
      image.style.transformOrigin = "";
    }
  }

  // ---------- Glisser / cliquer sur la photo ----------
  let drag = null;
  figure.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || !e.isPrimary) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, pan: { ...pan } };
    figure.setPointerCapture(e.pointerId);
  });

  figure.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < TAP) return;
    drag.moved = true;
    if (zoomed) {
      // Zoom : on se déplace dans la photo
      pan = { x: drag.pan.x + dx, y: drag.pan.y + dy };
      clampPan();
      image.style.transform = zoomTransform();
    } else if (photos.length > 1) {
      // La photo suit le doigt en penchant
      image.getAnimations().forEach((a) => a.cancel());
      image.style.transform = `translateX(${dx}px) rotate(${(dx / Math.max(figure.clientWidth, 1)) * TILT}deg)`;
    }
  });

  const endDrag = (e, cancelled = false) => {
    if (!drag) return;
    const { moved, x, y, t } = drag;
    drag = null;
    if (cancelled) {
      if (!zoomed) image.style.transform = "";
      return;
    }
    // Clic / tap : zoom (ou retour)
    if (!moved) {
      if (zoomed) return unzoom();
      // (relâchement capturé par la zone photo : on teste le cadre de l'image)
      const box = image.getBoundingClientRect();
      const onImage = e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
      if (onImage) zoomAt(e.clientX, e.clientY);
      return;
    }
    if (zoomed || photos.length < 2) return;
    const dx = e.clientX - x;
    const speed = Math.abs(dx) / Math.max(performance.now() - t, 1);
    const current = image.style.transform;
    if (Math.abs(dx) > SWIPE || (speed > FLICK && Math.abs(dx) > TAP * 2)) {
      show(index + (dx < 0 ? 1 : -1), { from: current });
    } else {
      // Pas assez loin : la photo revient en place
      image.style.transform = "";
      if (!prefersReducedMotion()) image.animate([{ transform: current }, { transform: "none" }], { duration: 350, easing: EASE_OUT });
    }
  };
  figure.addEventListener("pointerup", (e) => endDrag(e));
  figure.addEventListener("pointercancel", (e) => endDrag(e, true));

  instance = { open, close };
  return instance;
}
