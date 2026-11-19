// src/components/contact-float.js — bouton flottant « Nous contacter »
// (composant Footer) : visible seulement une fois le hero dépassé.
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-contact-float]   bloc fixe en bas à droite (classe contact-float)
//   [data-hero]            hero de la page (facultatif) : sinon la première
//                          <section> de la page
//
// ÉTAT : .is-visible sur [data-contact-float] quand le bas du hero est
// passé au-dessus de l'écran (styles : _contact-float.scss).
// Sans hero trouvé, le bouton est visible tout de suite.

export function initContactFloat(root = document) {
  const float = root.querySelector("[data-contact-float]");
  if (!float) return;

  const hero = document.querySelector("[data-hero]") || firstSection();
  if (!hero || !("IntersectionObserver" in window)) {
    float.classList.add("is-visible");
    return;
  }

  // Visible quand le hero est sorti de l'écran PAR LE HAUT (pas avant
  // d'y être arrivé, ex. rechargement en milieu de page puis remontée)
  new IntersectionObserver(([entry]) => {
    const passed = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
    float.classList.toggle("is-visible", passed);
  }).observe(hero);
}

// Première section du contenu (hors header et footer)
function firstSection() {
  const main = document.querySelector("main, .page-wrapper") || document.body;
  return [...main.querySelectorAll("section")].find((el) => !el.closest("header, nav, footer"));
}
