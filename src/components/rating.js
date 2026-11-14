// src/components/rating.js — étoiles qui suivent la note (ex. 4,9 → 4 étoiles
// pleines et la 5e remplie à 90 %).
//
// STRUCTURE (composant Webflow « Note avis Google ») :
//   [data-rating="4,9"]          rangée d'étoiles (attribut relié au prop Note)
//     enfants                    les 5 étoiles (.review-card_star > .ico-star-filled)
//
// Le remplissage passe par la variable --star-fill (0 % à 100 %) de chaque
// étoile (_stars.scss). Le libellé accessible annonce la vraie note.
// Sans note lisible : rien ne change (5 étoiles pleines).

import { t } from "../utils/i18n.js";

const MAX = 5;

export function initRatings(root = document) {
  root.querySelectorAll("[data-rating]").forEach((row) => applyRating(row));
}

// « 4,9 », « 4.9 » ou « 4,9/5 » → 4.9
function parseRating(value) {
  const number = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), MAX) : null;
}

export function applyRating(row, value = row.getAttribute("data-rating")) {
  const rating = parseRating(value);
  if (rating === null) return;
  [...row.children].forEach((star, i) => {
    const fill = Math.min(Math.max(rating - i, 0), 1);
    star.style.setProperty("--star-fill", `${Math.round(fill * 100)}%`);
  });
  const label = String(rating).replace(".", t("rating.decimal"));
  row.setAttribute("aria-label", t("rating.label", { value: label }));
}
