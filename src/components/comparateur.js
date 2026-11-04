// src/components/comparateur.js — charge le comparateur « Bail commercial ou
// bureau flexible » (src/comparateur/), seulement sur sa page.
//
// STRUCTURE (Webflow, voir src/comparateur/comparateur.html) :
//   section.enc [data-comparateur]   en-tête (titre Webflow + HtmlEmbed des champs)
//   HtmlEmbed div.res#res            résultat et appel final
//
// comparateur.css puis comparateur.js sont chargés depuis le même dossier que
// main.js (même version). Le bloc reste masqué tant que ses styles ne sont pas
// là (classe is-ready), pour éviter un flash de contenu brut.

import { loadScript, loadStyle, ASSET_BASE } from "../utils/load-asset.js";

export function initComparateur(root = document) {
  const el = root.querySelector("[data-comparateur]");
  if (!el || el.dataset.comparateurInit) return;
  el.dataset.comparateurInit = "1";

  const show = () => el.classList.add("is-ready");
  loadStyle(`${ASSET_BASE}comparateur.css`)
    .then(show, show)
    .then(() => loadScript(`${ASSET_BASE}comparateur.js`))
    .catch((err) => console.warn("[Work'n'Share] comparateur :", err.message));
}
