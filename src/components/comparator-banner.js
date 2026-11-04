// src/components/comparator-banner.js — bandeau « Bail commercial ou Work & Share ? »
// (page Bureaux flexibles) : la commune et l'effectif saisis pré-remplissent le
// comparateur (/comparateur?ville=…&postes=…).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-comparator]                  bandeau
//     [data-comparator-city]           champ commune : le texte qu'il contient sert
//                                      de placeholder, le JS y pose un vrai <input>
//     [data-comparator-minus]          bouton − (lien role="button")
//     [data-comparator-value]          effectif affiché (valeur de départ)
//     [data-comparator-plus]           bouton +
//     [data-comparator-submit]         lien « Calculer mon économie »
//
// OPTIONS
//   data-comparator-url="/comparateur"   page du comparateur (sur le bandeau)
//
// Le href du bouton est mis à jour à chaque saisie : clic, Ctrl/Cmd + clic et
// clic molette fonctionnent comme un lien normal. Communes : celles que connaît
// le comparateur (communes.json, généré au build depuis src/comparateur/).

import COMMUNES from "../comparateur/communes.json";
import { t } from "../utils/i18n.js";

const MIN = 1;
const MAX = 900;
const MAX_RESULTS = 8;

// Minuscules, sans accents ni ponctuation (même règle que le comparateur)
const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const INDEX = COMMUNES.map(([name, cp]) => ({ name, cp, key: norm(name) }));

// Commune dont le nom commence par la saisie, puis celles dont un mot commence
// par la saisie, puis recherche par code postal
function search(query) {
  const q = norm(query);
  if (!q) return [];
  const starts = [];
  const words = [];
  INDEX.forEach((c) => {
    if (c.key.startsWith(q) || c.cp.startsWith(q)) starts.push(c);
    else if (c.key.includes(` ${q}`)) words.push(c);
  });
  return starts.concat(words).slice(0, MAX_RESULTS);
}

export function initComparatorBanners(root = document) {
  root.querySelectorAll("[data-comparator]").forEach(initBanner);
}

let uid = 0;

function initBanner(banner) {
  if (banner.dataset.comparatorInit) return;
  banner.dataset.comparatorInit = "1";

  const cityBox = banner.querySelector("[data-comparator-city]");
  const valueEl = banner.querySelector("[data-comparator-value]");
  const minus = banner.querySelector("[data-comparator-minus]");
  const plus = banner.querySelector("[data-comparator-plus]");
  const submit = banner.querySelector("[data-comparator-submit]");
  if (!submit) return;

  const baseUrl = banner.getAttribute("data-comparator-url") || "/comparateur";
  let city = null; // commune choisie dans la liste
  let heads = clamp(parseInt(valueEl?.textContent, 10) || 10);

  // ---------- Lien du bouton ----------
  const updateLink = () => {
    const params = new URLSearchParams();
    if (city) params.set("ville", city.name);
    params.set("postes", String(heads));
    submit.setAttribute("href", `${baseUrl}?${params}`);
  };

  // ---------- Effectif ----------
  const setHeads = (n) => {
    heads = clamp(n);
    if (valueEl) valueEl.textContent = String(heads);
    minus?.setAttribute("aria-disabled", String(heads <= MIN));
    plus?.setAttribute("aria-disabled", String(heads >= MAX));
    updateLink();
  };
  valueEl?.setAttribute("aria-live", "polite");
  const step = (delta) => (e) => {
    e.preventDefault();
    setHeads(heads + delta);
  };
  minus?.addEventListener("click", step(-1));
  plus?.addEventListener("click", step(1));
  // Espace sur un lien role="button" : même effet qu'un clic
  [minus, plus].forEach((btn) =>
    btn?.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    }),
  );

  // ---------- Commune ----------
  if (cityBox) initCity();

  function initCity() {
    // Le texte « Votre commune » posé dans Webflow devient le placeholder
    const placeholderEl = [...cityBox.children].find((el) => !el.querySelector("[class^='ico-']") && el.textContent.trim());
    const placeholder = placeholderEl?.textContent.trim() || t("comparator.city");
    const id = `comparator-${++uid}`;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "offices-calc_field-input";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-label", t("comparator.city"));
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", `${id}-list`);

    const list = document.createElement("div");
    list.className = "offices-calc_list";
    list.id = `${id}-list`;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", t("comparator.cities"));
    list.setAttribute("data-lenis-prevent", "");
    list.hidden = true;

    if (placeholderEl) placeholderEl.replaceWith(input);
    else cityBox.append(input);
    cityBox.append(list);
    cityBox.classList.add("has-input");
    // Clic n'importe où dans la pastille : focus du champ
    cityBox.addEventListener("click", (e) => {
      if (!list.contains(e.target)) input.focus();
    });

    let results = [];
    let active = -1;

    const close = () => {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    };

    const highlight = (i) => {
      active = i;
      list.querySelectorAll("[role='option']").forEach((opt, n) => {
        const on = n === i;
        opt.classList.toggle("is-active", on);
        opt.setAttribute("aria-selected", String(on));
        if (on) {
          input.setAttribute("aria-activedescendant", opt.id);
          opt.scrollIntoView({ block: "nearest" });
        }
      });
    };

    const choose = (c) => {
      city = c;
      input.value = c.name;
      input.removeAttribute("aria-invalid");
      close();
      updateLink();
    };

    const render = () => {
      results = search(input.value);
      list.textContent = "";
      if (!input.value.trim()) return close();
      if (!results.length) {
        const empty = document.createElement("div");
        empty.className = "offices-calc_empty";
        empty.textContent = t("comparator.noCity");
        list.append(empty);
      }
      results.forEach((c, i) => {
        const opt = document.createElement("div");
        opt.id = `${id}-opt-${i}`;
        opt.className = "offices-calc_option";
        opt.setAttribute("role", "option");
        opt.setAttribute("aria-selected", "false");
        const name = document.createElement("span");
        name.textContent = c.name;
        const cp = document.createElement("span");
        cp.className = "offices-calc_cp";
        cp.textContent = c.cp;
        opt.append(name, cp);
        // mousedown : passe avant le blur du champ
        opt.addEventListener("mousedown", (e) => {
          e.preventDefault();
          choose(c);
        });
        list.append(opt);
      });
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      highlight(results.length ? 0 : -1);
    };

    input.addEventListener("input", () => {
      city = null;
      updateLink();
      render();
    });
    input.addEventListener("focus", () => {
      if (input.value && !city) render();
    });
    input.addEventListener("keydown", (e) => {
      const open = !list.hidden && results.length;
      if (e.key === "ArrowDown" && open) {
        e.preventDefault();
        highlight((active + 1) % results.length);
      } else if (e.key === "ArrowUp" && open) {
        e.preventDefault();
        highlight((active - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (open && active > -1) choose(results[active]);
        else if (city) submit.click();
      } else if (e.key === "Escape" && !list.hidden) {
        e.preventDefault();
        close();
      }
    });
    input.addEventListener("blur", () => {
      // Saisie complète sans passer par la liste (« clichy ») : on la reconnaît
      if (!city && input.value.trim()) {
        const exact = INDEX.find((c) => c.key === norm(input.value));
        if (exact) choose(exact);
        else input.setAttribute("aria-invalid", "true");
      }
      close();
    });
  }

  setHeads(heads);
}

function clamp(n) {
  return Math.min(MAX, Math.max(MIN, Math.round(n) || MIN));
}
