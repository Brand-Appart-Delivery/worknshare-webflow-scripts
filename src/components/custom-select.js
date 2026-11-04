// src/components/custom-select.js — listes déroulantes des formulaires avec le
// même menu que la recherche du hero de l'accueil (panneau blanc arrondi,
// lignes arrondies, fond beige au survol).
//
// Aucun attribut à poser : tout <select> d'un formulaire est pris en charge.
// Pour garder la liste native : data-native-select sur le <select>.
//
// Le <select> de Webflow reste dans le formulaire (caché) : c'est lui qui est
// envoyé et validé (required). Le JS pose devant lui un bouton qui reprend ses
// classes Webflow (même aspect) et ouvre le menu. Choisir une ligne met à jour
// le <select> et déclenche « change ».
//
// Classes créées : custom-select, custom-select_button, custom-select_value,
// custom-select_native, custom-select_panel (+ search_suggest* de la recherche).
// Styles : _custom-select.scss et _space-search.scss.

import { createScrollIndicator } from "../utils/scroll-indicator.js";

const GAP = 8; // px entre le champ et le menu
const MAX_PANEL_HEIGHT = 320; // px
let uid = 0;

export function initCustomSelects(root = document) {
  root.querySelectorAll("form select:not([multiple]):not([data-native-select])").forEach(initSelect);
}

function initSelect(select) {
  if (select.dataset.customSelect) return;
  select.dataset.customSelect = "1";
  const id = `custom-select-${++uid}`;

  // ---------- Bouton (mêmes classes que le select : même aspect) ----------
  const wrap = document.createElement("div");
  wrap.className = "custom-select";
  select.before(wrap);
  wrap.appendChild(select);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `${select.className} custom-select_button`;
  button.id = `${id}-button`;
  button.setAttribute("role", "combobox");
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${id}-list`);
  const value = document.createElement("span");
  value.className = "custom-select_value";
  button.appendChild(value);
  wrap.insertBefore(button, select);

  // Le select natif reste pour l'envoi et la validation, hors navigation
  select.classList.add("custom-select_native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  // Libellé : relié au bouton (un clic dessus ouvre le focus sur le bouton)
  const labels = select.id ? [...document.querySelectorAll(`label[for="${CSS.escape(select.id)}"]`)] : [];
  if (labels.length) {
    labels.forEach((label, i) => {
      if (!label.id) label.id = `${id}-label-${i}`;
      label.addEventListener("click", (e) => {
        e.preventDefault();
        button.focus();
      });
    });
    button.setAttribute("aria-labelledby", `${labels.map((l) => l.id).join(" ")} ${button.id}`);
  } else if (select.getAttribute("aria-label")) {
    button.setAttribute("aria-label", select.getAttribute("aria-label"));
  }

  // ---------- Menu (rattaché au <body> : rien ne le coupe) ----------
  const panel = document.createElement("div");
  panel.className = "search_suggest custom-select_panel";
  panel.id = `${id}-list`;
  panel.setAttribute("role", "listbox");
  panel.setAttribute("data-lenis-prevent", "");
  panel.hidden = true;
  if (labels[0]) panel.setAttribute("aria-labelledby", labels[0].id);
  document.body.appendChild(panel);
  const scrollbar = createScrollIndicator(panel);

  let items = []; // { el, option }
  let active = -1;

  function build() {
    panel.innerHTML = "";
    items = [];
    [...select.children].forEach((child) => {
      if (child.tagName === "OPTGROUP") {
        const title = document.createElement("p");
        title.className = "search_suggest-title";
        title.setAttribute("role", "presentation");
        title.textContent = child.label;
        panel.appendChild(title);
        [...child.children].forEach(addOption);
      } else addOption(child);
    });
    scrollbar?.attach();
  }

  function addOption(option) {
    // Ligne vide « Choisir… » : sert de texte d'attente, pas de choix
    if (!option.value) return;
    const index = items.length;
    const el = document.createElement("div");
    el.className = "search_suggest-item custom-select_option";
    el.id = `${id}-opt-${index}`;
    el.setAttribute("role", "option");
    el.innerHTML = '<span class="search_suggest-text"><span class="search_suggest-label"></span></span>';
    el.querySelector(".search_suggest-label").textContent = option.text;
    if (option.disabled) el.setAttribute("aria-disabled", "true");
    el.addEventListener("mousedown", (e) => e.preventDefault()); // garde le focus sur le bouton
    el.addEventListener("click", () => choose(index));
    el.addEventListener("mousemove", () => highlight(index, false));
    panel.appendChild(el);
    items.push({ el, option });
  }

  // Texte du bouton = option choisie (ou texte d'attente)
  function refresh() {
    const option = select.options[select.selectedIndex];
    value.textContent = option ? option.text : "";
    button.classList.toggle("is-placeholder", !option || !option.value);
    button.disabled = select.disabled;
    items.forEach(({ el, option: o }) => {
      const on = o.selected && !!o.value;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-selected", String(on));
    });
  }

  function place() {
    if (panel.hidden) return;
    const rect = button.getBoundingClientRect();
    panel.style.top = `${rect.bottom + window.scrollY + GAP}px`;
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.width = `${rect.width}px`;
    const below = window.innerHeight - rect.bottom - GAP - 16;
    panel.style.maxHeight = `${Math.min(MAX_PANEL_HEIGHT, Math.max(160, below))}px`;
    scrollbar?.update();
  }

  function highlight(index, scroll = true) {
    active = index;
    items.forEach(({ el }, i) => el.classList.toggle("is-focused", i === index));
    const item = items[index];
    if (item) {
      button.setAttribute("aria-activedescendant", item.el.id);
      if (scroll) item.el.scrollIntoView({ block: "nearest" });
    } else button.removeAttribute("aria-activedescendant");
  }

  function open() {
    if (!panel.hidden || select.disabled) return;
    build();
    refresh();
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    wrap.classList.add("is-open");
    place();
    const selected = items.findIndex(({ option }) => option.selected);
    highlight(selected >= 0 ? selected : 0);
  }

  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-activedescendant");
    wrap.classList.remove("is-open");
  }

  function choose(index) {
    const item = items[index];
    if (!item || item.option.disabled) return;
    select.value = item.option.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    close();
    button.focus();
  }

  // Ligne suivante / précédente en sautant les options désactivées
  function step(dir) {
    if (!items.length) return;
    let i = active;
    for (let n = 0; n < items.length; n++) {
      i = (i + dir + items.length) % items.length;
      if (!items[i].option.disabled) return highlight(i);
    }
  }

  // ---------- Souris et clavier ----------
  button.addEventListener("click", () => (panel.hidden ? open() : close()));

  let typed = "";
  let typedTimer = 0;
  button.addEventListener("keydown", (e) => {
    const isOpen = !panel.hidden;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) open();
      else step(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Home" || e.key === "End") {
      if (!isOpen) return;
      e.preventDefault();
      highlight(e.key === "Home" ? 0 : items.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen && active >= 0) choose(active);
      else open();
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        close();
      }
    } else if (e.key === "Tab") {
      close();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Frappe d'une lettre : première ligne qui commence par ces lettres
      typed += e.key.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = setTimeout(() => (typed = ""), 600);
      if (!isOpen) open();
      const i = items.findIndex(({ option }) => option.text.trim().toLowerCase().startsWith(typed));
      if (i >= 0) highlight(i);
    }
  });

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!panel.hidden && !wrap.contains(e.target) && !panel.contains(e.target)) close();
    },
    true,
  );

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

  // ---------- Synchronisation avec le select ----------
  // Valeur changée par un autre script (pré-remplissage) : il déclenche
  // « change » ; activé / désactivé (champs conditionnels) : observé.
  select.addEventListener("change", refresh);
  new MutationObserver(refresh).observe(select, { attributes: true, attributeFilter: ["disabled"] });
  // Champ obligatoire vide à l'envoi : le focus va sur le bouton
  select.addEventListener("invalid", () => button.focus());
  select.form?.addEventListener("reset", () => setTimeout(refresh));

  build();
  refresh();
}
