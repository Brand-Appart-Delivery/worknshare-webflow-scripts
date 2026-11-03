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

const ICON_PLAY = '<svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" aria-hidden="true"><path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor"/></svg>';

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
