// src/schema/page-schema.js — données structurées (JSON-LD) tirées de la page.
//
// Deux blocs, générés depuis le contenu affiché (donc toujours à jour avec le CMS) :
//   - BreadcrumbList : depuis le fil d'Ariane nav.breadcrumb
//       a.breadcrumb_link (pages parentes) + .breadcrumb_current (page courante)
//   - FAQPage : depuis les questions .faq_item
//       .faq_question (question) + .faq_answer (réponse)
//
// Rien n'est ajouté si la page porte déjà un bloc du même type (ex. FAQPage posé
// dans les réglages de la page Événementiel). Les autres données (Organization,
// LocalBusiness des espaces) sont dans les réglages de page Webflow.

const clean = (text) => (text || "").replace(/\s+/g, " ").trim();

export function initPageSchema(root = document) {
  const existing = existingTypes();
  const blocks = [];

  if (!existing.has("BreadcrumbList")) {
    const breadcrumb = buildBreadcrumb(root.querySelector("nav.breadcrumb"));
    if (breadcrumb) blocks.push(breadcrumb);
  }
  if (!existing.has("FAQPage")) {
    const faq = buildFaq(root);
    if (faq) blocks.push(faq);
  }

  blocks.forEach((data) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({ "@context": "https://schema.org", ...data });
    document.head.appendChild(script);
  });
}

// Types déjà présents dans la page (@type simple ou @graph)
function existingTypes() {
  const types = new Set();
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent);
      [data, ...(data["@graph"] || [])].forEach((d) => d && d["@type"] && types.add(d["@type"]));
    } catch (e) {
      /* bloc illisible : ignoré */
    }
  });
  return types;
}

function buildBreadcrumb(nav) {
  if (!nav) return null;
  const items = [];
  nav.querySelectorAll("a.breadcrumb_link, .breadcrumb_current").forEach((el) => {
    const name = clean(el.textContent);
    if (!name) return;
    const href = el.matches("a") ? el.getAttribute("href") : location.pathname;
    // Adresse finale, sans barre de fin (évite une redirection)
    const url = new URL(href, location.origin);
    url.pathname = url.pathname.replace(/(.)\/$/, "$1");
    items.push({ name, url: url.href });
  });
  if (items.length < 2) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildFaq(root) {
  const entities = [];
  root.querySelectorAll(".faq_item").forEach((item) => {
    // Question masquée (liste vide, élément caché par Webflow) : ignorée
    if (item.closest(".w-condition-invisible, .w-dyn-empty, [hidden]")) return;
    const question = clean(item.querySelector(".faq_question")?.textContent);
    const answer = clean(item.querySelector(".faq_answer")?.textContent);
    if (!question || !answer) return;
    entities.push({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    });
  });
  if (!entities.length) return null;
  return { "@type": "FAQPage", mainEntity: entities };
}
