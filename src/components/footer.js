// src/components/footer.js — pied de page (composant Webflow « Footer »).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-footer-year]   texte du copyright (« © 2026 Work & Share ») :
//                        l'année est remplacée par l'année en cours.

export function initFooter(root = document) {
  const year = String(new Date().getFullYear());
  root.querySelectorAll("[data-footer-year]").forEach((el) => {
    // On ne touche qu'aux nœuds texte pour garder le « & » et le reste intact
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (/\b(19|20)\d{2}\b/.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/\b(19|20)\d{2}\b/, year);
        break;
      }
    }
  });
}
