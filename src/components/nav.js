// src/components/nav.js — navigation principale (composant Webflow « Header »).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-nav]                               le <header>
//     [data-mega-trigger="espaces"]          lien « Nos espaces » (aria-controls = id du panneau)
//     [data-mega-panel="espaces"]            panneau desktop (mega menu)
//     [data-nav-toggle]                      burger (aria-controls = id du tiroir)
//     [data-nav-panel="main"]                tiroir mobile
//       [data-mega-trigger="espaces-mobile"] entrée « Nos espaces » du tiroir
//       [data-mega-panel="espaces-mobile"]   sous-menu (accordéon)
//
// ÉTATS : .is-open sur le panneau / tiroir ouvert (display géré par les combos
// Webflow + _mega-menu.scss), aria-expanded sur les déclencheurs,
// .is-nav-open sur <html> quand le tiroir est ouvert (scroll bloqué),
// .is-scrolled sur [data-nav] quand elle est revenue en cours de page (fond
// blanc), .is-hidden quand elle est cachée (scroll vers le bas).
//
// COMPORTEMENT :
//   - desktop : ouverture au clic, et au survol avec une souris ;
//     fermeture par Échap, clic à l'extérieur ou focus qui quitte le header ;
//   - mobile : burger qui ouvre / ferme le tiroir, accordéon « Nos espaces » ;
//   - lien de la page courante marqué aria-current="page".

import { t } from "../utils/i18n.js";
import { getLenis } from "../core/core.js";
import { createScrollIndicator } from "../utils/scroll-indicator.js";

const DESKTOP_QUERY = window.matchMedia("(min-width: 992px)");
const HOVER_QUERY = window.matchMedia("(hover: hover) and (pointer: fine)");
const HOVER_CLOSE_DELAY = 250; // ms avant fermeture quand la souris sort

// Icônes du burger (tracés SVG)
const ICON_MENU = "M4 7h16M4 12h16M4 17h16";
const ICON_CLOSE = "M6 6l12 12M18 6L6 18";

export function initNav(root = document) {
  const header = root.querySelector("[data-nav]");
  if (!header) return;

  initMegaPanels(header);
  initDrawer(header);
  initScrollState(header);
  initNavHeight(header);
  markCurrentLinks(header);

  // Échap : ferme tout et rend le focus au déclencheur
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openTrigger = header.querySelector("[data-mega-trigger][aria-expanded='true'], [data-nav-toggle][aria-expanded='true']");
    closeAll(header);
    if (openTrigger) openTrigger.focus();
  });

  // Clic en dehors du header : ferme tout
  document.addEventListener("click", (e) => {
    if (!header.contains(e.target)) closeAll(header);
  });

  // Passage desktop <-> mobile : on repart d'un état fermé
  DESKTOP_QUERY.addEventListener("change", () => closeAll(header));
}

// ---------- Panneaux (mega menu desktop + accordéon mobile) ----------

function getPanel(header, trigger) {
  const name = trigger.getAttribute("data-mega-trigger");
  return header.querySelector(`[data-mega-panel="${name}"]`);
}

function setPanel(trigger, panel, open) {
  panel.classList.toggle("is-open", open);
  trigger.setAttribute("aria-expanded", String(open));
}

function initMegaPanels(header) {
  header.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
    const panel = getPanel(header, trigger);
    if (!panel) return;

    // Les liens sans href ne réagissent pas à Entrée / Espace : on le gère
    trigger.setAttribute("aria-expanded", "false");
    const toggle = () => setPanel(trigger, panel, !panel.classList.contains("is-open"));

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      // Avec une souris, le survol a déjà ouvert le panneau : le clic ne le referme pas
      const isHoverMenu = !trigger.closest("[data-nav-panel]") && DESKTOP_QUERY.matches && HOVER_QUERY.matches;
      if (isHoverMenu) setPanel(trigger, panel, true);
      else toggle();
    });
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    // Survol (desktop, souris seulement) pour le mega menu du header
    if (trigger.closest("[data-nav-panel]")) return;
    let closeTimer = null;
    const open = () => {
      if (!DESKTOP_QUERY.matches || !HOVER_QUERY.matches) return;
      clearTimeout(closeTimer);
      setPanel(trigger, panel, true);
    };
    const scheduleClose = () => {
      if (!DESKTOP_QUERY.matches || !HOVER_QUERY.matches) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setPanel(trigger, panel, false), HOVER_CLOSE_DELAY);
    };
    // Ouverture au survol du lien ; la souris peut traverser l'espace vide
    // entre le lien et le panneau : on ne ferme qu'en quittant le header
    // ou en survolant un autre lien de la barre.
    trigger.addEventListener("mouseenter", open);
    panel.addEventListener("mouseenter", open);
    header.addEventListener("mouseleave", scheduleClose);
    trigger.parentElement.querySelectorAll("a").forEach((link) => {
      if (link !== trigger) link.addEventListener("mouseenter", scheduleClose);
    });

    // Clavier : le focus qui sort du trigger et du panneau ferme le panneau
    header.addEventListener("focusout", (e) => {
      const next = e.relatedTarget;
      if (!next || (!trigger.contains(next) && !panel.contains(next))) {
        if (panel.classList.contains("is-open") && !panel.matches(":hover")) setPanel(trigger, panel, false);
      }
    });
  });
}

// ---------- Tiroir mobile ----------

function initDrawer(header) {
  const toggle = header.querySelector("[data-nav-toggle]");
  const drawer = header.querySelector("[data-nav-panel]");
  if (!toggle || !drawer) return;

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", t("nav.open"));
  // Le tiroir défile seul : Lenis ne doit pas capter sa molette / son tactile
  drawer.setAttribute("data-lenis-prevent", "");
  // Barre de défilement maison (la même que la liste de la carte)
  createScrollIndicator(drawer);

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    setDrawer(header, !drawer.classList.contains("is-open"));
  });
  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDrawer(header, !drawer.classList.contains("is-open"));
    }
  });

  // Tab bloqué entre le burger et le tiroir quand il est ouvert
  header.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
    const focusables = [toggle, ...drawer.querySelectorAll("a[href], [role='button'], button, input")].filter(
      (el) => el.offsetParent !== null,
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Un lien suivi dans le tiroir (ancre de la même page) le referme.
  // Les déclencheurs de sous-menu (href="#" ajouté par Webflow) ne comptent pas.
  drawer.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link || link.matches("[data-mega-trigger]")) return;
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    setDrawer(header, false);
  });
}

function setDrawer(header, open) {
  const toggle = header.querySelector("[data-nav-toggle]");
  const drawer = header.querySelector("[data-nav-panel]");
  if (!toggle || !drawer) return;

  drawer.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", t(open ? "nav.close" : "nav.open"));
  const path = toggle.querySelector("svg path");
  if (path) path.setAttribute("d", open ? ICON_CLOSE : ICON_MENU);

  // Scroll de la page bloqué pendant que le tiroir est ouvert
  document.documentElement.classList.toggle("is-nav-open", open);
  const lenis = getLenis();
  if (lenis) open ? lenis.stop() : lenis.start();

  // Fermeture : on referme aussi l'accordéon du tiroir
  if (!open) {
    drawer.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
      const panel = getPanel(header, trigger);
      if (panel) setPanel(trigger, panel, false);
    });
  }
}

function closeAll(header) {
  header.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
    const panel = getPanel(header, trigger);
    if (panel) setPanel(trigger, panel, false);
  });
  if (header.querySelector("[data-nav-panel].is-open")) setDrawer(header, false);
}

// ---------- Nav au scroll : part avec la page, revient quand on remonte ----------
// La nav est en position sticky (réglée dans Webflow, classe navbar).
// - en haut de page : elle suit la page comme une nav normale (mode « flow ») ;
// - on remonte : elle redescend en glissant, fond blanc (.is-scrolled) ;
// - on redescend : elle se cache en glissant (.is-hidden).
// Jamais cachée si un menu est ouvert ou si le focus clavier est dedans.
// Le décalage utilise la propriété CSS « translate » (pas « transform », déjà
// utilisée par l'arrivée de la nav au chargement).

const SCROLL_THRESHOLD = 8; // px : fond blanc au-delà
const DIRECTION_DELTA = 6; // px de scroll dans un sens avant de changer d'état

function initScrollState(header) {
  let mode = "flow"; // "flow" | "shown" | "hidden"
  let lastY = window.scrollY;
  let travel = 0; // distance parcourue dans le sens courant
  let ticking = false;

  const locked = () =>
    header.querySelector("[data-mega-panel].is-open, [data-nav-panel].is-open") ||
    header.contains(document.activeElement) ||
    document.documentElement.classList.contains("is-hero-intro-running");

  const apply = () => {
    const y = Math.max(window.scrollY, 0);
    const height = header.offsetHeight;
    header.classList.toggle("is-flow", mode === "flow");
    header.classList.toggle("is-hidden", mode === "hidden");
    // Fond blanc seulement quand elle est revenue en cours de page
    header.classList.toggle("is-scrolled", mode !== "flow" && y > SCROLL_THRESHOLD);
    header.style.translate = mode === "flow" ? `0 ${-Math.min(y, height)}px` : "";
  };

  const update = () => {
    ticking = false;
    const y = Math.max(window.scrollY, 0);
    const dy = y - lastY;
    lastY = y;
    if (dy !== 0) travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;

    if (y <= 0) mode = "flow";
    else if (locked()) mode = mode === "flow" && y < header.offsetHeight ? "flow" : "shown";
    else if (travel < -DIRECTION_DELTA && mode !== "shown") mode = y > 0 ? "shown" : "flow";
    else if (travel > DIRECTION_DELTA && mode === "shown") mode = "hidden";
    apply();
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  // Menu ouvert / focus dans la nav : elle réapparaît
  header.addEventListener("focusin", schedule);
  header.addEventListener("click", schedule);

  // Page rechargée au milieu : nav visible
  if (window.scrollY > header.offsetHeight) mode = "shown";
  apply();
}

// ---------- Hauteur de la nav (variable CSS --nav-height sur <html>) ----------
// Sert aux heros qui passent sous la nav transparente (variante Événementiel).

function initNavHeight(header) {
  const update = () => {
    document.documentElement.style.setProperty("--nav-height", `${header.offsetHeight}px`);
  };
  update();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(update).observe(header);
}

// ---------- Page courante ----------

function normalizePath(path) {
  return path.replace(/\/+$/, "") || "/";
}

function markCurrentLinks(header) {
  const current = normalizePath(location.pathname);
  header.querySelectorAll("a[href]").forEach((link) => {
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.hash) return;
    const path = normalizePath(url.pathname);
    if (path === "/") return; // le logo ne compte pas
    // Lien exact, ou section parente (ex. /blog pour /blog/mon-article)
    if (current === path || current.startsWith(`${path}/`)) {
      link.setAttribute("aria-current", current === path ? "page" : "true");
    }
  });
}
