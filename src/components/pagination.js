// src/components/pagination.js — pagination des listes CMS en pastilles
// numérotées (maquette Figma « WS/Pagination ») : ← 1 2 3 →, sans rechargement.
//
// STRUCTURE : la pagination native de Webflow d'une Collection List
// (Settings de la liste → Paginate items). Ses boutons Précédent / Suivant
// (et le compteur « Show page count », conseillé : le JS y lit le total
// « 1 / 3 ») reçoivent la classe Webflow pagination_native (display none) :
// ils restent dans la page pour leurs liens, le JS affiche les pastilles.
//
// Fonctionnement :
// 1. Les pastilles s'affichent tout de suite, avec les vraies adresses
//    (?xxxx_page=2, crawlables). Tant que le reste n'est pas chargé, un clic
//    recharge la page normalement.
// 2. Les autres pages de la liste sont chargées en arrière-plan et leurs
//    éléments ajoutés à la liste. Ensuite, changer de page ne recharge plus :
//    on affiche les bons éléments, l'adresse suit (Retour du navigateur
//    compris) et la page remonte en haut de la liste.
// 3. Filtre du blog (blog-filter.js) : il filtre tous les éléments chargés ;
//    la pagination se recalcule sur le résultat (événement « wns:filter »
//    sur la liste). Elle prévient le filtre quand des éléments arrivent
//    (« wns:items-added »).
// Au-delà de 7 pages : 1 … 4 5 6 … 12. Styles : _pagination.scss.

import { t } from "../utils/i18n.js";
import { getLenis } from "../core/core.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";
import { initCardLinks } from "./card-link.js";

const MAX_VISIBLE = 7; // pastilles numérotées au maximum (points compris)
const SCROLL_GAP = 24; // px entre le haut de l'écran (ou la nav) et la liste

export function initPaginations(root = document) {
  const wrappers = [...root.querySelectorAll(".w-pagination-wrapper")];
  wrappers.forEach((wrapper) => initOne(wrapper, [...document.querySelectorAll(".w-pagination-wrapper")].indexOf(wrapper)));
}

function initOne(wrapper, index) {
  if (wrapper.dataset.paginationInit) return;
  const listWrap = wrapper.closest(".w-dyn-list");
  const itemsEl = listWrap?.querySelector(".w-dyn-items");
  if (!itemsEl) return;

  const prevNative = wrapper.querySelector(".w-pagination-previous");
  const nextNative = wrapper.querySelector(".w-pagination-next");
  const counter = wrapper.querySelector(".w-page-count");

  // Clé de la liste (ex. 5d3d09d6_page) : dans les liens natifs
  const match = [prevNative, nextNative]
    .filter(Boolean)
    .map((a) => (a.getAttribute("href") || "").match(/[?&]([\w-]+_page)=(\d+)/))
    .find(Boolean);
  if (!match) return; // une seule page : rien à faire
  const key = match[1];
  wrapper.dataset.paginationInit = "1";

  const pageFromUrl = () => parseInt(new URLSearchParams(location.search).get(key), 10) || 1;
  const startPage = pageFromUrl();
  const counted = counter && counter.textContent.match(/(\d+)\s*\/\s*(\d+)/);
  let total = counted ? parseInt(counted[2], 10) : startPage + (nextNative ? 1 : 0);

  const hrefFor = (page) => {
    const params = new URLSearchParams(location.search);
    if (page === 1) params.delete(key);
    else params.set(key, String(page));
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ""}`;
  };

  const list = document.createElement("div");
  list.className = "pagination";
  [...wrapper.children].forEach((child) => (child.hidden = true));
  wrapper.appendChild(list);
  wrapper.classList.add("is-pagination-ready");
  wrapper.setAttribute("aria-label", t("pagination.label"));

  // ---------- Affichage des pastilles ----------
  let loaded = false; // tous les éléments sont dans la liste
  let page = startPage;
  let perPage = itemsEl.children.length;

  const render = () => {
    list.replaceChildren();
    list.appendChild(arrow("prev", page > 1 ? hrefFor(page - 1) : null, page - 1));
    pagesToShow(page, total).forEach((n) => {
      if (n === null) {
        const gap = document.createElement("span");
        gap.className = "pagination_item is-gap";
        gap.setAttribute("aria-hidden", "true");
        gap.textContent = "…";
        list.appendChild(gap);
        return;
      }
      const link = document.createElement("a");
      link.className = "pagination_item";
      link.href = hrefFor(n);
      link.dataset.page = String(n);
      link.textContent = String(n);
      link.setAttribute("aria-label", t("pagination.page", { n }));
      if (n === page) {
        link.classList.add("is-current");
        link.setAttribute("aria-current", "page");
      }
      list.appendChild(link);
    });
    list.appendChild(arrow("next", page < total ? hrefFor(page + 1) : null, page + 1));
    // Une seule page (ex. filtre avec peu d'articles) : pas de pagination
    wrapper.classList.toggle("is-single-page", total < 2);
  };

  // ---------- Pagination dans la page (une fois tout chargé) ----------
  const allItems = () => [...itemsEl.children];
  const visibleItems = () => allItems().filter((el) => !el.hasAttribute("data-filtered-out"));

  const show = () => {
    const visible = visibleItems();
    total = Math.max(1, Math.ceil(visible.length / perPage));
    page = Math.min(Math.max(page, 1), total);
    const from = (page - 1) * perPage;
    const shown = new Set(visible.slice(from, from + perPage));
    allItems().forEach((el) => (el.hidden = !shown.has(el)));
    render();
    requestScrollRefresh();
  };

  const scrollToList = () => {
    const target = document.querySelector("[data-blog-filters]") || listWrap;
    const navShown = document.documentElement.classList.contains("is-nav-shown");
    const nav = document.querySelector("[data-nav]");
    const offset = -(SCROLL_GAP + (navShown && nav ? nav.offsetHeight : 0));
    const top = target.getBoundingClientRect().top + window.scrollY + offset;
    if (top > window.scrollY) return; // déjà visible plus bas : on ne bouge pas
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(top, { duration: 0.8 });
    else window.scrollTo({ top, behavior: "smooth" });
  };

  const go = (n, { push = true } = {}) => {
    page = n;
    show();
    if (push) history.pushState(history.state, "", hrefFor(page));
    scrollToList();
  };

  list.addEventListener("click", (e) => {
    const link = e.target.closest("a.pagination_item");
    if (!link || !loaded || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const n = parseInt(link.dataset.page, 10);
    if (n) go(n);
  });

  window.addEventListener("popstate", () => {
    if (loaded) go(pageFromUrl(), { push: false });
  });

  // Filtre changé par l'utilisateur : retour à la page 1
  itemsEl.addEventListener("wns:filter", (e) => {
    if (!loaded) return;
    if (e.detail?.reset) {
      page = 1;
      const url = new URL(location.href);
      url.searchParams.delete(key);
      history.replaceState(history.state, "", url);
    }
    show();
  });

  render();

  // ---------- Chargement des autres pages ----------
  loadAllPages({ key, index, startPage, itemsEl, prevNative, nextNative, hrefFor })
    .then(({ pages, first }) => {
      // Éléments rangés dans l'ordre des pages ; taille d'une page = page 1
      perPage = first;
      const ordered = pages.flat();
      ordered.forEach((el) => itemsEl.appendChild(el));
      const added = ordered.filter((el) => !el.dataset.paginationOwn);
      added.forEach((el) => initCardLinks(el));
      loaded = true;
      page = startPage;
      show();
      itemsEl.dispatchEvent(new CustomEvent("wns:items-added", { detail: { items: added } }));
    })
    .catch((err) => console.warn("[pagination]", err.message)); // repli : liens normaux
}

// Charge toutes les pages de la liste (en suivant les liens précédent /
// suivant de chaque page) et renvoie leurs éléments dans l'ordre.
async function loadAllPages({ index, startPage, itemsEl, prevNative, nextNative }) {
  const pages = new Map();
  const own = [...itemsEl.children];
  own.forEach((el) => (el.dataset.paginationOwn = "1"));
  pages.set(startPage, own);

  const fetchPage = async (href) => {
    const res = await fetch(href, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`${res.status} sur ${href}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const wrapper = doc.querySelectorAll(".w-pagination-wrapper")[index];
    const items = wrapper?.closest(".w-dyn-list")?.querySelector(".w-dyn-items");
    if (!items) throw new Error(`liste introuvable sur ${href}`);
    return {
      items: [...items.children].map((el) => document.adoptNode(el)),
      prev: wrapper.querySelector(".w-pagination-previous")?.getAttribute("href"),
      next: wrapper.querySelector(".w-pagination-next")?.getAttribute("href"),
    };
  };

  // Vers la fin, puis vers le début
  for (const [dir, start] of [
    [1, nextNative?.getAttribute("href")],
    [-1, prevNative?.getAttribute("href")],
  ]) {
    let href = start;
    let n = startPage + dir;
    while (href && n >= 1 && !pages.has(n) && pages.size < 50) {
      const data = await fetchPage(href);
      pages.set(n, data.items);
      href = dir === 1 ? data.next : data.prev;
      n += dir;
    }
  }

  const sorted = [...pages.keys()].sort((a, b) => a - b);
  return { pages: sorted.map((n) => pages.get(n)), first: pages.get(sorted[0]).length };
}

// Flèche : lien si la page existe, sinon pastille estompée non cliquable
function arrow(dir, href, target) {
  const el = document.createElement(href ? "a" : "span");
  el.className = `pagination_item is-arrow is-${dir}`;
  if (href) {
    el.href = href;
    el.dataset.page = String(target);
  } else {
    el.classList.add("is-disabled");
    el.setAttribute("aria-disabled", "true");
  }
  el.setAttribute("aria-label", t(dir === "prev" ? "pagination.prev" : "pagination.next"));
  const icon = document.createElement("span");
  icon.className = "pagination_icon";
  icon.setAttribute("aria-hidden", "true");
  const glyph = document.createElement("span");
  glyph.className = "ico-arrow-right";
  icon.appendChild(glyph);
  el.appendChild(icon);
  return el;
}

// Numéros à afficher (null = points de suspension)
function pagesToShow(current, total) {
  if (total <= MAX_VISIBLE) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, null, total];
  if (current >= total - 3) return [1, null, total - 4, total - 3, total - 2, total - 1, total];
  return [1, null, current - 1, current, current + 1, null, total];
}
