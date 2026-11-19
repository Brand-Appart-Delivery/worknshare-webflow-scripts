// src/components/hero-video.js — vidéo de fond du hero de l'accueil.
//
// STRUCTURE (Webflow) :
//   [data-hero-video]                 section du hero
//     .w-background-video ou video    vidéo de fond (élément « Background
//                                     Video » de Webflow, son bouton désactivé)
//     [data-hero-video-toggle]        bouton pause / lecture du hero
//
// Ajoute .has-video sur le hero (le bouton pause
// ne s'affiche qu'avec une vidéo, cf. _hero-video.scss). Vidéo muette, en
// boucle, en lecture auto ; en pause d'office si l'utilisateur a réduit les
// animations. Le bouton change d'icône et de libellé (aria-label, aria-pressed).

import { prefersReducedMotion } from "../utils/motion.js";
import { t } from "../utils/i18n.js";

// Icône lecture pleine aux coins arrondis (forme Hugeicons « play »), assortie
// à l'icône pause posée dans Webflow (deux barres pleines arrondies). viewBox
// recadré : même poids visuel que la pause, décalée à droite pour paraître centrée
const ICON_PLAY = '<svg viewBox="1.8 2.4 19.2 19.2" width="100%" height="100%" aria-hidden="true"><path d="M18.89 12.846C18.536 14.189 16.86 15.138 13.509 17.036C10.27 18.871 8.651 19.788 7.346 19.42C6.806 19.267 6.314 18.977 5.917 18.575C5 17.631 5 15.754 5 12C5 8.246 5 6.369 5.917 5.425C6.314 5.023 6.806 4.733 7.346 4.58C8.651 4.212 10.27 5.129 13.509 6.964C16.86 8.862 18.536 9.811 18.89 11.154C19.037 11.708 19.037 12.292 18.89 12.846Z" fill="currentColor"/></svg>';

export function initHeroVideo(root = document) {
  const hero = root.querySelector("[data-hero-video]");
  const video = hero?.querySelector("video");
  if (!video) return;
  hero.classList.add("has-video");

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");

  const toggle = hero.querySelector("[data-hero-video-toggle]");
  const icon = toggle?.querySelector("span");
  const pauseIcon = icon?.innerHTML || "";

  const render = () => {
    if (!toggle) return;
    const paused = video.paused;
    toggle.setAttribute("aria-label", paused ? t("hero.play") : t("hero.pause"));
    toggle.setAttribute("aria-pressed", paused ? "true" : "false");
    if (icon) icon.innerHTML = paused ? ICON_PLAY : pauseIcon;
    hero.classList.toggle("is-video-paused", paused);
  };

  const play = () => {
    const p = video.play();
    if (p && p.catch) p.catch(() => render()); // lecture auto bloquée : bouton « lecture »
  };

  if (prefersReducedMotion()) video.pause();
  else if (video.paused) play();

  video.addEventListener("play", render);
  video.addEventListener("pause", render);

  if (toggle) {
    // Lien Webflow href="#" : pas de saut d'ancre
    if (toggle.tagName === "A") {
      toggle.removeAttribute("href");
      toggle.setAttribute("role", "button");
      toggle.setAttribute("tabindex", "0");
    }
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      if (video.paused) play();
      else video.pause();
    });
    toggle.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      toggle.click();
    });
  }
  render();
}
