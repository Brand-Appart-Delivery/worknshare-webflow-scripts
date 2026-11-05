// src/utils/cms-links.js — liens vers une fiche CMS dans une liste imbriquée.
//
// Dans un gabarit (page d'article, page d'espace), une liste CMS imbriquée
// (espaces liés, « Près de… », « À lire aussi ») ne sait pas lier ses cartes à
// leur fiche : Webflow sort href="#". On reconstruit donc le lien :
//
// STRUCTURE (attributs posés dans Webflow sur le lien de la carte) :
//   a[data-cms-link="/espaces"]   début de l'adresse (dossier de la collection)
//    [data-cms-slug="clichy"]     slug de la fiche, lié au champ Slug du CMS
//
// Résultat : /espaces/clichy (préfixé /en en anglais).

import { getLang, LOCALES } from "./i18n.js";

export function initCmsLinks(root = document) {
  const prefix = (LOCALES[getLang()] || {}).prefix || "";
  root.querySelectorAll("a[data-cms-link][data-cms-slug]").forEach((link) => {
    const slug = link.getAttribute("data-cms-slug").trim();
    if (!slug) return;
    const base = link.getAttribute("data-cms-link").replace(/\/$/, "");
    link.setAttribute("href", `${prefix}${base}/${slug}`);
  });
}
