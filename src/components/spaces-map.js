// src/components/spaces-map.js — module « carte des espaces » (MapLibre + OpenFreeMap).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-map-module]                 le module (liste à gauche, carte à droite)
//     [data-map-list]                 colonne liste
//       [data-map-count]              « 14 espaces »
//       [data-map-list-toggle]        « Masquer la liste » (2e span = libellé)
//       [data-space-list]             liste CMS des espaces : a[data-space][data-lat]…
//         [data-space-time]           distance / temps (rempli par le JS)
//         [data-space-time-label]     « à vol d'oiseau » / « en transports »
//     [data-map]                      zone carte (img de repli .map-module_bg)
//       [data-place-card]             fiche au-dessus du pin (data-place-*)
//       [data-map-zoom-in] [data-map-zoom-out] [data-map-reset]
//       [data-map-attribution]
//
// ÉVÉNEMENTS reçus (envoyés par space-search.js sur le module) :
//   "spaces:origin"  detail { lat, lng, label, isUser }  -> tri par distance
//   "spaces:select"  detail { slug }                     -> sélectionne un espace
//   "spaces:type"    detail { type: "bureaux"|"salles" } -> filtre les espaces
// Paramètres d'URL lus au chargement : ?lat=&lng=&q=&type=&espace=
//
// ÉTATS : .is-active (élément de liste et pin), .is-open (fiche),
// .is-map-ready (module, carte affichée), .is-list-hidden (module).

import { loadMapLibre, STYLE_URL, applyTheme, PIN_SVG, escapeHtml } from "../utils/map-base.js";
import { distanceKm, formatDistance } from "../utils/geo.js";
import { readSpaces } from "../utils/spaces-data.js";
import { loadStations, nearestStations, renderLines } from "../utils/stations.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { t } from "../utils/i18n.js";
import { initScrollZone } from "../utils/scroll-zone.js";
import { createScrollIndicator } from "../utils/scroll-indicator.js";
import { getLenis } from "../core/core.js";
import { createPlaceCarousel } from "./place-carousel.js";

const PIN_STAGGER = 70; // ms entre deux pins à l'apparition

const DESKTOP = window.matchMedia("(min-width: 992px)");
const NEAREST_COUNT = 3; // espaces mis en avant dans « Les plus proches de… »
const LIST_MARGIN = 16; // px d'air autour de l'espace choisi quand la liste défile jusqu'à lui


export function initSpacesMap(root = document) {
  root.querySelectorAll("[data-map-module]").forEach(initModule);
}

// Commandes de la carte posées en liens « # » dans Webflow : annoncées comme
// boutons aux lecteurs d'écran, activables aussi avec la touche Espace
const CONTROLS =
  "[data-map-list-toggle], [data-place-close], [data-place-prev], [data-place-next], [data-map-zoom-in], [data-map-zoom-out], [data-map-reset]";

function asButton(el) {
  if (el.tagName !== "A") return;
  el.setAttribute("role", "button");
  el.addEventListener("keydown", (e) => {
    if (e.key !== " ") return;
    e.preventDefault();
    el.click();
  });
}

function initModule(module) {
  module.querySelectorAll(CONTROLS).forEach(asButton);

  // La colonne défile seule sous la souris (sauf si la page est en train de
  // défiler, cf. utils/scroll-zone.js), même quand la liste n'est pas encore
  // reliée au CMS
  const column = module.querySelector("[data-map-list]");
  initScrollZone(column);
  if (column) initStickyHead(column);

  const list = module.querySelector("[data-space-list]");
  const mapEl = module.querySelector("[data-map]");
  const spaces = readSpaces(module);
  if (!spaces.length) return;

  // Onglet de départ : data-map-tab="salles" sur le module (page Événementiel)
  const startType = module.getAttribute("data-map-tab") === "salles" ? "salles" : "bureaux";
  const state = { origin: null, active: null, type: startType, map: null, markers: new Map(), originMarker: null };
  const card = module.querySelector("[data-place-card]");
  const carousel = createPlaceCarousel(card);

  // ---------- Liste : tri, groupes, distances ----------

  function visibleSpaces() {
    return state.type === "salles" ? spaces.filter((s) => s.rooms) : spaces;
  }

  function renderList() {
    if (!list) return;
    const shown = visibleSpaces();
    // Distances depuis le point de recherche
    spaces.forEach((s) => {
      s.distance = state.origin ? distanceKm(state.origin, s) : null;
      const time = s.el.querySelector("[data-space-time]");
      const label = s.el.querySelector("[data-space-time-label]");
      if (time) time.textContent = s.distance != null ? formatDistance(s.distance) : "";
      if (label) label.textContent = s.distance != null ? t("map.distance") : "";
      s.el.closest("[role='listitem'], .w-dyn-item")?.toggleAttribute("hidden", !shown.includes(s));
    });

    // Ordre : par distance si une recherche est faite, sinon ordre CMS
    const ordered = state.origin ? [...shown].sort((a, b) => a.distance - b.distance) : shown;

    // Groupes : « Les plus proches de… » puis par département
    list.querySelectorAll("[data-map-group]").forEach((g) => g.remove());
    const groups = [];
    let rest = ordered;
    if (state.origin) {
      const place = state.origin.label;
      // « de Clichy » mais « d'Asnières » (élision devant voyelle ou h muet)
      const of = /^[aeiouyhàâäéèêëîïôöûü]/i.test(place) ? `d’${place}` : `de ${place}`;
      const title = state.origin.isUser ? t("map.nearestMe") : t("map.nearest", { place, of });
      groups.push({ title, items: ordered.slice(0, NEAREST_COUNT) });
      rest = ordered.slice(NEAREST_COUNT);
    }
    const byDept = new Map();
    rest.forEach((s) => {
      const key = s.dept || "";
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key).push(s);
    });
    byDept.forEach((items, dept) => {
      groups.push({ title: state.origin && dept ? t("map.others", { dept }) : dept, items });
    });

    // Réordonne les éléments CMS (on déplace leurs conteneurs) et insère les titres
    groups.forEach(({ title, items }) => {
      if (title) {
        const h = document.createElement("p");
        h.className = "map-module_group";
        h.setAttribute("data-map-group", "");
        h.textContent = title;
        list.appendChild(h);
      }
      items.forEach((s) => list.appendChild(s.el.closest(".w-dyn-item") || s.el));
    });

    const count = module.querySelector("[data-map-count]");
    if (count) count.textContent = shown.length === 1 ? t("map.countOne") : t("map.count", { n: shown.length });

    // Pins masqués selon le filtre
    state.markers.forEach((marker, slug) => {
      marker.getElement().hidden = !shown.some((s) => s.slug === slug);
    });
  }

  // ---------- Accès : gares proches (stations.json, open data IDFM) ----------
  // Pour chaque espace : lignes en pastilles + « Gare · 6 min à pied ».
  // La gare saisie dans le CMS (data-station) passe en premier si elle est proche.

  function accessText(space) {
    const first = space.access && space.access[0];
    return first ? t("map.walk", { station: first.name, min: first.walk }) : space.station;
  }

  // Remplace les pastilles et le texte d'accès dans un bloc (liste ou fiche)
  function paintAccess(container, textEl, space) {
    if (!container) return;
    container.querySelectorAll("[data-space-lines]").forEach((el) => el.remove());
    const lines = space.access ? renderLines(space.access) : null;
    if (lines) container.insertBefore(lines, textEl || container.firstChild);
    if (textEl) textEl.textContent = accessText(space);
  }

  function accessParts(root) {
    // data-space-access si posé dans Webflow, sinon le bloc d'accès de la carte
    const box = root.querySelector("[data-space-access]") || root.querySelector(".space-item_access");
    const text = box && (box.querySelector("[data-space-station]") || box.lastElementChild);
    return { box, text };
  }

  loadStations().then((stations) => {
    if (!stations.length) return;
    spaces.forEach((s) => {
      s.access = nearestStations(stations, s, { prefer: s.station });
      const { box, text } = accessParts(s.el);
      paintAccess(box, text, s);
    });
    if (state.active) fillCard(state.active);
  });

  // ---------- Sélection d'un espace ----------

  function select(slug, { fly = true } = {}) {
    const space = spaces.find((s) => s.slug === slug);
    state.active = space || null;
    spaces.forEach((s) => s.el.classList.toggle("is-active", s === space));
    state.markers.forEach((m, key) => m.getElement().classList.toggle("is-active", key === slug));
    if (!space) return closeCard();

    fillCard(space);
    if (fly && state.map) {
      const opts = { center: [space.lng, space.lat], zoom: Math.max(state.map.getZoom(), 12.5) };
      prefersReducedMotion() ? state.map.jumpTo(opts) : state.map.easeTo({ ...opts, duration: 700 });
    }
    // L'élément reste visible dans la liste, sous l'en-tête fixe (titre,
    // onglets, recherche) : on ne défile que s'il est caché ou coupé
    const scroller = module.querySelector("[data-map-list]");
    if (scroller && scroller.scrollHeight > scroller.clientHeight) {
      const head = scroller.querySelector(".map-module_head");
      const box = scroller.getBoundingClientRect();
      const item = space.el.getBoundingClientRect();
      const visibleTop = box.top + (head ? head.offsetHeight : 0) + LIST_MARGIN;
      const visibleBottom = box.bottom - LIST_MARGIN;
      let delta = 0;
      if (item.top < visibleTop) delta = item.top - visibleTop;
      else if (item.bottom > visibleBottom) delta = Math.min(item.top - visibleTop, item.bottom - visibleBottom);
      if (delta) scroller.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }

  function fillCard(space) {
    if (!card) return;
    const set = (sel, fn) => card.querySelectorAll(sel).forEach(fn);
    carousel.set(space.photos.length ? space.photos : [space.photo], space.name);
    set("[data-place-name]", (el) => (el.textContent = space.name));
    set("[data-place-building]", (el) => {
      el.textContent = space.building ? t("map.building", { name: space.building }) : "";
      el.hidden = !space.building;
    });
    set("[data-place-address]", (el) => {
      el.textContent = [space.address, [space.postcode, space.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    });
    set("[data-place-station]", (el) => {
      paintAccess(el.parentElement, el, space);
      el.hidden = !el.textContent;
    });
    set("[data-place-link]", (a) => a.setAttribute("href", space.url));
    set("[data-place-visit]", (a) => a.setAttribute("href", `/nous-contacter/?motif=visite&espace=${space.slug}`));
    card.setAttribute("aria-label", space.name);
    card.classList.add("is-open");
  }

  function closeCard() {
    card?.classList.remove("is-open");
  }

  card?.querySelector("[data-place-close]")?.addEventListener("click", (e) => {
    e.preventDefault();
    select(null);
  });

  // ---------- Liste : clics et survols ----------

  spaces.forEach((s) => {
    // Clic : affiche l'espace sur la carte ; re-clic : le désélectionne et
    // revient à la vue de départ (comme le pin). La fiche s'ouvre depuis la
    // carte de l'espace, ou au Cmd / Ctrl + clic (nouvel onglet).
    s.el.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || !DESKTOP.matches) return;
      e.preventDefault();
      if (state.active === s) {
        select(null);
        resetView();
      } else {
        select(s.slug);
      }
    });
    s.el.addEventListener("mouseenter", () => state.markers.get(s.slug)?.getElement().classList.add("is-hover"));
    s.el.addEventListener("mouseleave", () => state.markers.get(s.slug)?.getElement().classList.remove("is-hover"));
  });

  // ---------- Bouton « Masquer la liste » ----------

  const toggle = module.querySelector("[data-map-list-toggle]");
  const listEl = module.querySelector("[data-map-list]");


  // Bouton pour rouvrir la liste, posé sur la carte (visible seulement liste masquée)
  let reopen = null;
  if (toggle && mapEl) {
    reopen = document.createElement("button");
    reopen.type = "button";
    reopen.className = "map-list-open";
    reopen.innerHTML = '<span class="map-list-open_icon" aria-hidden="true"></span><span></span>';
    reopen.lastChild.textContent = t("map.showList");
    if (listEl) {
      listEl.id = listEl.id || `map-list-${Math.random().toString(36).slice(2, 8)}`;
      reopen.setAttribute("aria-controls", listEl.id);
      toggle.setAttribute("aria-controls", listEl.id);
    }
    reopen.setAttribute("aria-expanded", "false");
    mapEl.appendChild(reopen);
  }

  function setListHidden(hidden) {
    // Largeur de la colonne pour le glissement (CSS : margin-left négative)
    if (listEl) module.style.setProperty("--list-width", `${listEl.offsetWidth}px`);
    module.classList.toggle("is-list-hidden", hidden);
    toggle?.setAttribute("aria-expanded", String(!hidden));
    const label = toggle ? toggle.querySelectorAll("span") : [];
    if (label.length) label[label.length - 1].textContent = hidden ? t("map.showList") : t("map.hideList");
    resizeDuring(550); // la carte suit l'élargissement / le rétrécissement
    // Le focus suit le bouton visible (clavier)
    if (hidden) reopen?.focus();
    else toggle?.focus();
  }

  // Redimensionne la carte à chaque image pendant une animation de mise en page
  function resizeDuring(ms) {
    if (!state.map) return;
    const end = performance.now() + ms;
    const step = () => {
      state.map.resize();
      if (performance.now() < end) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  toggle?.addEventListener("click", (e) => {
    e.preventDefault();
    setListHidden(!module.classList.contains("is-list-hidden"));
  });
  reopen?.addEventListener("click", () => setListHidden(false));

  // ---------- Événements de la recherche ----------

  module.addEventListener("spaces:origin", (e) => setOrigin(e.detail));
  module.addEventListener("spaces:select", (e) => select(e.detail.slug));
  module.addEventListener("spaces:type", (e) => {
    state.type = e.detail.type === "salles" ? "salles" : "bureaux";
    renderList();
    if (state.active && !visibleSpaces().includes(state.active)) select(null);
    fitToSpaces();
  });

  function setOrigin(origin) {
    state.origin = origin && Number.isFinite(origin.lat) ? origin : null;
    renderList();
    updateOriginMarker();
    if (state.origin) {
      const nearest = [...visibleSpaces()].sort((a, b) => a.distance - b.distance)[0];
      if (nearest) select(nearest.slug, { fly: false });
      fitToOrigin();
    } else {
      fitToSpaces();
    }
  }

  // ---------- Carte (chargée quand elle approche de l'écran) ----------

  function fitToSpaces() {
    if (!state.map) return;
    const pts = visibleSpaces();
    if (!pts.length) return;
    const bounds = new window.maplibregl.LngLatBounds();
    pts.forEach((s) => bounds.extend([s.lng, s.lat]));
    state.map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: prefersReducedMotion() ? 0 : 600 });
  }

  // Cadre le point de recherche et les espaces les plus proches
  function fitToOrigin() {
    if (!state.map || !state.origin) return;
    const bounds = new window.maplibregl.LngLatBounds();
    bounds.extend([state.origin.lng, state.origin.lat]);
    [...visibleSpaces()]
      .sort((a, b) => a.distance - b.distance)
      .slice(0, NEAREST_COUNT)
      .forEach((s) => bounds.extend([s.lng, s.lat]));
    state.map.fitBounds(bounds, { padding: 80, maxZoom: 13.5, duration: prefersReducedMotion() ? 0 : 700 });
  }

  // Vue de départ : le point de recherche et les plus proches, sinon tous les espaces
  // Clic sur un pin : la page se recale pour que le module (liste + carte)
  // soit centré dans l'écran, sous la nav (ou collé sous la nav s'il est plus
  // grand que l'espace disponible)
  function centerModule() {
    const nav = document.querySelector("[data-nav]");
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const rect = module.getBoundingClientRect();
    const space = window.innerHeight - navHeight;
    const offset = navHeight + Math.max((space - rect.height) / 2, 0);
    const target = Math.max(rect.top + window.scrollY - offset, 0);
    if (Math.abs(target - window.scrollY) < 4) return;
    const instant = prefersReducedMotion();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: instant ? 0 : 0.8, immediate: instant, force: true });
    else window.scrollTo({ top: target, behavior: instant ? "auto" : "smooth" });
  }

  function resetView() {
    if (state.origin) fitToOrigin();
    else fitToSpaces();
  }

  function updateOriginMarker() {
    if (!state.map) return;
    state.originMarker?.remove();
    state.originMarker = null;
    if (!state.origin) return;
    const el = document.createElement("div");
    el.className = "map-origin";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", t("map.origin", { place: state.origin.label || t("search.nearMe") }));
    state.originMarker = new window.maplibregl.Marker({ element: el }).setLngLat([state.origin.lng, state.origin.lat]).addTo(state.map);
  }

  async function createMap() {
    const maplibregl = await loadMapLibre();
    if (!maplibregl) return;

    const canvas = document.createElement("div");
    canvas.className = "map-module_canvas";
    mapEl.prepend(canvas);

    const map = new maplibregl.Map({
      container: canvas,
      style: STYLE_URL,
      center: [2.3, 48.88],
      zoom: 10.5,
      attributionControl: false, // crédits affichés dans [data-map-attribution]
      scrollZoom: false, // la molette fait défiler la page, pas zoomer la carte (boutons + / − pour zoomer)
      cooperativeGestures: !DESKTOP.matches, // mobile : deux doigts pour bouger la carte
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    state.map = map;

    map.on("style.load", () => applyTheme(map));
    map.once("load", () => {
      module.classList.add("is-map-ready");
      fitToSpaces();
      updateOriginMarker();
      if (state.origin) fitToOrigin();
      if (state.active) select(state.active.slug);
      revealPinsWhenVisible();
    });

    // Pins des espaces
    spaces.forEach((s) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "map-pin";
      // En attente de l'apparition en cascade (revealPinsWhenVisible)
      if (!prefersReducedMotion()) el.classList.add("is-pending");
      el.setAttribute("aria-label", t("map.pin", { name: s.name }));
      el.innerHTML = `${PIN_SVG}<span class="map-pin_label">${escapeHtml(s.name)}</span>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        centerModule();
        // Re-clic sur le pin déjà choisi : on désélectionne et on revient à la vue de départ
        if (state.active && state.active.slug === s.slug) {
          select(null);
          resetView();
        } else {
          select(s.slug);
        }
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([s.lng, s.lat]).addTo(map);
      state.markers.set(s.slug, marker);
    });
    renderList();
    if (state.active) select(state.active.slug, { fly: false });

    // Pins qui « poppent » les uns après les autres, dans un ordre aléatoire,
    // une fois la carte chargée ET à l'écran (elle se charge 400 px avant)
    function revealPinsWhenVisible() {
      const pending = [...state.markers.values()]
        .map((m) => m.getElement())
        .filter((el) => el.classList.contains("is-pending"));
      if (!pending.length) return;
      // Mélange (Fisher-Yates)
      for (let i = pending.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pending[i], pending[j]] = [pending[j], pending[i]];
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          pending.forEach((el, i) => {
            el.style.setProperty("--pin-delay", `${i * PIN_STAGGER}ms`);
            el.classList.replace("is-pending", "is-popping");
            // Animation finie : on retire la classe (le survol reprend la main)
            el.querySelector(".map-pin_shape")?.addEventListener(
              "animationend",
              () => el.classList.remove("is-popping"),
              { once: true },
            );
          });
        },
        { threshold: 0.3 },
      );
      io.observe(mapEl);
    }

    // Contrôles Webflow
    const on = (sel, fn) =>
      module.querySelector(sel)?.addEventListener("click", (e) => {
        e.preventDefault();
        fn();
      });
    on("[data-map-zoom-in]", () => map.zoomIn());
    on("[data-map-zoom-out]", () => map.zoomOut());
    on("[data-map-reset]", () => {
      select(null);
      fitToSpaces();
    });

    const attribution = module.querySelector("[data-map-attribution]");
    if (attribution) attribution.textContent = t("map.attribution");
  }

  if (mapEl) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        createMap().catch((err) => console.warn("[Work'n'Share] carte indisponible :", err));
      },
      { rootMargin: "400px" },
    );
    io.observe(mapEl);
  }

  // ---------- État de départ (paramètres d'URL venus de la recherche du hero) ----------

  closeCard();
  const params = new URLSearchParams(location.search);
  if (params.get("type") === "salles") state.type = "salles";
  const lat = parseFloat(params.get("lat"));
  const lng = parseFloat(params.get("lng"));
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    setOrigin({ lat, lng, label: params.get("q") || "", isUser: params.get("me") === "1" });
  } else {
    renderList();
  }
  if (params.get("espace")) select(params.get("espace"), { fly: false });

  // Expose l'état pour la recherche (tab actif, espaces)
  module._spacesMap = { spaces, state };
}

// En-tête fixe de la colonne : titre, onglets + recherche, compteur restent en
// haut pendant que les espaces défilent dessous. Les éléments Webflow placés
// avant la liste sont regroupés dans un bloc collant (.map-module_head), qui
// reprend le fond et les marges de la colonne pour masquer ce qui passe dessous.
function initStickyHead(column) {
  const listWrap = column.querySelector("[data-space-list]")?.closest(".w-dyn-list") || column.querySelector(".space-item")?.parentElement;
  const children = [...column.children];
  const stop = listWrap ? children.indexOf(listWrap.closest(`[data-map-list] > *`) || listWrap) : -1;
  const headItems = children.slice(0, stop > 0 ? stop : 0).filter((el) => !el.matches(".map-module_group, [data-map-group]"));
  if (!headItems.length) return;

  const head = document.createElement("div");
  head.className = "map-module_head";
  column.insertBefore(head, headItems[0]);
  headItems.forEach((el) => head.appendChild(el));

  // Marges et fond de la colonne (réglés dans Webflow) recopiés sur le bloc
  const apply = () => {
    const cs = getComputedStyle(column);
    const gap = parseFloat(cs.rowGap) || 0;
    head.style.margin = `-${cs.paddingTop} -${cs.paddingRight} 0 -${cs.paddingLeft}`;
    // Le collant se cale sur la marge intérieure de la colonne : on le remonte d'autant
    head.style.top = `-${cs.paddingTop}`;
    head.style.padding = `${cs.paddingTop} ${cs.paddingRight} ${gap}px ${cs.paddingLeft}`;
    head.style.rowGap = `${gap}px`;
    head.style.backgroundColor = cs.backgroundColor;
  };
  apply();
  window.addEventListener("resize", apply, { passive: true });

  // Barre de défilement maison, sous l'en-tête (la barre native est masquée)
  createScrollIndicator(column, head);

  // Fine ligne sous l'en-tête dès que la liste a défilé
  column.addEventListener(
    "scroll",
    () => head.classList.toggle("is-stuck", column.scrollTop > 4),
    { passive: true },
  );
}
