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
    // Mesures au sous-pixel près : offsetWidth / offsetLeft arrondissent au
    // pixel, et les onglets en flex: 1 ont des largeurs à virgule (fond décalé
    // ou rogné d'1 à 2 px d'un côté). Position relative à l'intérieur de la
    // bordure de la barre, comme le fond (position: absolute).
    // getBoundingClientRect mesure à l'écran, zoom compris (ex. carte qui
    // grandit au scroll, animations/expand.js) : on divise par l'échelle de
    // la barre pour revenir en pixels CSS.
    const box = tab.getBoundingClientRect();
    const bar = tablist.getBoundingClientRect();
    const scale = tablist.offsetWidth ? bar.width / tablist.offsetWidth : 1;
    const x = (box.left - bar.left) / scale - tablist.clientLeft;
    const y = (box.top - bar.top) / scale - tablist.clientTop;
    indicator.style.width = `${box.width / scale}px`;
    indicator.style.height = `${box.height / scale}px`;
    indicator.style.transform = `translate(${x}px, ${y}px)`;
    if (themeAttr) indicator.setAttribute("data-theme", tab.getAttribute(themeAttr) || "");
    if (!animate) {
      indicator.getBoundingClientRect(); // applique la position avant de réactiver la transition
      indicator.classList.remove("is-instant");
    }
  }

  // Taille des onglets qui change (police chargée, redimensionnement, libellés
  // courts en mobile) : on recale. On observe aussi chaque onglet, car leur
  // taille peut changer sans que celle de la barre bouge. Pendant un glissement
  // (la pastille active peut changer de largeur), on réajuste la cible sans
  // couper l'animation.
  const recalc = () => move(performance.now() < animatingUntil);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(recalc);
    observer.observe(tablist);
    [...tablist.children].forEach((child) => child !== indicator && observer.observe(child));
  }
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
