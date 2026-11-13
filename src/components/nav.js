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
// .is-nav-open sur <html> quand le tiroir ou le mega menu est ouvert (scroll bloqué),
// .is-visible sur le voile (.nav-veil, créé par le JS) derrière le mega menu,
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
import { prefersReducedMotion } from "../utils/motion.js";

// Nav desktop à partir de 1200 px : en dessous, les liens + boutons ne tiennent
// plus sur une ligne, on passe au burger (même valeur que _mega-menu.scss).
const DESKTOP_QUERY = window.matchMedia("(min-width: 1200px)");
const HOVER_QUERY = window.matchMedia("(hover: hover) and (pointer: fine)");
const HOVER_CLOSE_DELAY = 250; // ms avant fermeture quand la souris sort

// Burger : 3 traits (haut, milieu, bas), animés en croix par le CSS
// (_mega-menu.scss) selon aria-expanded du bouton
const SVG_NS = "http://www.w3.org/2000/svg";
const BURGER_LINES = ["top", "middle", "bottom"];

export function initNav(root = document) {
  const header = root.querySelector("[data-nav]");
  if (!header) return;

  initSkipLink(header);
  initMegaPanels(header);
  initDrawer(header);
  initScrollState(header);
  initNavHeight(header);
  initNavPill(header);
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

// ---------- Lien d'évitement « Aller au contenu » ----------
// Premier élément atteint au clavier (Tab) : saute la nav et mène au premier
// bloc qui suit le header. Caché tant qu'il n'a pas le focus (_mega-menu.scss).
function initSkipLink(header) {
  const target = header.nextElementSibling;
  if (!target || document.querySelector(".skip-link")) return;
  if (!target.id) target.id = "contenu";
  target.setAttribute("tabindex", "-1"); // reçoit le focus sans entrer dans l'ordre Tab
  const link = document.createElement("a");
  link.className = "skip-link";
  link.href = `#${target.id}`;
  link.textContent = t("nav.skip");
  link.addEventListener("click", () => requestAnimationFrame(() => target.focus({ preventScroll: true })));
  document.body.prepend(link);
}

// ---------- Panneaux (mega menu desktop + accordéon mobile) ----------

function getPanel(header, trigger) {
  const name = trigger.getAttribute("data-mega-trigger");
  return header.querySelector(`[data-mega-panel="${name}"]`);
}

function setPanel(trigger, panel, open) {
  trigger.setAttribute("aria-expanded", String(open));
  // Accordéon du tiroir mobile : ouverture / fermeture animées
  if (panel.closest("[data-nav-panel]")) animateAccordion(panel, open);
  else {
    showPanel(panel, open);
    syncScrollLock(panel.closest("[data-nav]"));
  }
}

// ---------- Blocage du scroll de la page ----------
// Scroll bloqué tant que le tiroir mobile ou un mega menu desktop est ouvert
// (ou en train de s'ouvrir) ; débloqué dès le début de la fermeture.
let scrollLocked = false;

function syncScrollLock(header) {
  if (!header) return;
  const panels = header.querySelectorAll("[data-nav-panel], [data-mega-panel]");
  const open = [...panels].some((panel) => !panel.closest("[data-nav-panel] [data-mega-panel]") && isPanelOpen(panel));
  // Voile sur la page : mega menu desktop seulement (le tiroir couvre déjà l'écran)
  const megaOpen = [...header.querySelectorAll("[data-mega-panel]")].some(
    (panel) => !panel.closest("[data-nav-panel]") && isPanelOpen(panel),
  );
  setVeil(header, megaOpen);
  if (open === scrollLocked) return;
  scrollLocked = open;
  document.documentElement.classList.toggle("is-nav-open", open);
  const lenis = getLenis();
  if (lenis) open ? lenis.stop() : lenis.start();
}

// ---------- Ouverture / fermeture du mega menu et du tiroir ----------
// Le panneau glisse depuis le bas de la nav (translation seule, gérée par la
// carte graphique) en passant SOUS la nav : un cache blanc couvre toute la
// hauteur de la nav pendant qu'un menu est ouvert (_mega-menu.scss). Pas de
// clip-path : animé à part, il se décalait de la translation aux premières
// images (bande du panneau visible par-dessus la nav). Fermeture : le même
// mouvement à l'envers. Un clic pendant l'animation la fait repartir dans l'autre sens.
// .is-open reste posé jusqu'à la fin de la fermeture (fond blanc de la nav).

const PANEL_DURATION = 450; // ms
const PANEL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const PANEL_FRAMES = [{ transform: "translateY(-100%)" }, { transform: "translateY(0)" }];
const panelAnims = new WeakMap(); // panneau -> { anim, open }

function showPanel(panel, open) {
  const state = panelAnims.get(panel);
  if (state) {
    // Animation en cours : on repart dans l'autre sens depuis là où elle en est
    if (state.open !== open) {
      state.open = open;
      state.anim.reverse();
    }
    return;
  }
  if (panel.classList.contains("is-open") === open) return;
  panel.classList.add("is-open");
  if (prefersReducedMotion() || getComputedStyle(panel).display === "none") {
    panel.classList.toggle("is-open", open);
    return;
  }
  // fill "forwards" : l'état final reste affiché jusqu'au retrait de .is-open
  // (sinon le panneau réapparaît ouvert une image avant de disparaître)
  const anim = panel.animate(PANEL_FRAMES, {
    duration: PANEL_DURATION,
    easing: PANEL_EASE,
    direction: open ? "normal" : "reverse",
    fill: "forwards",
  });
  const entry = { anim, open };
  panelAnims.set(panel, entry);
  anim.onfinish = () => {
    panelAnims.delete(panel);
    if (!entry.open) panel.classList.remove("is-open");
    anim.cancel();
  };
}

// Panneau ouvert (ou en train de s'ouvrir), hors fermeture en cours
function isPanelOpen(panel) {
  const state = panelAnims.get(panel);
  return state ? state.open : panel.classList.contains("is-open");
}

// ---------- Accordéon du tiroir (« Nos espaces ») ----------
// Le panneau se déplie en hauteur : sa bordure du bas (le trait sous l'entrée,
// cf. _mega-menu.scss) descend avec lui et révèle les liens ; à la fermeture,
// elle remonte jusqu'à l'entrée. .is-open reste posé jusqu'à la fin de la
// fermeture. Sans animation si l'utilisateur a réduit les animations.

const ACCORDION_DURATION = 450; // ms
const ACCORDION_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const accordionAnims = new WeakMap();

function animateAccordion(panel, open) {
  const running = accordionAnims.get(panel);
  const wasShown = panel.classList.contains("is-open");
  if (!running && wasShown === open) return;

  // Point de départ : hauteur actuelle (au milieu d'une animation, ou fermé)
  const border = parseFloat(getComputedStyle(panel).borderBottomWidth) || 0;
  const collapsed = { height: `${border}px`, paddingBottom: "0px" };
  const from = wasShown
    ? { height: `${panel.getBoundingClientRect().height}px`, paddingBottom: getComputedStyle(panel).paddingBottom }
    : collapsed;
  if (running) running.cancel();
  accordionAnims.delete(panel);

  panel.classList.add("is-open");
  if (prefersReducedMotion()) {
    panel.classList.toggle("is-open", open);
    return;
  }
  // Hauteur dépliée (mesurée sans animation)
  const expanded = { height: `${panel.getBoundingClientRect().height}px`, paddingBottom: getComputedStyle(panel).paddingBottom };

  panel.style.overflow = "hidden";
  // fill "forwards" : l'état final reste affiché jusqu'au retrait de .is-open
  // (sinon le panneau réapparaît déplié une image avant de disparaître)
  const anim = panel.animate([from, open ? expanded : collapsed], {
    duration: ACCORDION_DURATION,
    easing: ACCORDION_EASE,
    fill: "forwards",
  });
  accordionAnims.set(panel, anim);
  anim.onfinish = () => {
    accordionAnims.delete(panel);
    panel.style.overflow = "";
    if (!open) panel.classList.remove("is-open");
    anim.cancel();
  };
}

function initMegaPanels(header) {
  header.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
    const panel = getPanel(header, trigger);
    if (!panel) return;

    // Les liens sans href ne réagissent pas à Entrée / Espace : on le gère
    trigger.setAttribute("aria-expanded", "false");
    const toggle = () => setPanel(trigger, panel, trigger.getAttribute("aria-expanded") !== "true");

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
        if (isPanelOpen(panel) && !panel.matches(":hover")) setPanel(trigger, panel, false);
      }
    });
  });
}

// ---------- Voile derrière le mega menu ----------
// Vert 900 à 50 % sur toute la page, sous la nav (_mega-menu.scss). Placé juste
// après le header : un clic dessus est un clic hors du header, qui ferme tout.

let veil = null;

function setVeil(header, open) {
  if (!veil) {
    if (!open) return;
    veil = document.createElement("div");
    veil.className = "nav-veil";
    veil.setAttribute("aria-hidden", "true");
    header.after(veil);
  }
  if (open) {
    // Juste sous la nav : même contexte d'empilement, un cran en dessous
    let z = parseInt(getComputedStyle(header).zIndex, 10);
    if (Number.isNaN(z)) {
      z = 100;
      header.style.zIndex = String(z);
    }
    veil.style.zIndex = String(z - 1);
  }
  veil.classList.toggle("is-visible", open);
}

// ---------- Tiroir mobile ----------

function initDrawer(header) {
  const toggle = header.querySelector("[data-nav-toggle]");
  const drawer = header.querySelector("[data-nav-panel]");
  if (!toggle || !drawer) return;

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", t("nav.open"));
  buildBurgerIcon(toggle);
  // Le tiroir défile seul : Lenis ne doit pas capter sa molette / son tactile
  drawer.setAttribute("data-lenis-prevent", "");
  // Barre de défilement maison (la même que la liste de la carte)
  createScrollIndicator(drawer);

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    setDrawer(header, !isPanelOpen(drawer));
  });
  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDrawer(header, !isPanelOpen(drawer));
    }
  });

  // Tab bloqué entre le burger et le tiroir quand il est ouvert
  header.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !isPanelOpen(drawer)) return;
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

// Remplace le tracé unique du burger (3 traits dans un seul path) par 3 paths
// séparés, que le CSS peut déplacer et tourner un par un.
function buildBurgerIcon(toggle) {
  const svg = toggle.querySelector("svg");
  if (!svg) return;
  svg.querySelectorAll("path").forEach((path) => path.remove());
  BURGER_LINES.forEach((name, i) => {
    const line = document.createElementNS(SVG_NS, "path");
    line.setAttribute("d", `M4 ${7 + i * 5}h16`);
    line.setAttribute("class", `navbar_burger-line is-${name}`);
    svg.append(line);
  });
}

function setDrawer(header, open) {
  const toggle = header.querySelector("[data-nav-toggle]");
  const drawer = header.querySelector("[data-nav-panel]");
  if (!toggle || !drawer) return;

  showPanel(drawer, open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", t(open ? "nav.close" : "nav.open"));

  // Scroll de la page bloqué pendant que le tiroir est ouvert
  syncScrollLock(header);

  // Fermeture : on referme aussi l'accordéon du tiroir, sans animation, une
  // fois le tiroir effacé (sinon les deux bougent en même temps)
  if (!open) {
    drawer.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
      const panel = getPanel(header, trigger);
      if (!panel) return;
      trigger.setAttribute("aria-expanded", "false");
      setTimeout(() => {
        if (trigger.getAttribute("aria-expanded") === "true") return; // rouvert entre-temps
        const running = accordionAnims.get(panel);
        if (running) running.cancel();
        accordionAnims.delete(panel);
        panel.style.overflow = "";
        panel.classList.remove("is-open");
      }, PANEL_DURATION);
    });
  }
}

function closeAll(header) {
  header.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
    // Accordéon du tiroir : refermé avec le tiroir (setDrawer)
    if (trigger.closest("[data-nav-panel]")) return;
    const panel = getPanel(header, trigger);
    if (panel) setPanel(trigger, panel, false);
  });
  const drawer = header.querySelector("[data-nav-panel]");
  if (drawer && isPanelOpen(drawer)) setDrawer(header, false);
}

// ---------- Nav au scroll : part avec la page, revient quand on remonte ----------
// La nav est en position sticky (réglée dans Webflow, classe navbar).
// - en haut de page : elle suit la page comme une nav normale (mode « flow ») ;
// - on remonte : elle redescend en glissant, fond blanc (.is-scrolled) ;
// - on redescend : elle se cache en glissant (.is-hidden).
// Jamais cachée si un menu est ouvert ou si le focus clavier est dedans.
// Page avec hero vidéo (accueil) : dans le hero, la nav n'est jamais fixe, même
// en remontant. Elle repart cachée et ne revient qu'en haut de page.
// Le décalage utilise la propriété CSS « translate » (pas « transform », déjà
// utilisée par l'arrivée de la nav au chargement).

const SCROLL_THRESHOLD = 8; // px : fond blanc au-delà
const DIRECTION_DELTA = 6; // px de scroll dans un sens avant de changer d'état

function initScrollState(header) {
  let mode = "flow"; // "flow" | "shown" | "hidden"
  let lastY = window.scrollY;
  let travel = 0; // distance parcourue dans le sens courant
  let ticking = false;

  // Hero de la page : [data-hero-video] (accueil) ou [data-hero], sinon la
  // première section. Tant qu'on y est, la nav n'est pas fixe. Une première
  // section très haute ou avec un formulaire (ex. Nous contacter) n'est pas
  // un hero : la nav y redevient fixe normalement.
  const hero =
    document.querySelector("[data-hero-video], [data-hero]") ||
    [...document.querySelectorAll("main section, .page-wrapper section")].find((s) => !header.contains(s));
  const isHero = () =>
    !!hero &&
    (hero.matches("[data-hero-video], [data-hero]") ||
      (hero.offsetHeight <= window.innerHeight * 1.2 && !hero.querySelector("form")));
  const inHero = (y) => isHero() && y < hero.getBoundingClientRect().bottom + y - header.offsetHeight;

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
    // Nav fixe et visible en cours de page : les éléments collants (sommaire
    // des articles) se placent dessous (html.is-nav-shown, _post-body.scss)
    document.documentElement.classList.toggle("is-nav-shown", mode === "shown");
  };

  const update = () => {
    ticking = false;
    const y = Math.max(window.scrollY, 0);
    const dy = y - lastY;
    lastY = y;
    if (dy !== 0) travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;

    if (y <= 0) mode = "flow";
    else if (inHero(y) && !locked()) {
      // Dans le hero : la nav suit la page (flow) ; si elle était revenue fixe,
      // elle se cache en glissant, puis repasse en flow tout en haut
      mode = mode === "flow" || y < header.offsetHeight ? "flow" : "hidden";
    }
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

// ---------- Pastille de survol qui glisse d'un lien à l'autre ----------
// Une seule pastille (.navbar_pill, créée ici) derrière les liens du menu
// desktop : elle glisse vers le lien survolé ou focus, reste sur « Nos espaces »
// tant que son mega menu est ouvert, et disparaît en fondu quand on quitte le
// menu. Couleur : variable --nav-pill (selon le thème, _mega-menu.scss).

function initNavPill(header) {
  const menu = header.querySelector(".navbar_menu");
  const links = menu ? [...menu.querySelectorAll(".navbar_link")] : [];
  if (!links.length) return;

  const pill = document.createElement("span");
  pill.className = "navbar_pill";
  pill.setAttribute("aria-hidden", "true");
  menu.prepend(pill);
  menu.classList.add("has-pill");

  let target = null; // lien sous la pastille

  const place = (link) => {
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.height = `${link.offsetHeight}px`;
    pill.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
  };

  const show = (link) => {
    if (!link || !link.offsetWidth) return;
    if (!pill.classList.contains("is-visible")) {
      // Arrivée depuis l'extérieur : posée sur place, sans glisser
      pill.classList.add("is-instant");
      place(link);
      pill.getBoundingClientRect();
      pill.classList.remove("is-instant");
      pill.classList.add("is-visible");
    } else {
      place(link);
    }
    links.forEach((l) => l.classList.toggle("is-pill", l === link));
    target = link;
  };

  // Lien à garder sous la pastille au repos : déclencheur du mega menu ouvert
  const restingLink = () => links.find((l) => l.getAttribute("aria-expanded") === "true");

  const rest = () => {
    const link = restingLink();
    if (link) return show(link);
    pill.classList.remove("is-visible");
    links.forEach((l) => l.classList.remove("is-pill"));
    target = null;
  };

  links.forEach((link) => {
    link.addEventListener("pointerenter", () => show(link));
    link.addEventListener("focus", () => show(link));
  });
  menu.addEventListener("pointerleave", rest);
  menu.addEventListener("focusout", (e) => {
    if (!menu.contains(e.relatedTarget)) rest();
  });

  // Mega menu ouvert / fermé (aria-expanded du déclencheur) : on suit
  const observer = new MutationObserver(() => {
    if (!menu.matches(":hover")) rest();
  });
  links.forEach((l) => observer.observe(l, { attributes: true, attributeFilter: ["aria-expanded"] }));

  // Taille des liens qui change (police chargée, redimensionnement)
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => target && place(target)).observe(menu);
  }
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
