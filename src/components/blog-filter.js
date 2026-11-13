// src/components/blog-filter.js — filtre des articles du blog par rubrique.
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-blog-filters]                 groupe de boutons (liens role="button")
//     [data-filter="all"]               « Toutes les rubriques »
//     [data-filter="<slug rubrique>"]   une pastille par rubrique
//   [data-blog-list]                    liste CMS des articles
//     [data-category="<slug rubrique>"] carte d'article (dans chaque w-dyn-item)
//
// Le bouton choisi prend les classes is-active et is-chip-on (styles posés
// dans Webflow ; is-chip-on = état sélectionné du composant « Chip rubrique »,
// une couleur par variante) et aria-pressed="true". La rubrique est gardée dans l'adresse (?rubrique=slug) :
// un lien partagé ou un retour arrière retrouve le même filtre.
//
// Avec la pagination (pagination.js) : toutes les pages d'articles sont
// chargées dans la liste, le filtre porte donc sur tous les articles. Les
// articles écartés reçoivent data-filtered-out ; la liste émet « wns:filter »
// et la pagination recalcule ses pages. Quand elle ajoute des articles
// (« wns:items-added »), le filtre en cours leur est appliqué.

import { t } from "../utils/i18n.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";

const PARAM = "rubrique";

export function initBlogFilters(root = document) {
  const group = root.querySelector("[data-blog-filters]");
  const list = root.querySelector("[data-blog-list]");
  if (!group || !list || group.dataset.blogFilterInit) return;
  group.dataset.blogFilterInit = "1";

  const buttons = [...group.querySelectorAll("[data-filter]")];
  // Élément de liste CMS de chaque carte (c'est lui qu'on masque). Relu à
  // chaque filtre : la pagination ajoute des articles après coup.
  const getItems = () =>
    [...list.querySelectorAll("[data-category]")].map((card) => ({
      el: card.closest(".w-dyn-item") || card,
      category: card.getAttribute("data-category"),
    }));
  if (!buttons.length || !getItems().length) return;

  // Annonce du nombre d'articles pour les lecteurs d'écran
  const status = document.createElement("p");
  status.className = "blog-filters_status";
  status.setAttribute("role", "status");
  group.after(status);

  const known = new Set(buttons.map((b) => b.getAttribute("data-filter")));

  let current = "all";

  const apply = (filter, { announce = true, updateUrl = true, reset = true } = {}) => {
    if (!known.has(filter)) filter = "all";
    current = filter;

    buttons.forEach((btn) => {
      const on = btn.getAttribute("data-filter") === filter;
      btn.classList.toggle("is-active", on);
      // Composant « Chip rubrique » : couleurs de l'état sélectionné réglées
      // dans Webflow, par variante, sur la combo is-chip-on
      btn.classList.toggle("is-chip-on", on);
      btn.setAttribute("aria-pressed", String(on));
    });

    let count = 0;
    getItems().forEach(({ el, category }) => {
      const show = filter === "all" || category === filter;
      el.hidden = !show;
      el.toggleAttribute("data-filtered-out", !show);
      if (show) count++;
    });

    if (announce) status.textContent = count === 1 ? t("blog.countOne") : t("blog.count", { n: count });

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (filter === "all") url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, filter);
      history.replaceState(history.state, "", url);
    }

    // Pagination : recalcul des pages (retour à la page 1 si l'utilisateur
    // vient de changer de filtre)
    list.dispatchEvent(new CustomEvent("wns:filter", { detail: { filter, reset } }));

    // Hauteur de page modifiée : recalcul des animations au scroll
    requestScrollRefresh();
  };

  // Articles ajoutés par la pagination : on leur applique le filtre en cours
  list.addEventListener("wns:items-added", () =>
    apply(current, { announce: false, updateUrl: false, reset: false }),
  );

  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); // lien Webflow href="#" : pas de saut en haut de page
      apply(btn.getAttribute("data-filter"));
    });
    // Espace sur un lien role="button" : même effet qu'un clic
    btn.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    });
  });

  // Filtre présent dans l'adresse à l'arrivée sur la page
  const initial = new URLSearchParams(window.location.search).get(PARAM);
  if (initial && known.has(initial)) apply(initial, { announce: false, updateUrl: false, reset: false });
}
