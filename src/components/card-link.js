// src/components/card-link.js — rend une carte entière cliquable quand elle ne
// peut pas être un lien dans Webflow (ex. cartes bento « Salles de réunion et
// événements » du gabarit Espace).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-card-link="/url"]      carte : lien direct
//   [data-card-link=""]          carte : reprend le lien de [data-card-link-source]
//                                 de la même section
//   [data-card-link-source]      lien de référence (ex. « Voir les salles de Clichy »)
//
// Clic ou Entrée : ouvre le lien. Ctrl / Cmd + clic ou clic molette : nouvel onglet.
// Nom accessible : texte de la carte. Une carte sans lien trouvé reste inerte.

export function initCardLinks(root = document) {
  root.querySelectorAll("[data-card-link]").forEach(initCardLink);
}

function resolveHref(card) {
  const own = card.getAttribute("data-card-link");
  if (own) return own;
  const scope = card.closest("section") || document;
  const source = scope.querySelector("[data-card-link-source][href]");
  const href = source?.getAttribute("href");
  return href && href !== "#" ? href : "";
}

function initCardLink(card) {
  const href = resolveHref(card);
  if (!href) return;

  card.classList.add("is-card-link");
  card.setAttribute("role", "link");
  card.setAttribute("tabindex", "0");
  if (!card.hasAttribute("aria-label")) {
    // Textes d'origine séparés par une espace (« Jusqu’à 170 participants »),
    // sans les majuscules d'affichage que donnerait innerText
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
    const label = parts.join(" ").replace(/\s+/g, " ").trim();
    if (label) card.setAttribute("aria-label", label);
  }

  const go = (newTab) => {
    if (newTab) window.open(href, "_blank", "noopener");
    else window.location.href = href;
  };

  card.addEventListener("click", (e) => {
    // Un vrai lien dans la carte garde son propre comportement
    if (e.target.closest("a, button") && e.target.closest("a, button") !== card) return;
    go(e.metaKey || e.ctrlKey);
  });
  card.addEventListener("auxclick", (e) => {
    if (e.button === 1) go(true);
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go(false);
  });
}
