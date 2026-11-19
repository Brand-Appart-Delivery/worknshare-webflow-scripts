// src/components/lang-select.js — sélecteur de langue du footer : la liste des
// langues de Webflow (élément Locales List) devient un bouton « FR ⌄ » qui ouvre
// le même menu que les listes déroulantes du site (components/custom-select.js).
//
// STRUCTURE (posée dans Webflow) :
//   [data-lang-select]          élément Locales List (wrapper)
//     a                         un lien par langue, fourni par Webflow (adresse
//                               de la page courante dans cette langue ; la
//                               langue de la page porte aria-current / w--current)
//     [data-lang-chevron]       embed avec le SVG du chevron, après le lien
//
// Le bouton reprend les classes du lien Webflow (footer_link is-legal) : même
// aspect que les autres liens du bas du footer, plus une copie du chevron
// de l'embed (à défaut, chevron dessiné en CSS).
// Sans JS, la liste native reste affichée. Avec une seule langue publiée,
// le sélecteur est masqué (rien à choisir).
//
// Classes créées : lang-select_button, lang-select_panel
//   (+ search_suggest*, custom-select_panel pour le menu).
// ÉTATS : .is-open (wrapper), aria-expanded (bouton), .is-selected (langue courante).
// Styles : _lang-select.scss, _custom-select.scss, _space-search.scss.

import { LOCALES, getLang, t } from "../utils/i18n.js";

const GAP = 8; // px entre le bouton et le menu
let uid = 0;

export function initLangSelects(root = document) {
  root.querySelectorAll("[data-lang-select]").forEach(initLangSelect);
}

function initLangSelect(wrap) {
  if (wrap.dataset.langSelectReady) return;
  const links = [...wrap.querySelectorAll("a[href]")];
  // Une seule langue publiée : rien à choisir, sélecteur masqué (sinon
  // « Français ⌄ » s'afficherait sans menu)
  if (links.length < 2) {
    wrap.style.display = "none";
    return;
  }
  wrap.dataset.langSelectReady = "1";

  const id = `lang-select-${++uid}`;
  const langs = links.map((link) => ({
    link,
    code: codeOf(link),
    name: link.textContent.trim(),
  }));
  const current =
    langs.find(({ link }) => link.getAttribute("aria-current") || link.classList.contains("w--current")) ||
    langs.find(({ code }) => code === getLang()) ||
    langs[0];

  // ---------- Bouton (classes du lien Webflow : même aspect) ----------
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${current.link.className.replace("w--current", "")} lang-select_button`.trim();
  const label = document.createElement("span");
  label.textContent = current.code.toUpperCase();
  button.appendChild(label);
  // Chevron : copie du SVG de l'embed Webflow (visible dans le Designer)
  const chevron = wrap.querySelector("[data-lang-chevron] svg");
  if (chevron) button.appendChild(chevron.cloneNode(true));
  button.setAttribute("aria-label", `${t("lang.label")} : ${current.name}`);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${id}-panel`);

  // Liste native cachée (style en ligne : prime sur le display des classes
  // Webflow), bouton à la place
  [...wrap.children].forEach((child) => (child.style.display = "none"));
  wrap.appendChild(button);

  // ---------- Menu (rattaché au <body> : rien ne le coupe) ----------
  const panel = document.createElement("div");
  panel.className = "search_suggest custom-select_panel lang-select_panel";
  panel.id = `${id}-panel`;
  panel.hidden = true;
  document.body.appendChild(panel);

  const items = langs.map((lang) => {
    const item = document.createElement("a");
    item.className = "search_suggest-item";
    item.href = lang.link.href;
    item.lang = lang.code;
    item.hreflang = lang.code;
    item.innerHTML = '<span class="search_suggest-text"><span class="search_suggest-label"></span></span>';
    item.querySelector(".search_suggest-label").textContent = lang.name;
    if (lang === current) {
      item.classList.add("is-selected");
      item.setAttribute("aria-current", "page");
    }
    item.addEventListener("mouseenter", () => focusItem(item, false));
    item.addEventListener("focus", () => highlight(item));
    panel.appendChild(item);
    return item;
  });

  function highlight(item) {
    items.forEach((el) => el.classList.toggle("is-focused", el === item));
  }

  function focusItem(item, moveFocus = true) {
    highlight(item);
    if (moveFocus) item.focus();
  }

  // Sous le bouton s'il y a la place, sinon au-dessus (bas de page) ;
  // aligné sur le bord droit du bouton
  function place() {
    if (panel.hidden) return;
    const rect = button.getBoundingClientRect();
    const height = panel.offsetHeight;
    const width = panel.offsetWidth;
    const below = window.innerHeight - rect.bottom - GAP;
    const top = below >= height ? rect.bottom + GAP : rect.top - GAP - height;
    const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
    panel.style.top = `${top + window.scrollY}px`;
    panel.style.left = `${left + window.scrollX}px`;
  }

  function open() {
    if (!panel.hidden) return;
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    wrap.classList.add("is-open");
    place();
    highlight(items[langs.indexOf(current)]);
  }

  function close(returnFocus = false) {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    wrap.classList.remove("is-open");
    if (returnFocus) button.focus();
  }

  // ---------- Souris et clavier ----------
  button.addEventListener("click", () => (panel.hidden ? open() : close()));

  button.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      open();
      focusItem(e.key === "ArrowDown" ? items[0] : items[items.length - 1]);
    } else if (e.key === "Escape") {
      close();
    }
  });

  panel.addEventListener("keydown", (e) => {
    const index = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      focusItem(items[(index + step + items.length) % items.length]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  });

  // Fermeture : clic ailleurs, ou focus sorti du bouton et du menu
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!panel.hidden && !wrap.contains(e.target) && !panel.contains(e.target)) close();
    },
    true,
  );
  panel.addEventListener("focusout", (e) => {
    if (!panel.contains(e.relatedTarget) && e.relatedTarget !== button) close();
  });

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
  document.addEventListener("scroll", schedulePlace, { passive: true, capture: true });
}

// Code de langue d'un lien : hreflang (posé par Webflow), sinon préfixe d'URL
// (LOCALES dans utils/i18n.js), sinon langue par défaut
function codeOf(link) {
  const hreflang = link.getAttribute("hreflang");
  if (hreflang) return hreflang.slice(0, 2).toLowerCase();
  const path = new URL(link.href, location.href).pathname;
  const found = Object.keys(LOCALES).find((lang) => {
    const prefix = LOCALES[lang].prefix;
    return prefix && (path === prefix || path.startsWith(`${prefix}/`));
  });
  return found || Object.keys(LOCALES).find((lang) => !LOCALES[lang].prefix);
}
