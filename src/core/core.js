// src/core/core.js — démarrage global : scroll fluide (Lenis, optionnel) + ancres.
import { requestScrollRefresh } from "../utils/scroll-refresh.js";
import { prefersReducedMotion } from "../utils/motion.js";

// false = scroll natif. true = Lenis (le script Lenis doit être chargé dans Webflow).
const SMOOTH_SCROLL_ENABLED = true;

// Élément fixe en haut de page dont on tient compte pour le scroll vers une ancre.
const NAV_SELECTOR = "[data-nav]";

const ANCHOR_DURATION = 2; // secondes
const HASH_LOAD_DELAY = 400; // ms avant le scroll animé à l'arrivée avec un #hash

let lenisInstance = null;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function getAnchorOffset() {
  const nav = document.querySelector(NAV_SELECTOR);
  return nav ? -nav.getBoundingClientRect().height : 0;
}

function scrollToHash(hash, { instant = false } = {}) {
  if (!hash || hash === "#") return false;
  let target = null;
  try {
    target = document.querySelector(hash);
  } catch (e) {
    return false;
  }
  if (!target) return false;

  const offset = getAnchorOffset();
  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset,
      duration: instant ? 0 : ANCHOR_DURATION,
      easing: easeInOutCubic,
      immediate: instant,
      force: true, // Lenis ignore scrollTo() quand il est arrêté (menu ouvert)
    });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: instant ? "auto" : "smooth" });
  }
  return true;
}

function initAnchors() {
  // Phase de capture : passe avant le gestionnaire d'ancres de Webflow.
  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest && e.target.closest("a[href*='#']");
      if (!link) return;
      // Onglets (href="#panneau"), flèches de slider et liens-boutons : gérés
      // par leur propre module, pas de scroll vers l'ancre
      if (link.matches("[role='tab'], [role='button'], [data-formula-tab], [data-slider-prev], [data-slider-next]")) return;
      const url = new URL(link.href, window.location.href);
      const samePage = url.origin === location.origin && url.pathname === location.pathname;
      if (!samePage || !url.hash || url.hash === "#") return;
      if (scrollToHash(url.hash)) {
        e.preventDefault();
        e.stopPropagation();
        history.pushState(null, "", url.hash);
      }
    },
    true,
  );

  // Arrivée sur la page avec un #hash : même scroll animé qu'un clic.
  if (window.location.hash) {
    const hash = window.location.hash;
    window.scrollTo(0, 0);
    const go = () => {
      if (window.scrollY > 50) return; // l'utilisateur a déjà scrollé
      scrollToHash(hash);
      // Recalage : les images lazy peuvent avoir décalé la cible
      setTimeout(() => scrollToHash(hash, { instant: true }), ANCHOR_DURATION * 1000 + 100);
    };
    const start = () => setTimeout(go, HASH_LOAD_DELAY);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }
}

// Seul endroit où Lenis est créé et branché sur GSAP / ScrollTrigger.
export function initLenis() {
  if (lenisInstance) return lenisInstance;
  if (!SMOOTH_SCROLL_ENABLED || typeof window.Lenis === "undefined") return null;
  if (prefersReducedMotion()) return null;

  // lerp (et pas « duration ») : avec une durée fixe, chaque coup de molette
  // relance une animation qui part vite puis freine longtemps, d'où des à-coups
  // (surtout au trackpad). Le lerp rattrape la cible en douceur, en continu.
  lenisInstance = new window.Lenis({ lerp: 0.1, smoothWheel: true, anchors: false });

  const hasGsap = typeof window.gsap !== "undefined";
  if (hasGsap) {
    if (typeof window.ScrollTrigger !== "undefined") {
      window.gsap.registerPlugin(window.ScrollTrigger);
      lenisInstance.on("scroll", window.ScrollTrigger.update);
    }
    window.gsap.ticker.add((time) => lenisInstance.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // Hauteur de page qui change (accordéons, lazy loading, listes CMS) :
  // recalcul regroupé, seulement si la hauteur a vraiment changé.
  if (typeof ResizeObserver !== "undefined") {
    let lastHeight = 0;
    let timer = null;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const height = document.body.scrollHeight;
        if (height === lastHeight) return;
        lastHeight = height;
        lenisInstance.resize();
        requestScrollRefresh(0);
      }, 150);
    }).observe(document.body);
  }

  return lenisInstance;
}

export function getLenis() {
  return lenisInstance;
}

export function initCore() {
  initLenis();
  initAnchors();
}
