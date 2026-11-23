// src/content/dates.js — dates CMS dans la langue de la page.
//
// Webflow écrit les dates au format « mois jour, année », en anglais
// (« September 23, 2024 ») ou avec le mois traduit sur la version française
// (« septembre 23, 2024 »). Le code les réécrit toutes au même format :
// « 23 septembre 2024 » en français, « 23 September 2024 » en anglais.
//
// STRUCTURE (attribut à poser dans Webflow, sur l'élément relié au champ date) :
//   [data-date]          texte = date au format Webflow (ex. « September 23, 2024 »)
//
// OPTION :
//   data-date="short"    « 23 sept. 2024 » (mois abrégé)
//
// Une date illisible est laissée telle quelle.

import { getLocale } from "../utils/i18n.js";

// Mois français (complets et abrégés, sans accents) -> numéro (0-11)
const FR_MONTHS = [
  ["janvier", "janv"],
  ["fevrier", "fevr", "fev"],
  ["mars"],
  ["avril", "avr"],
  ["mai"],
  ["juin"],
  ["juillet", "juil"],
  ["aout"],
  ["septembre", "sept"],
  ["octobre", "oct"],
  ["novembre", "nov"],
  ["decembre", "dec"],
];

const plain = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// « novembre 27, 2025 » ou « 27 novembre 2025 » -> Date (sinon null)
function parseFrench(raw) {
  const text = plain(raw).replace(/[.,]/g, " ");
  const match = text.match(/^\s*(?:([a-z]+)\s+(\d{1,2})|(\d{1,2})\s+([a-z]+))\s+(\d{4})\s*$/);
  if (!match) return null;
  const name = match[1] || match[4];
  const day = Number(match[2] || match[3]);
  const month = FR_MONTHS.findIndex((names) => names.includes(name));
  return month < 0 ? null : new Date(Number(match[5]), month, day);
}

function parse(raw) {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? parseFrench(raw) : date;
}

export function initDates(root = document) {
  root.querySelectorAll("[data-date]").forEach((el) => {
    const raw = el.textContent.trim();
    const date = raw && parse(raw);
    if (!date) return;
    const month = el.getAttribute("data-date") === "short" ? "short" : "long";
    el.textContent = new Intl.DateTimeFormat(getLocale(), { day: "numeric", month, year: "numeric" }).format(date);
  });
}
