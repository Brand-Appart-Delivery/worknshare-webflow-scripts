// src/utils/geo.js — petits calculs géographiques et texte de recherche.

import { getLocale } from "./i18n.js";

// Distance à vol d'oiseau entre deux points, en km (formule de haversine)
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 0.45 -> « 450 m », 2.34 -> « 2,3 km »
export function formatDistance(km) {
  const tag = getLocale().tag;
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`;
  return `${new Intl.NumberFormat(tag, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
}

// Texte comparable : minuscules, sans accents, tirets et apostrophes en espaces
export function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Codes postaux d'Île-de-France (75, 77, 78, 91 à 95)
export function isInIdf(postcode = "") {
  return /^(75|77|78|91|92|93|94|95)/.test(postcode);
}
