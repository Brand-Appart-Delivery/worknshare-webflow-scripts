// src/animations/hero-intro.js — arrivée du hero de l'accueil ([data-hero-video]).
//
// Au chargement, le bloc photo couvre tout l'écran (bord à bord, sans coins
// arrondis), puis se resserre jusqu'à sa place (marges, sous la nav, coins de
// 32 px). La photo ne bouge pas : c'est le cadre qui se referme sur elle
// (effet de recadrage). Puis le contenu (titre, recherche, contrôles) apparaît.
//
// STRUCTURE (Webflow) :
//   [data-hero-video]           section du hero
//     .hero-video_media         bloc photo (premier parent de l'image)
//       img                     photo de fond
//       …                       voile, contrôles vidéo, contenu
//
// La photo est cadrée sur l'écran entier (variables --hero-vw / --hero-vh /
// --hero-x / --hero-y, cf. _hero-video.scss) : le cadrage est le même au début
// et à la fin de l'animation, sans saut.
//
// Une seule fois, seulement si la page s'ouvre en haut. Rien si l'utilisateur a
// réduit les animations.

import { prefersReducedMotion } from "../utils/motion.js";

const DURATION = 1400; // ms
const DELAY = 150; // ms, laisse la nav commencer à descendre
const RADIUS = 32; // px, coins du bloc photo une fois en place (radius/xl)

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutQuart = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

export function initHeroIntro(root = document) {
  const hero = root.querySelector("[data-hero-video]");
  const img = hero && hero.querySelector("img");
  const media = img && img.parentElement;
  if (!media) return;

  // ---------- Photo cadrée sur l'écran (toujours, pas seulement à l'arrivée) ----------
  const frame = () => {
    const rect = media.getBoundingClientRect();
    hero.style.setProperty("--hero-vw", `${document.documentElement.clientWidth}px`);
    hero.style.setProperty("--hero-vh", `${window.innerHeight}px`);
    // Position du bloc par rapport au haut de la page (page en haut)
    hero.style.setProperty("--hero-x", `${rect.left + window.scrollX}px`);
    hero.style.setProperty("--hero-y", `${rect.top + window.scrollY}px`);
  };
  frame();
  hero.classList.add("is-framed");
  window.addEventListener("resize", frame, { passive: true });

  // ---------- Arrivée ----------
  const done = () => {
    hero.classList.remove("is-intro-pending", "is-intro-running");
    hero.classList.add("is-intro-done");
  };
  if (prefersReducedMotion() || window.scrollY > 40) {
    // Arrivée sautée : la nav n'attend pas le hero (_mega-menu.scss)
    document.documentElement.classList.add("is-hero-intro-skipped");
    return done();
  }

  hero.classList.add("is-intro-running");
  hero.classList.remove("is-intro-pending");

  // La nav suit le cadre : son bas colle au haut de la photo pendant que celle-ci
  // se resserre (même durée, même amorti). L'animation CSS de la nav est coupée
  // pendant ce temps (html.is-hero-intro-running, cf. _mega-menu.scss).
  const nav = document.querySelector("[data-nav]");
  document.documentElement.classList.add("is-hero-intro-running");

  media.style.transformOrigin = "50% 50%";

  // Contenu du hero (titre, recherche, contrôles vidéo) : apparaît pendant la
  // seconde moitié du resserrement et finit avec le cadre. Il reçoit le même
  // mouvement inverse que la photo : immobile à l'écran et net (pas étiré).
  const contents = [...media.children].filter((el) => el !== img && (el.children.length || el.textContent.trim()));
  const CONTENT_START = 0.5; // avancement (0 → 1) où le contenu commence à apparaître
  const CONTENT_RISE = 16; // px de montée pendant l'apparition

  // Géométrie mesurée à chaque image, sans transformation : si la mise en page
  // bouge pendant l'arrivée (hauteur de la nav qui change au chargement de la
  // police ou du logo…), le cadre colle quand même aux bords de l'écran au départ.
  const measure = () => {
    media.style.transform = "none";
    img.style.transform = "none";
    contents.forEach((el) => (el.style.transform = "none"));
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const r = media.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    // Origine de l'inverse : centre du bloc, exprimé dans la boîte de la photo
    img.style.transformOrigin = `${r.left + r.width / 2 - ir.left}px ${r.top + r.height / 2 - ir.top}px`;
    contents.forEach((el) => {
      const er = el.getBoundingClientRect();
      el.style.transformOrigin = `${r.left + r.width / 2 - er.left}px ${r.top + r.height / 2 - er.top}px`;
    });
    return {
      sx0: vw / r.width,
      sy0: vh / r.height,
      tx0: vw / 2 - (r.left + r.width / 2),
      ty0: vh / 2 - (r.top + r.height / 2),
    };
  };

  const apply = (p) => {
    const { sx0, sy0, tx0, ty0 } = measure();
    const k = 1 - easeInOutQuart(p); // 1 au départ (plein écran), 0 en place
    const sx = 1 + (sx0 - 1) * k;
    const sy = 1 + (sy0 - 1) * k;
    const tx = tx0 * k;
    const ty = ty0 * k;
    media.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    // Inverse exact : la photo reste immobile à l'écran
    img.style.transform = `translate(${-tx / sx}px, ${-ty / sy}px) scale(${1 / sx}, ${1 / sy})`;
    // Coins : rayon visible = RADIUS × avancement, compensé par l'échelle
    const radius = RADIUS * (1 - k);
    media.style.borderRadius = `${radius / sx}px / ${radius / sy}px`;
    // Nav : entièrement au-dessus de l'écran au départ, en place à la fin
    if (nav) nav.style.transform = `translateY(${-100 * k}%)`;
    // Contenu : immobile à l'écran (inverse), fondu + montée sur la fin
    const c = easeOutCubic(Math.min(Math.max((p - CONTENT_START) / (1 - CONTENT_START), 0), 1));
    contents.forEach((el) => {
      el.style.opacity = String(c);
      el.style.transform = `translate(${-tx / sx}px, ${-ty / sy}px) scale(${1 / sx}, ${1 / sy}) translateY(${CONTENT_RISE * (1 - c)}px)`;
    });
  };

  apply(0);
  const start = performance.now() + DELAY;
  const tick = (now) => {
    const p = Math.min(Math.max((now - start) / DURATION, 0), 1);
    apply(p);
    if (p < 1) {
      requestAnimationFrame(tick);
      return;
    }
    // Fin : on rend la main aux styles Webflow
    media.style.transform = "";
    media.style.borderRadius = "";
    img.style.transform = "";
    if (nav) nav.style.transform = "";
    contents.forEach((el) => {
      el.style.opacity = "";
      el.style.transform = "";
      el.style.transformOrigin = "";
    });
    document.documentElement.classList.remove("is-hero-intro-running");
    document.documentElement.classList.add("is-hero-intro-done");
    done();
  };
  requestAnimationFrame(tick);
}
