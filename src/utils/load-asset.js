// src/utils/load-asset.js — charge un script ou une feuille de style externe à la demande
// (ex. MapLibre, seulement quand la carte approche de l'écran). Un même fichier
// n'est chargé qu'une fois, même si plusieurs modules le demandent.

const cache = new Map();

export function loadScript(src) {
  if (!cache.has(src)) {
    cache.set(
      src,
      new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src;
        el.async = true;
        el.onload = resolve;
        el.onerror = () => reject(new Error(`Échec du chargement : ${src}`));
        document.head.appendChild(el);
      }),
    );
  }
  return cache.get(src);
}

export function loadStyle(href) {
  if (!cache.has(href)) {
    cache.set(
      href,
      new Promise((resolve, reject) => {
        const el = document.createElement("link");
        el.rel = "stylesheet";
        el.href = href;
        el.onload = resolve;
        el.onerror = () => reject(new Error(`Échec du chargement : ${href}`));
        document.head.appendChild(el);
      }),
    );
  }
  return cache.get(href);
}

// Dossier d'où vient main.js (dev local, tunnel ou jsDelivr) : sert à charger
// les fichiers de données publiés à côté (ex. stations.json).
const currentSrc = document.currentScript && document.currentScript.src;
export const ASSET_BASE = currentSrc ? currentSrc.replace(/[^/]*$/, "") : "";
