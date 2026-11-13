// src/utils/visit.js — première page vue dans l'onglet, ou pas ?
//
// Les animations d'arrivée (nav, hero de l'accueil) ne se jouent qu'à la
// première page vue de la session. Le head code Webflow (webflow/head-code.html)
// le décide avant l'affichage et pose html.is-return-visit sur les pages
// suivantes (+ html.wns-visit-known). Si le head code n'est pas à jour, on le
// décide ici (plus tard : la nav a pu commencer son animation).

const KEY = "wns-visited";

let returnVisit = null;

export function isReturnVisit() {
  if (returnVisit !== null) return returnVisit;
  const root = document.documentElement;
  if (root.classList.contains("wns-visit-known")) {
    returnVisit = root.classList.contains("is-return-visit");
    return returnVisit;
  }
  // Repli (ancien head code)
  returnVisit = false;
  try {
    returnVisit = !!sessionStorage.getItem(KEY);
    if (!returnVisit) sessionStorage.setItem(KEY, "1");
  } catch (e) {
    // stockage bloqué : on joue les animations
  }
  if (returnVisit) root.classList.add("is-return-visit");
  root.classList.add("wns-visit-known");
  return returnVisit;
}
