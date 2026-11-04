// src/components/toc.js — sommaire d'un texte long (article de blog, pages
// légales) : liens vers les intertitres h2 et lien actif pendant la lecture.
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-toc]                 nav du sommaire (ex. .post-toc, aria-label="Sommaire")
//     [data-toc-list]          conteneur des liens (optionnel : créé sinon)
//   [data-toc-source]          texte riche dont on lit les h2
//
// Si la liste ne contient aucun lien, elle est construite depuis les h2 du
// texte (classe .post-toc_link). Les h2 sans id en reçoivent un, tiré de leur
// texte (« 1. Définitions » → #definitions). Le défilement vers l'ancre est
// géré par core.js (header et Lenis compris).
//
// OPTIONS (sur [data-toc]) :
//   data-toc-levels="h2,h3"    intertitres repris (h2 par défaut)
//
// État : .is-active + aria-current="true" sur le lien de la partie lue.
// Sans intertitre, le sommaire est masqué.

const ACTIVE_LINE = 0.3; // part de la hauteur d'écran où une partie devient « en cours »

export function initTocs(root = document) {
  root.querySelectorAll("[data-toc]").forEach(initToc);
}

// « 1. Quelles sont les Données ? » → « quelles-sont-les-donnees »
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^\s*\d+\s*[.)-]?\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function initToc(nav) {
  const source = document.querySelector("[data-toc-source]");
  if (!source) return;
  const levels = nav.getAttribute("data-toc-levels") || "h2";
  const headings = [...source.querySelectorAll(levels)].filter((h) => h.textContent.trim());
  if (!headings.length) {
    nav.hidden = true;
    return;
  }

  // Ids des intertitres (uniques dans la page)
  const used = new Set();
  headings.forEach((h) => {
    if (!h.id) {
      let id = slugify(h.textContent) || "partie";
      let n = 2;
      while (used.has(id) || document.getElementById(id)) id = `${slugify(h.textContent)}-${n++}`;
      h.id = id;
    }
    used.add(h.id);
  });

  // Liste : on garde les liens posés dans Webflow, sinon on la construit
  let list = nav.querySelector("[data-toc-list]");
  let links = [...nav.querySelectorAll('a[href^="#"]')];
  if (!links.length) {
    if (!list) {
      list = document.createElement("div");
      list.className = "post-toc_list";
      nav.appendChild(list);
    }
    links = headings.map((h) => {
      const a = document.createElement("a");
      a.className = "post-toc_link";
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();
      list.appendChild(a);
      return a;
    });
  }

  // Sommaire repliable (mobile, [data-collapse]) : se referme au clic sur un lien
  const collapse = nav.closest("[data-collapse]");
  // (écoute sur window en capture : core.js arrête le clic des ancres sur document)
  if (collapse) {
    window.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest?.('a[href^="#"]');
        if (!link || !nav.contains(link) || !collapse.classList.contains("is-open")) return;
        // Fermeture sans animation : la page est à sa hauteur finale quand
        // core.js calcule la position de l'intertitre
        const content = collapse.querySelector("[data-collapse-content]");
        if (content) content.style.transition = "none";
        collapse.querySelector("[data-collapse-trigger]")?.click();
        if (content) {
          void content.offsetHeight;
          requestAnimationFrame(() => (content.style.transition = ""));
        }
      },
      true
    );
  }

  // Lien ↔ intertitre
  const pairs = links
    .map((link) => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((p) => p.heading);
  if (!pairs.length) return;

  let current = null;
  const setActive = (pair) => {
    if (pair === current) return;
    current = pair;
    pairs.forEach(({ link }) => {
      const on = pair && link === pair.link;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  // Partie en cours : dernier intertitre passé au-dessus de la ligne de lecture
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.innerHeight * ACTIVE_LINE;
    let active = null;
    pairs.forEach((p) => {
      if (p.heading.getBoundingClientRect().top <= line) active = p;
    });
    setActive(active || pairs[0]);
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
