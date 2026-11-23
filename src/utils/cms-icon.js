// src/utils/cms-icon.js — icône choisie dans le CMS (champ Option, ex.
// Pictogramme des Services) sur un composant qui n'a que des interrupteurs
// d'icône (ex. Label) : on remplace la classe ico-… affichée par celle du CMS.
//
// STRUCTURE (attribut à poser dans Webflow) :
//   [data-ico]            relié au champ Option (valeur = nom de l'icône,
//                         ex. « calendar » → classe ico-calendar)
//     … .ico-xxx          l'icône affichée par défaut dans le composant
//
// Valeur vide : l'icône par défaut reste.

export function initCmsIcons(root = document) {
  root.querySelectorAll("[data-ico]").forEach((el) => {
    const name = el.getAttribute("data-ico").trim().toLowerCase();
    if (!name) return;
    const icon = el.querySelector("[class^='ico-'], [class*=' ico-']");
    if (!icon) return;
    [...icon.classList].filter((c) => c.startsWith("ico-")).forEach((c) => icon.classList.remove(c));
    icon.classList.add(`ico-${name}`);
  });
}
