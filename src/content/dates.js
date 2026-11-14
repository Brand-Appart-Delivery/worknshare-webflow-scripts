// src/content/dates.js — dates CMS dans la langue de la page.
//
// Webflow écrit les dates en anglais (« September 23, 2024 »), quel que soit
// le format choisi. Le code les réécrit : « 23 septembre 2024 » en français,
// « 23 September 2024 » en anglais.
//
// STRUCTURE (attribut à poser dans Webflow, sur l'élément relié au champ date) :
//   [data-date]          texte = date au format Webflow (ex. « September 23, 2024 »)
//
// OPTION :
//   data-date="short"    « 23 sept. 2024 » (mois abrégé)
//
// Une date illisible est laissée telle quelle.

import { getLocale } from "../utils/i18n.js";

export function initDates(root = document) {
  root.querySelectorAll("[data-date]").forEach((el) => {
    const raw = el.textContent.trim();
    const date = new Date(raw);
    if (!raw || Number.isNaN(date.getTime())) return;
    const month = el.getAttribute("data-date") === "short" ? "short" : "long";
    el.textContent = new Intl.DateTimeFormat(getLocale(), { day: "numeric", month, year: "numeric" }).format(date);
  });
}
