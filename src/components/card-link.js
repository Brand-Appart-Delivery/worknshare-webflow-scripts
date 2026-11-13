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
// Clic sur la carte : ouvre le lien. Ctrl / Cmd + clic ou clic molette : nouvel
// onglet. Clavier et lecteurs d'écran : un vrai lien (caché, .card-link_anchor)
// est ajouté dans la carte, nommé d'après son texte ; la carte s'entoure au
// focus (_card-link.scss). Une carte sans lien trouvé reste inerte.

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
  // Vrai lien pour le clavier et les lecteurs d'écran (role="link" n'est pas
  // permis sur un article). Nom : textes d'origine de la carte séparés par une
  // espace (« Jusqu’à 170 participants »), sans les majuscules d'affichage
  // que donnerait innerText.
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  const anchor = document.createElement("a");
  anchor.className = "card-link_anchor";
  anchor.href = href;
  anchor.textContent = card.getAttribute("aria-label") || parts.join(" ").replace(/\s+/g, " ").trim();
  card.removeAttribute("aria-label");
  card.appendChild(anchor);

  const go = (newTab) => {
    if (newTab) window.open(href, "_blank", "noopener");
    else window.location.href = href;
  };

  card.addEventListener("click", (e) => {
    // Un vrai lien dans la carte (dont le lien caché) garde son propre comportement
    if (e.target.closest("a, button") && e.target.closest("a, button") !== card) return;
    go(e.metaKey || e.ctrlKey);
  });
  card.addEventListener("auxclick", (e) => {
    if (e.button === 1) go(true);
  });
}
