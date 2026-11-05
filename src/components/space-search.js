// src/components/space-search.js — recherche de proximité avec suggestions.
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-search]                     bloc recherche (hero ou module carte)
//     [data-search-tab="bureaux|salles"]  onglets (role="tab")
//     [data-search-form]              formulaire Webflow (envoi bloqué par le JS)
//       [data-search-input]           champ texte
//
// Suggestions (liste créée par le JS sous le champ, classes search_suggest*) :
//   « Autour de moi » (géolocalisation), nos espaces (lus dans la page),
//   gares et stations (stations.json, open data IDFM), adresses et communes
//   (API Adresse de l'État, Géoplateforme, gratuite et sans clé).
//
// Dans un module carte : envoie des événements au module (voir spaces-map.js).
// Ailleurs (hero) : redirige vers /espaces (page Nos espaces) avec la recherche dans l'URL.

import { normalize, isInIdf } from "../utils/geo.js";
import { readSpaces } from "../utils/spaces-data.js";
import { loadStations, renderLines } from "../utils/stations.js";
import { createTabIndicator } from "../utils/tab-indicator.js";
import { t } from "../utils/i18n.js";
import { createScrollIndicator } from "../utils/scroll-indicator.js";
import { getLenis } from "../core/core.js";
import { prefersReducedMotion } from "../utils/motion.js";

const MAP_PAGE = "/espaces";
const GEOCODER = "https://data.geopf.fr/geocodage/completion/";
const DEBOUNCE = 220; // ms
const MAX = { spaces: 4, stations: 4, addresses: 4 };

let uid = 0;
const MIN_PANEL_HEIGHT = 160; // px : en dessous, la liste garde au moins 3 lignes visibles
const MAX_PANEL_HEIGHT = 420; // px, hauteur maximale de la liste de suggestions

// « Hauts-de-Seine » -> « Hauts-de-Seine · 92 » (titres de groupe des suggestions)
const DEPT_CODES = {
  paris: "75",
  "seine et marne": "77",
  yvelines: "78",
  essonne: "91",
  "hauts de seine": "92",
  "seine saint denis": "93",
  "val de marne": "94",
  "val d oise": "95",
};
function deptTitle(dept) {
  if (!dept) return "";
  const code = DEPT_CODES[normalize(dept)];
  return code ? `${dept} · ${code}` : dept;
}

export function initSpaceSearch(root = document) {
  root.querySelectorAll("[data-search]").forEach(initSearch);
}

function initSearch(block) {
  const input = block.querySelector("[data-search-input]");
  const form = block.querySelector("[data-search-form]");
  if (!input) return;

  const module = block.closest("[data-map-module]");
  const spaces = readSpaces(document);
  const id = `search-suggest-${++uid}`;
  let type = block.querySelector("[data-search-tab].is-active")?.getAttribute("data-search-tab") || "bureaux";
  let options = [];
  let activeIndex = -1;
  let timer = null;
  let requestId = 0;

  // ---------- Liste de suggestions (accessibilité : combobox) ----------
  const panel = document.createElement("div");
  panel.className = "search_suggest";
  panel.id = id;
  panel.setAttribute("role", "listbox");
  panel.hidden = true;
  panel.setAttribute("data-lenis-prevent", ""); // la liste défile seule sous la souris
  // La liste est rattachée au <body> et placée sous le champ : le hero (photo à
  // coins arrondis) et la colonne du module carte coupent ce qui dépasse.
  document.body.appendChild(panel);
  // Barre de défilement maison (la même que la liste de la carte)
  const scrollbar = createScrollIndicator(panel);
  const anchor = form || input;

  function place() {
    if (panel.hidden) return;
    const rect = anchor.getBoundingClientRect();
    panel.style.top = `${rect.bottom + window.scrollY + 12}px`;
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.width = `${rect.width}px`;
    // Hauteur limitée : MAX_PANEL_HEIGHT au plus, et jamais hors de l'écran
    // (place sous le champ, 16 px de marge en bas), défilement interne au-delà
    const available = window.innerHeight - (rect.bottom + 12) - 16;
    panel.style.maxHeight = `${Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, available))}px`;
    scrollbar?.update();
  }

  let placing = false;
  const schedulePlace = () => {
    if (placing || panel.hidden) return;
    placing = true;
    requestAnimationFrame(() => {
      placing = false;
      place();
    });
  };
  window.addEventListener("resize", schedulePlace, { passive: true });
  // Défilement de la page ou d'une colonne (capture : tous les conteneurs)
  document.addEventListener("scroll", schedulePlace, { passive: true, capture: true });

  const live = document.createElement("div");
  live.className = "search_status";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  block.appendChild(live);

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", id);
  input.setAttribute("autocomplete", "off");

  // ---------- Onglets Bureaux / Salles (fond glissant comme « Quelle formule ») ----------
  const tabs = [...block.querySelectorAll("[data-search-tab]")];
  let currentTab = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
  const indicator = tabs.length
    ? createTabIndicator(tabs[0].parentElement, { getActive: () => currentTab, className: "search_indicator" })
    : null;

  function selectTab(tab, { focus = false } = {}) {
    currentTab = tab;
    type = tab.getAttribute("data-search-tab");
    tabs.forEach((other) => {
      const on = other === tab;
      other.classList.toggle("is-active", on);
      other.setAttribute("aria-selected", String(on));
      other.setAttribute("tabindex", on ? "0" : "-1");
    });
    indicator?.move();
    if (focus) tab.focus();
    module?.dispatchEvent(new CustomEvent("spaces:type", { detail: { type } }));
  }

  tabs.forEach((tab, index) => {
    tab.setAttribute("tabindex", tab === currentTab ? "0" : "-1");
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation(); // pas de gestionnaire de clic Webflow (lien href="#")
      if (tab !== currentTab) selectTab(tab);
    });
    // Clavier : flèches gauche / droite (modèle d'onglets ARIA)
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = tabs[(index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      selectTab(next, { focus: true });
    });
  });

  // ---------- Saisie ----------
  input.addEventListener("focus", () => {
    loadStations();
    openHero();
    update();
  });

  // ---------- Hero de l'accueil : la recherche remonte au focus ----------
  // [data-hero-video] (maquette 4696:13924) : au clic dans le champ, l'accroche
  // et le titre (bloc juste avant la recherche) sont réduits de moitié et tout
  // le contenu remonte, pour laisser la place aux suggestions en dessous.
  const hero = module ? null : block.closest("[data-hero-video]");
  const heading = hero ? block.previousElementSibling : null;
  const content = heading ? heading.parentElement : null;
  heading?.setAttribute("data-hero-heading", "");
  content?.setAttribute("data-hero-content", "");
  const HERO_TOP_OFFSET = 56; // px entre le haut du hero et le titre réduit
  const HEADING_SCALE = 0.5; // titre 64 -> 32 px, accroche 12 -> 6 px

  function openHero() {
    if (!hero || hero.classList.contains("is-searching")) return;
    const heroTop = hero.getBoundingClientRect().top;
    const h = heading.getBoundingClientRect();
    // Le titre est réduit depuis son bas : son haut visible descend de h × (1 - échelle)
    const visibleTop = h.top + h.height * (1 - HEADING_SCALE);
    const shift = Math.max(0, visibleTop - heroTop - HERO_TOP_OFFSET);
    hero.style.setProperty("--search-shift", `${-shift}px`);
    hero.style.setProperty("--heading-scale", HEADING_SCALE);
    hero.classList.add("is-searching");
    followPanel();
    centerHero();
  }

  // Page déjà descendue : on remonte pour que le hero remplisse l'écran
  // (haut du hero juste sous la nav), comme au chargement.
  function centerHero() {
    const nav = document.querySelector("[data-nav]");
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const target = Math.max(0, hero.getBoundingClientRect().top + window.scrollY - navHeight);
    if (Math.abs(window.scrollY - target) < 2) return;
    const instant = prefersReducedMotion();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: instant ? 0 : 0.8, immediate: instant, force: true });
    else window.scrollTo({ top: target, behavior: instant ? "auto" : "smooth" });
  }

  function closeHero() {
    if (!hero || !hero.classList.contains("is-searching")) return;
    hero.classList.remove("is-searching");
  }

  // Pendant la remontée (transition CSS), la liste suit le champ
  function followPanel() {
    const end = performance.now() + 700;
    const step = () => {
      place();
      if (performance.now() < end) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(update, DEBOUNCE);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (panel.hidden) update();
      e.preventDefault();
      move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[activeIndex] || options.find((o) => o.kind !== "nearme");
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      close();
    }
  });

  // Le formulaire Webflow ne doit jamais être envoyé
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Clic en dehors : on décide à l'appui (pointerdown), pas au « click ».
  // Sur le hero, le champ remonte dès l'appui : au relâchement il n'est plus
  // sous la souris, et le « click » partirait ailleurs (fermeture immédiate).
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (panel.hidden && !hero?.classList.contains("is-searching")) return;
      if (!block.contains(e.target) && !panel.contains(e.target)) close();
    },
    true,
  );

  // ---------- Calcul des suggestions ----------
  async function update() {
    const query = input.value.trim();
    const q = normalize(query);
    const current = ++requestId;

    const groups = [];
    groups.push({ items: [{ kind: "nearme", label: t("search.nearMe"), hint: t("search.nearMeHint") }] });

    // Espaces : champ vide -> tous, groupés par département (« Hauts-de-Seine · 92 ») ;
    // sinon ceux dont le nom, la ville ou l'immeuble correspond
    const toItem = (s) => ({ kind: "space", label: s.name, hint: s.building, space: s });
    const pool = spaces.filter((s) => (type === "salles" ? s.rooms : true));
    if (!q) {
      const byDept = new Map();
      pool.forEach((s) => {
        const key = s.dept || "";
        if (!byDept.has(key)) byDept.set(key, []);
        byDept.get(key).push(toItem(s));
      });
      byDept.forEach((items, dept) => groups.push({ title: deptTitle(dept) || t("search.spaces"), items }));
    } else {
      const spaceMatches = pool
        .filter((s) => normalize(`${s.name} ${s.city} ${s.building}`).includes(q))
        .slice(0, MAX.spaces)
        .map(toItem);
      if (spaceMatches.length) groups.push({ title: t("search.spaces"), items: spaceMatches });
    }

    if (q.length >= 2) {
      // Gares et stations (local)
      const stations = await loadStations();
      if (current !== requestId) return;
      const starts = stations.filter((s) => s.key.startsWith(q));
      const contains = stations.filter((s) => !s.key.startsWith(q) && s.key.includes(q));
      const stationItems = [...starts, ...contains]
        .slice(0, MAX.stations)
        .map((s) => ({ kind: "station", label: s.name, lines: s.lines, lat: s.lat, lng: s.lng }));
      if (stationItems.length) groups.push({ title: t("search.stations"), items: stationItems });

      // Adresses et communes (API Adresse)
      if (q.length >= 3) {
        const addresses = await geocode(query);
        if (current !== requestId) return;
        if (addresses.length) groups.push({ title: t("search.addresses"), items: addresses });
      }
    }

    render(groups, query);
  }

  async function geocode(text) {
    // On demande large puis on remonte l'Île-de-France : l'API privilégie peu la position
    const url = `${GEOCODER}?text=${encodeURIComponent(text)}&type=StreetAddress&maximumResponses=10&lonlat=2.35,48.86`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const results = (data.results || []).filter((r) => Number.isFinite(r.y) && Number.isFinite(r.x) && r.metropole !== false);
      const idf = results.filter((r) => isInIdf(r.zipcode));
      return [...idf, ...results.filter((r) => !isInIdf(r.zipcode))]
        .slice(0, MAX.addresses)
        .map((r) => {
          const city = r.city || "";
          const label = r.fulltext || [r.street, r.zipcode, city].filter(Boolean).join(" ");
          return {
            kind: "address",
            label,
            short: r.kind === "municipality" || !r.street ? city || label : label,
            hint: isInIdf(r.zipcode) ? "" : t("search.outsideIdf"),
            lat: r.y,
            lng: r.x,
          };
        });
    } catch (e) {
      return [];
    }
  }

  // ---------- Affichage ----------
  function render(groups, query) {
    panel.innerHTML = "";
    options = [];
    activeIndex = -1;

    groups.forEach((group) => {
      if (group.title) {
        const title = document.createElement("p");
        title.className = "search_suggest-title";
        title.setAttribute("role", "presentation");
        title.textContent = group.title;
        panel.appendChild(title);
      }
      group.items.forEach((item) => {
        const index = options.length;
        const el = document.createElement("div");
        // « Autour de moi » : libellé et précision sur une seule ligne (maquette)
        el.className = `search_suggest-item is-${item.kind}${item.kind === "nearme" || item.kind === "space" ? " is-inline" : ""}`;
        el.id = `${id}-${index}`;
        el.setAttribute("role", "option");
        el.setAttribute("aria-selected", "false");
        el.innerHTML = `<span class="search_suggest-icon" aria-hidden="true"></span><span class="search_suggest-text"><span class="search_suggest-label"></span>${
          item.hint ? '<span class="search_suggest-hint"></span>' : ""
        }</span>`;
        el.querySelector(".search_suggest-label").textContent = item.label;
        if (item.hint) el.querySelector(".search_suggest-hint").textContent = item.hint;
        // Gare : pastilles de lignes aux couleurs officielles (comme dans la liste)
        if (item.lines) {
          const box = renderLines([{ lines: item.lines }], { maxLines: 5 });
          if (box) {
            box.classList.add("search_suggest-lines");
            el.appendChild(box);
          }
        }
        el.addEventListener("mousedown", (e) => e.preventDefault()); // garde le focus dans le champ
        el.addEventListener("click", () => choose(item));
        el.addEventListener("mousemove", () => highlight(index));
        panel.appendChild(el);
        options.push(item);
      });
    });

    if (query && options.length <= 1) {
      const empty = document.createElement("p");
      empty.className = "search_suggest-empty";
      empty.textContent = t("search.noResult");
      panel.appendChild(empty);
    }

    panel.hidden = false;
    panel.scrollTop = 0;
    scrollbar?.attach(); // le rendu a vidé la liste
    place();
    input.setAttribute("aria-expanded", "true");
    live.textContent = t("search.results", { n: options.length });
  }

  function highlight(index) {
    activeIndex = index;
    panel.querySelectorAll("[role='option']").forEach((el, i) => {
      const on = i === index;
      el.classList.toggle("is-focused", on);
      el.setAttribute("aria-selected", String(on));
      if (on) {
        input.setAttribute("aria-activedescendant", el.id);
        el.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function move(step) {
    if (!options.length) return;
    highlight((activeIndex + step + options.length) % options.length);
  }

  function close() {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    closeHero();
  }

  // ---------- Choix d'une suggestion ----------
  function choose(item) {
    close();
    if (item.kind === "nearme") return locate();
    if (item.kind === "space") {
      input.value = item.label;
      if (module) module.dispatchEvent(new CustomEvent("spaces:select", { detail: { slug: item.space.slug } }));
      else location.href = item.space.url;
      return;
    }
    const label = item.short || item.label;
    input.value = label;
    goTo({ lat: item.lat, lng: item.lng, label, isUser: false });
  }

  function locate() {
    if (!navigator.geolocation) {
      live.textContent = t("search.geoError");
      return;
    }
    input.value = t("search.locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        input.value = t("search.nearMe");
        goTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: t("search.nearMe"), isUser: true });
      },
      () => {
        input.value = "";
        live.textContent = t("search.geoError");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  // Module carte sur la page : on le met à jour ; sinon page Nos espaces
  function goTo(origin) {
    if (module) {
      module.dispatchEvent(new CustomEvent("spaces:origin", { detail: origin }));
      return;
    }
    const params = new URLSearchParams({ lat: origin.lat.toFixed(5), lng: origin.lng.toFixed(5), q: origin.label });
    if (origin.isUser) params.set("me", "1");
    if (type === "salles") params.set("type", "salles");
    location.href = `${MAP_PAGE}?${params}`;
  }
}
