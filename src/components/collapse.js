// src/components/collapse.js — module d'exemple.
//
// STRUCTURE (attributs à poser dans Webflow) :
//   [data-collapse]             conteneur, reçoit la classe .is-open
//     [data-collapse-trigger]   bouton qui ouvre / ferme
//     [data-collapse-content]   contenu masqué (le CSS gère l'ouverture)

export function initCollapses(root = document) {
  root.querySelectorAll("[data-collapse]").forEach((el) => {
    const trigger = el.querySelector("[data-collapse-trigger]");
    const content = el.querySelector("[data-collapse-content]");
    if (!trigger || !content) return;

    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", (e) => {
      // Déclencheur en lien Webflow (href="#") : pas de saut en haut de page
      if (trigger.tagName === "A") e.preventDefault();
      const isOpen = !el.classList.contains("is-open");
      el.classList.toggle("is-open", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
    });
  });
}
