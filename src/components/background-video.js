// src/components/background-video.js — vidéos de fond Webflow hors hero
// (ex. bandeau « Bail commercial ou Work & Share ? » de l'accueil).
//
// STRUCTURE (Webflow) : élément « Background Video » (.w-background-video),
// en lecture auto, en boucle, sans attribut à poser ; ou élément personnalisé
// <video data-loop-video autoplay muted loop playsinline poster=…> (ex. bandeau
// de Bureaux flexibles, l'API ne sait pas créer de Background Video).
//
// Le JS : vidéo en pause si l'utilisateur a réduit les animations (l'image
// d'attente reste affichée), et lue seulement quand elle est à l'écran
// (onglet masqué ou bloc hors écran : en pause). Le hero a son propre
// module (hero-video.js), avec un bouton pause.

import { prefersReducedMotion, onMotionPreferenceChange } from "../utils/motion.js";

export function initBackgroundVideos(root = document) {
  const videos = [...root.querySelectorAll(".w-background-video video, video[data-loop-video]")].filter(
    (video) => !video.closest("[data-hero-video]"),
  );
  if (!videos.length) return;

  const visible = new Set();

  const sync = (video) => {
    if (!prefersReducedMotion() && visible.has(video)) {
      const p = video.play();
      if (p && p.catch) p.catch(() => {}); // lecture auto bloquée : l'image d'attente reste
    } else {
      video.pause();
    }
  };

  videos.forEach((video) => {
    // Webflow retire loop et muted des <video> posées en élément personnalisé
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("aria-hidden", "true"); // décor : pas d'information
    if (prefersReducedMotion()) video.pause();
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
        sync(e.target);
      }),
    );
    videos.forEach((video) => io.observe(video));
  } else {
    videos.forEach((video) => {
      visible.add(video);
      sync(video);
    });
  }

  onMotionPreferenceChange(() => videos.forEach(sync));
}
