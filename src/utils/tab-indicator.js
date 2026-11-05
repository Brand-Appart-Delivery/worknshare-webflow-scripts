// src/utils/tab-indicator.js — fond qui glisse sous l'onglet actif d'une barre
// d'onglets (même animation pour « Quelle formule pour vous ? » et pour les
// onglets de recherche Bureaux / Salles).
//
// Utilisation :
//   const indicator = createTabIndicator(tablist, { getActive: () => tabActif });
//   indicator.move();            // après chaque changement d'onglet
//   indicator.move(false);       // sans animation (placement initial)
//
// Groupe de pastilles (role="radio") : createSegmentedIndicator(groupe, getActive)
// reprend la couleur de fond de la pastille active posée dans Webflow.
//
// Le JS ajoute dans la barre un <span class="tab-indicator"> et la classe
// .is-sliding sur la barre. Couleurs et transitions : _tab-indicator.scss.
// Le thème de l'onglet (attribut themeAttr, ex. data-formula-theme) est recopié
// sur le fond en data-theme pour changer sa couleur.

export function createTabIndicator(tablist, { getActive, themeAttr = null, className = "" } = {}) {
  const indicator = document.createElement("span");
  indicator.className = `tab-indicator ${className}`.trim();
  indicator.setAttribute("aria-hidden", "true");
  tablist.prepend(indicator);
  tablist.classList.add("is-sliding");

  let animatingUntil = 0; // fin du glissement en cours

  function move(animate = true) {
    const tab = getActive();
    if (animate) animatingUntil = performance.now() + 450;
    if (!tab || !tab.offsetWidth) return; // barre masquée (mobile, onglet replié…)
    if (!animate) indicator.classList.add("is-instant");
    indicator.style.width = `${tab.offsetWidth}px`;
    indicator.style.height = `${tab.offsetHeight}px`;
    indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
    if (themeAttr) indicator.setAttribute("data-theme", tab.getAttribute(themeAttr) || "");
    if (!animate) {
      indicator.getBoundingClientRect(); // applique la position avant de réactiver la transition
      indicator.classList.remove("is-instant");
    }
  }

  // Taille des onglets qui change (police chargée, redimensionnement) : on recale.
  // Pendant un glissement (la pastille active peut changer de largeur), on
  // réajuste la cible sans couper l'animation.
  const recalc = () => move(performance.now() < animatingUntil);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(recalc).observe(tablist);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => move(false));
  move(false);

  return { move, element: indicator };
}

// Pastilles « segmented » (role="radio" ou "tab") : même fond glissant. Par
// défaut à la couleur de la pastille active dans Webflow (lue avant que le CSS
// ne la rende transparente) ; copyColor: false = couleur donnée par le CSS.
export function createSegmentedIndicator(group, getActive, { copyColor = true } = {}) {
  const active = getActive();
  const color = copyColor && active ? getComputedStyle(active).backgroundColor : "";
  group.classList.add("is-segmented");
  const indicator = createTabIndicator(group, { getActive, className: "segmented-indicator" });
  if (color && color !== "rgba(0, 0, 0, 0)") indicator.element.style.backgroundColor = color;
  return indicator;
}
