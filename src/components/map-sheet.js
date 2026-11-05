// src/components/map-sheet.js — module carte en mobile (≤ 767 px) : carte plein
// écran, recherche posée en haut de la carte, panneau en bas (Figma 4681:27710
// et 4681:27712). Créé par spaces-map.js, qui lui passe ses commandes.
//
// Panneau replié : poignée, « 14 espaces » + « Voir la liste », titre
// « Les plus proches de… » (après une recherche), espaces en slider horizontal
// et points. Glisser un espace sélectionne celui qui s'arrête au bord (pin
// actif sur la carte). Un clic sur un espace le sélectionne ; un 2e clic ouvre
// sa page.
//
// Panneau déplié (poignée tirée vers le haut, clic sur la poignée ou « Voir la
// liste ») : toute la hauteur du module (= l'écran), titre, onglets et
// recherche en haut, liste complète ; bouton « Voir la carte » pour revenir.
//
// Classes : .is-sheet (module en mode mobile), .is-sheet-open (déplié),
// .is-sheet-dragging (pendant le glissé). Styles : _map-sheet.scss.

import { t } from "../utils/i18n.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { getLenis } from "../core/core.js";

const MOBILE = window.matchMedia("(max-width: 767px)");
const EDGE = 24; // px, marge du slider (scroll-padding)
const MAX_DOTS = 6;

export function createMapSheet(module, { select, isActive, resizeMap }) {
  const column = module.querySelector("[data-map-list]");
  const list = module.querySelector("[data-space-list]");
  const search = module.querySelector("[data-search]");
  const toggle = module.querySelector("[data-map-list-toggle]");
  if (!column || !list) return null;
  const head = column.querySelector(".map-module_head");
  const listWrap = list.closest(".w-dyn-list") || list;

  // Place d'origine de la recherche (dans l'en-tête de la liste)
  const searchHome = search ? { parent: search.parentElement, next: search.nextSibling } : null;

  // ---------- Éléments créés ----------
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "map-sheet_handle";
  handle.setAttribute("aria-label", t("map.showList"));
  handle.setAttribute("aria-expanded", "false");
  handle.innerHTML = '<span class="map-sheet_grip" aria-hidden="true"></span>';

  const top = document.createElement("div");
  top.className = "map-sheet_top";

  const title = document.createElement("p");
  title.className = "map-module_group map-sheet_title";

  const dots = document.createElement("div");
  dots.className = "map-sheet_dots";
  dots.setAttribute("aria-hidden", "true");

  const back = document.createElement("button");
  back.type = "button";
  back.className = "button map-sheet_back";
  back.innerHTML = '<span class="button_label"></span>';
  back.firstChild.textContent = t("map.showMap");

  let enabled = false;
  let open = false;

  const items = () => [...list.querySelectorAll("[data-space]")].filter((a) => !a.closest("[hidden]"));

  // ---------- Mise en place / retrait selon la largeur d'écran ----------
  function enable() {
    if (enabled) return;
    enabled = true;
    module.classList.add("is-sheet");
    column.prepend(handle);
    module.appendChild(top);
    module.appendChild(back);
    listWrap.before(title);
    listWrap.after(dots);
    placeSearch();
    setToggleLabel();
    refresh();
    resizeMap();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    setOpen(false, { instant: true });
    module.classList.remove("is-sheet", "is-sheet-open");
    [handle, top, back, title, dots].forEach((el) => el.remove());
    if (search && searchHome) searchHome.parent.insertBefore(search, searchHome.next);
    column.style.removeProperty("--sheet-peek");
    if (toggle) {
      const label = toggle.querySelectorAll("span");
      if (label.length) label[label.length - 1].textContent = t("map.hideList");
    }
    resizeMap();
  }

  // Recherche : sur la carte (replié) ou en haut de la liste (déplié)
  function placeSearch() {
    if (!search || !searchHome) return;
    if (open) searchHome.parent.insertBefore(search, searchHome.next);
    else top.appendChild(search);
  }

  function setToggleLabel() {
    if (!toggle) return;
    const label = toggle.querySelectorAll("span");
    if (label.length) label[label.length - 1].textContent = t("map.seeList");
  }

  // ---------- Hauteur visible du panneau replié ----------
  function measure() {
    if (!enabled || open) return;
    const peek = Math.ceil(dots.offsetTop + dots.offsetHeight + 16);
    column.style.setProperty("--sheet-peek", `${peek}px`);
  }

  // ---------- Ouvrir / replier ----------
  function setOpen(value, { instant = false } = {}) {
    if (value === open) return;
    open = value;
    module.classList.toggle("is-sheet-open", open);
    handle.setAttribute("aria-expanded", String(open));
    handle.setAttribute("aria-label", open ? t("map.showMap") : t("map.showList"));
    placeSearch();
    if (open) {
      column.scrollTop = 0;
      // Le module (hauteur d'écran) se cale en haut de la fenêtre
      const lenis = getLenis();
      const y = module.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y, { duration: instant || prefersReducedMotion() ? 0 : 0.6, force: true });
      else window.scrollTo({ top: y, behavior: instant || prefersReducedMotion() ? "auto" : "smooth" });
    } else {
      requestAnimationFrame(() => {
        measure();
        reveal();
      });
    }
  }

  // ---------- Slider (panneau replié) ----------
  function renderDots() {
    const n = Math.min(items().length, MAX_DOTS);
    dots.innerHTML = "";
    for (let i = 0; i < n; i++) dots.appendChild(document.createElement("span"));
    updateDots();
  }

  function updateDots() {
    const spans = [...dots.children];
    if (!spans.length) return;
    const max = list.scrollWidth - list.clientWidth;
    const progress = max > 0 ? list.scrollLeft / max : 0;
    const active = Math.round(progress * (spans.length - 1));
    spans.forEach((s, i) => s.classList.toggle("is-active", i === active));
  }

  // L'espace arrêté au bord gauche du slider
  function snapped() {
    const left = list.getBoundingClientRect().left + EDGE;
    let best = null;
    let dist = Infinity;
    items().forEach((a) => {
      const d = Math.abs(a.getBoundingClientRect().left - left);
      if (d < dist) {
        dist = d;
        best = a;
      }
    });
    return best;
  }

  let scrollTimer = 0;
  let programmatic = false;
  list.addEventListener(
    "scroll",
    () => {
      if (!enabled || open) return;
      updateDots();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (programmatic) {
          programmatic = false;
          return;
        }
        const a = snapped();
        const slug = a?.getAttribute("data-space");
        if (slug && !isActive(slug)) select(slug, { fromSheet: true });
      }, 140);
    },
    { passive: true },
  );

  // Fait venir l'espace actif au bord du slider (pin touché sur la carte…)
  function reveal(el = list.querySelector("[data-space].is-active")) {
    if (!enabled || open || !el) return;
    const delta = el.getBoundingClientRect().left - list.getBoundingClientRect().left - EDGE;
    if (Math.abs(delta) < 2) return;
    programmatic = true;
    list.scrollBy({ left: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  // Après un nouveau tri ou filtre (spaces-map.js) : titre, points, hauteur
  function refresh(firstGroupTitle = list.querySelector("[data-map-group]")?.textContent || "", hasOrigin = false) {
    if (!enabled) return;
    title.textContent = hasOrigin ? firstGroupTitle : "";
    title.hidden = !hasOrigin;
    list.scrollLeft = 0;
    renderDots();
    requestAnimationFrame(measure);
  }

  // ---------- Clic sur un espace ----------
  // Renvoie true si le clic est pris en charge (sinon : lien normal)
  function onItemClick(slug) {
    if (!enabled) return false;
    if (isActive(slug) && !open) return false; // 2e clic : page de l'espace
    if (open) setOpen(false);
    select(slug, { fromSheet: true });
    return true;
  }

  // ---------- Poignée : clic ou glissé ----------
  let drag = null;
  handle.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    const range = column.offsetHeight - (parseFloat(getComputedStyle(column).getPropertyValue("--sheet-peek")) || 280);
    drag = { y: e.clientY, t: performance.now(), start: open ? 0 : range, range, moved: false, last: open ? 0 : range };
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < 6) return;
    drag.moved = true;
    module.classList.add("is-sheet-dragging");
    drag.last = Math.min(Math.max(drag.start + dy, 0), drag.range);
    column.style.transform = `translateY(${drag.last}px)`;
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    module.classList.remove("is-sheet-dragging");
    column.style.transform = "";
    if (!d.moved) return setOpen(!open); // simple appui : bascule
    const speed = (e.clientY - d.y) / Math.max(performance.now() - d.t, 1); // px/ms, < 0 vers le haut
    if (speed < -0.4) setOpen(true);
    else if (speed > 0.4) setOpen(false);
    else setOpen(d.last < d.range / 2);
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  back.addEventListener("click", () => setOpen(false));
  module.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });

  // « Voir la liste » (bouton Webflow) : déplie en mobile
  function onToggle() {
    if (!enabled) return false;
    setOpen(!open);
    return true;
  }

  window.addEventListener("resize", () => enabled && measure(), { passive: true });
  const sync = () => (MOBILE.matches ? enable() : disable());
  MOBILE.addEventListener("change", sync);
  sync();

  return {
    get active() {
      return enabled;
    },
    get open() {
      return open;
    },
    refresh,
    reveal,
    onItemClick,
    onToggle,
  };
}
