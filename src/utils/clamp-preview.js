// src/utils/clamp-preview.js — ESSAI des titres fluides (clamp), pour comparer.
// ?clamp=1 l'active, ?clamp=0 le coupe ; le choix est gardé pendant la visite
// (sessionStorage). Styles : _clamp-preview.scss. À retirer ou à généraliser
// une fois la décision prise.

const KEY = "wns-clamp";

export function initClampPreview() {
  let on = false;
  try {
    const param = new URLSearchParams(location.search).get("clamp");
    if (param === "1") sessionStorage.setItem(KEY, "1");
    if (param === "0") sessionStorage.removeItem(KEY);
    on = sessionStorage.getItem(KEY) === "1";
  } catch (e) {
    on = new URLSearchParams(location.search).get("clamp") === "1";
  }
  document.documentElement.classList.toggle("is-clamp", on);
}
