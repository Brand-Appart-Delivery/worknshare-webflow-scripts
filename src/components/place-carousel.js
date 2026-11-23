// src/components/place-carousel.js — carrousel photo de la fiche espace sur la
// carte ([data-place-card]).
//
// STRUCTURE (dans la fiche, posée dans Webflow) :
//   [data-place-photo]   l'image affichée
//   [data-place-prev]    bouton photo précédente
//   [data-place-next]    bouton photo suivante
//   [data-place-dots]    points (recréés selon le nombre de photos)
//
// Les photos viennent de spaces-data.js (photo principale + galerie CMS).
// Changement de photo en glissade (450 ms ; instantané si mouvement réduit).
// Défilement automatique toutes les 5 s : le point actif se remplit (rose)
// pendant ce temps (pause si fiche fermée, onglet caché, focus clavier).
// Flèches, points cliquables, glisser au doigt / à la souris, flèches du
// clavier quand le focus est dans la fiche. Navigation masquée s'il n'y a
// qu'une photo.

import { t } from "../utils/i18n.js";
import { prefersReducedMotion } from "../utils/motion.js";

const SWIPE = 40; // px de glissé pour changer de photo
const SLIDE_MS = 450; // durée de la glissade entre deux photos
const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const AUTOPLAY_MS = 5000; // temps passé sur chaque photo avant la suivante

export function createPlaceCarousel(card) {
  const img = card?.querySelector("[data-place-photo]");
  if (!img) return { set() {} };
  const prev = card.querySelector("[data-place-prev]");
  const next = card.querySelector("[data-place-next]");
  const dots = card.querySelector("[data-place-dots]");
  const media = img.parentElement;

  let photos = [];
  let index = 0;
  let name = "";
  let token = 0; // ignore une photo chargée trop tard (changement rapide)

  const label = () => t("map.photo", { name, n: index + 1, total: photos.length });

  // Glissade en cours : copie de l'ancienne photo + animations, arrêtées si
  // on change encore de photo avant la fin
  let slide = null;
  const endSlide = () => {
    if (!slide) return;
    slide.anims.forEach((a) => a.cancel());
    slide.ghost.remove();
    slide = null;
  };

  // dir : 1 = la nouvelle photo arrive de la droite, -1 = de la gauche
  function show(i, { instant = false, dir = 1 } = {}) {
    if (!photos.length) return;
    index = (i + photos.length) % photos.length;
    const src = photos[index];
    const current = ++token;
    const apply = () => {
      if (current !== token) return;
      endSlide();
      const animate = !instant && !prefersReducedMotion() && img.currentSrc && img.complete;
      // Copie de l'ancienne photo qui sort de l'autre côté. Placée en premier
      // dans le cadre : flèches et points restent au-dessus pendant la glissade
      const ghost = animate ? img.cloneNode() : null;
      if (ghost) {
        ghost.removeAttribute("data-place-photo");
        ghost.setAttribute("aria-hidden", "true");
        ghost.classList.add("place-carousel_ghost");
        media.prepend(ghost);
      }
      img.src = src;
      img.removeAttribute("srcset");
      img.alt = label();
      if (!ghost) return;
      const timing = { duration: SLIDE_MS, easing: SLIDE_EASE };
      slide = {
        ghost,
        anims: [
          img.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: "translateX(0)" }], timing),
          ghost.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dir * -100}%)` }], timing),
        ],
      };
      const mine = slide;
      mine.anims[0].finished.then(() => slide === mine && endSlide()).catch(() => {});
    };
    if (instant || prefersReducedMotion()) apply();
    else {
      // On attend que la nouvelle photo soit chargée avant de la faire glisser
      const loader = new Image();
      loader.onload = loader.onerror = apply;
      loader.src = src;
    }
    markActive();
    // Photo suivante préchargée
    if (photos.length > 1) new Image().src = photos[(index + 1) % photos.length];
  }

  function renderDots() {
    if (!dots) return;
    dots.innerHTML = "";
    photos.forEach((_, k) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slider_dot";
      dot.setAttribute("aria-label", t("map.photoGo", { n: k + 1 }));
      // Remplissage du point actif : temps écoulé sur la photo
      const fill = document.createElement("span");
      fill.className = "place-carousel_progress";
      fill.setAttribute("aria-hidden", "true");
      dot.appendChild(fill);
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (k !== index) show(k, { dir: k > index ? 1 : -1 });
      });
      dots.appendChild(dot);
    });
  }

  // Boutons (liens Webflow href="#") : pas de navigation ni de clic sur la carte
  const go = (step) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    show(index + step, { dir: step });
  };
  prev?.addEventListener("click", go(-1));
  next?.addEventListener("click", go(1));

  // Glisser (doigt ou souris)
  let startX = null;
  media.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    startX = e.clientX;
  });
  media.addEventListener("pointerup", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > SWIPE && photos.length > 1) show(index + (dx < 0 ? 1 : -1), { dir: dx < 0 ? 1 : -1 });
  });
  media.addEventListener("pointercancel", () => (startX = null));
  img.draggable = false;

  // Clavier : flèches gauche / droite quand le focus est dans la fiche
  card.addEventListener("keydown", (e) => {
    if (photos.length < 2 || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    if (e.target.closest("input, textarea")) return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    show(index + step, { dir: step });
  });

  // Flèches et points : seulement s'il y a plusieurs photos
  function renderNav() {
    const several = photos.length > 1;
    [prev, next, dots].forEach((el) => el && (el.hidden = !several));
    renderDots();
    markActive();
  }

  // ---------- Défilement automatique ----------
  // Le point actif se remplit pendant AUTOPLAY_MS, puis photo suivante.
  // En pause : fiche fermée, onglet caché, focus clavier dans la fiche, doigt
  // ou souris appuyé sur la photo. Pas de défilement si mouvement réduit.
  let progress = null;
  let focused = false;
  let pressing = false;

  function markActive() {
    dots?.querySelectorAll(".slider_dot").forEach((dot, k) => {
      dot.classList.toggle("is-active", k === index);
      dot.setAttribute("aria-current", k === index ? "true" : "false");
    });
    startProgress();
  }

  function startProgress() {
    progress?.cancel();
    progress = null;
    const fill = dots?.querySelectorAll(".place-carousel_progress")[index];
    if (!fill || photos.length < 2 || prefersReducedMotion()) return;
    const anim = fill.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: AUTOPLAY_MS,
      easing: "linear",
      fill: "forwards",
    });
    progress = anim;
    updatePause();
    anim.finished
      .then(() => {
        if (progress === anim) show(index + 1, { dir: 1 });
      })
      .catch(() => {}); // annulée (autre photo, autre espace)
  }

  function updatePause() {
    if (!progress) return;
    const open = !card.matches("[data-place-card]") || card.classList.contains("is-open");
    const pause = !open || document.hidden || focused || pressing;
    if (pause && progress.playState === "running") progress.pause();
    else if (!pause && progress.playState === "paused") progress.play();
  }

  card.addEventListener("focusin", (e) => {
    focused = e.target.matches(":focus-visible");
    updatePause();
  });
  card.addEventListener("focusout", () => {
    focused = false;
    updatePause();
  });
  media.addEventListener("pointerdown", () => {
    pressing = true;
    updatePause();
  });
  window.addEventListener("pointerup", () => {
    if (!pressing) return;
    pressing = false;
    updatePause();
  });
  document.addEventListener("visibilitychange", updatePause);
  new MutationObserver(updatePause).observe(card, { attributes: true, attributeFilter: ["class"] });

  let setToken = 0;

  return {
    // Nouvel espace : ses photos, en commençant par la première
    set(list, spaceName) {
      photos = list.filter(Boolean);
      name = spaceName || "";
      index = 0;
      renderNav();
      show(0, { instant: true });

      // La photo principale est souvent une copie allégée de la 1re image de
      // la galerie (adresse différente) : même image = doublon retiré, on
      // garde la photo principale (plus légère)
      const current = ++setToken;
      if (photos.length > 1) {
        sameImage(photos[0], photos[1]).then((same) => {
          if (!same || current !== setToken) return;
          photos.splice(1, 1);
          if (index >= photos.length) index = 0;
          renderNav();
        });
      }
    },
  };
}

// ---------- Comparaison de deux images (miniatures 16×16 en gris) ----------
// Le CDN Webflow autorise la lecture (CORS) : on dessine chaque image en
// miniature et on compare pixel à pixel. Mêmes photos recadrées / compressées
// différemment = très proches ; photos différentes = écart net.
const SIZE = 16;
// Écart moyen (0-255) en dessous duquel c'est la même photo. Mesuré le 23/11
// sur les 14 espaces : même photo 0,2 à 3,4 ; photos différentes 28 et plus.
const MAX_DIFF = 12;
const thumbs = new Map(); // adresse -> Promise<Uint8Array | null>

function thumb(src) {
  if (!thumbs.has(src)) {
    thumbs.set(
      src,
      new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = SIZE;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(image, 0, 0, SIZE, SIZE);
            const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
            const gray = new Uint8Array(SIZE * SIZE);
            for (let i = 0; i < gray.length; i++) {
              gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
            }
            resolve(gray);
          } catch {
            resolve(null); // lecture refusée : on ne retire rien
          }
        };
        image.onerror = () => resolve(null);
        image.src = src;
      }),
    );
  }
  return thumbs.get(src);
}

async function sameImage(a, b) {
  const [x, y] = await Promise.all([thumb(a), thumb(b)]);
  if (!x || !y) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff += Math.abs(x[i] - y[i]);
  return diff / x.length < MAX_DIFF;
}
