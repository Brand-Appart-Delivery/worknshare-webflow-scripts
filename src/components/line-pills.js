// src/components/line-pills.js — composant Webflow « Pastille ligne » (.ligne)
// dans les listes CMS « Lignes » (pages espace…).
//
// STRUCTURE (Webflow) :
//   .ligne[data-line-mode="Métro"]   mode (prop Mode, liée au champ Mode du CMS)
//     .transport-mode > .ligne_mode-m / -rer / -train / -tram / -bus
//     .ligne_indice                  « 14 », « A », « T2 »… (prop Indice, liée au CMS)
//
// La couleur officielle vient normalement de la variante du composant. Quand
// elle n'est pas liée au CMS (variante « base »), le JS pose data-line="metro-14"
// sur la pastille : couleur et forme viennent alors du CSS (_transport-lines.scss,
// même palette que les autres pastilles du site).

const PREFIX = { Métro: "metro-", RER: "rer-", Train: "train-", Tram: "tram-", Bus: "bus-" };

export function initLinePills(root = document) {
  root.querySelectorAll(".ligne[data-line-mode]").forEach((pill) => {
    const prefix = PREFIX[pill.getAttribute("data-line-mode")];
    const indice = pill.querySelector(".ligne_indice")?.textContent.trim().toLowerCase();
    if (!prefix || !indice) return;
    // Tram : l'indice contient déjà le « T » (T2 -> tram-t2)
    pill.setAttribute("data-line", `${prefix}${indice}`);
  });
}
