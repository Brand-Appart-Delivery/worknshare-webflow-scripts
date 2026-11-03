// src/components/formula.js — sélecteur « Quelle formule pour vous ? » (onglets).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-formula]                         conteneur
//     [role="tablist"]                     barre d'onglets (parent des onglets)
//       [data-formula-tab="seul"]          onglet (role="tab", aria-controls = id du panneau)
//         data-formula-theme="coworking|office|managed-office|rooms"  couleur du fond
//     [data-formula-panel="seul"]          panneau (role="tabpanel", attribut hidden si inactif)
//
// Le JS ajoute dans la barre un fond qui glisse sous l'onglet actif et prend
// sa couleur (utils/tab-indicator.js). États : .is-active sur l'onglet,
// attribut hidden sur les panneaux inactifs. Styles : _formula.scss.

import { requestScrollRefresh } from "../utils/scroll-refresh.js";
import { createTabIndicator } from "../utils/tab-indicator.js";

export function initFormulas(root = document) {
  root.querySelectorAll("[data-formula]").forEach(initFormula);
}

function initFormula(formula) {
  const tabs = [...formula.querySelectorAll("[data-formula-tab]")];
  if (!tabs.length) return;
  const tablist = tabs[0].parentElement;

  const getPanel = (tab) => formula.querySelector(`[data-formula-panel="${tab.getAttribute("data-formula-tab")}"]`);

  let current = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];

  function select(tab, { focus = false } = {}) {
    if (tab === current) return;
    current = tab;

    tabs.forEach((t) => {
      const isActive = t === tab;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", String(isActive));
      t.setAttribute("tabindex", isActive ? "0" : "-1");
      const panel = getPanel(t);
      if (!panel) return;
      if (isActive) {
        panel.removeAttribute("hidden");
        panel.classList.add("is-entering");
        panel.addEventListener("animationend", () => panel.classList.remove("is-entering"), { once: true });
      } else {
        panel.setAttribute("hidden", "");
      }
    });

    indicator.move();
    if (focus) tab.focus();

    // Barre qui défile (mobile) : l'onglet choisi reste visible
    const left = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
    tablist.scrollTo({ left, behavior: "smooth" });

    // La hauteur de la section change : on recalcule les animations au scroll
    requestScrollRefresh();
  }

  // État de départ cohérent (aria, tabindex, panneaux).
  // Le href="#formule-xxx" ne sert que sans JS : on le retire pour que ni
  // Webflow ni le scroll d'ancres ne change l'URL au clic.
  tabs.forEach((tab) => {
    tab.removeAttribute("href");
    const isActive = tab === current;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
    const panel = getPanel(tab);
    if (panel) panel.toggleAttribute("hidden", !isActive);
  });

  // Fond glissant, placé derrière les onglets (couleur selon data-formula-theme)
  const indicator = createTabIndicator(tablist, {
    getActive: () => current,
    themeAttr: "data-formula-theme",
    className: "formula_indicator",
  });

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault(); // pas de saut vers l'ancre #formule-xxx
      e.stopPropagation(); // ni de gestionnaire de clic Webflow en aval
      select(tab);
    });

    // Clavier : flèches, Début, Fin (modèle d'onglets ARIA)
    tab.addEventListener("keydown", (e) => {
      let next = null;
      if (e.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      else if (e.key === " " || e.key === "Enter") next = tab;
      if (!next) return;
      e.preventDefault();
      select(next, { focus: true });
    });
  });
}
