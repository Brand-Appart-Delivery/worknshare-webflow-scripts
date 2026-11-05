// src/index.js — point d'entrée du bundle (compilé en /main.js).
//
// Chaque module exporte initXxx(root = document) et ne fait rien si sa
// section est absente de la page. L'ordre compte :
//   - transformations du contenu CMS (rich text, embeds) avant tout ce qui
//     lit l'article ;
//   - animations et sections épinglées en dernier, mesurées sur la mise en
//     page finale.
// Ajouter une fonctionnalité : créer son fichier, l'importer ici, l'appeler.

import { onReady } from "./utils/on-ready.js";
import { initCore } from "./core/core.js";
import { initCollapses } from "./components/collapse.js";
import { initNav } from "./components/nav.js";
import { initFooter } from "./components/footer.js";
import { initFormulas } from "./components/formula.js";
import { initSliders } from "./components/slider.js";
import { initPhotoSliders } from "./components/photo-slider.js";
import { initCounters } from "./animations/counter.js";
import { initReveal } from "./animations/reveal.js";
import { initCardsStack } from "./animations/cards-stack.js";
import { initStackReveal } from "./animations/stack-reveal.js";
import { initBentoReveal } from "./animations/bento-reveal.js";
import { initStars } from "./animations/stars.js";
import { initWiden } from "./animations/widen.js";
import { initExpand } from "./animations/expand.js";
import { initHeroVideo } from "./components/hero-video.js";
import { initHeroIntro } from "./animations/hero-intro.js";
import { initSpacesMap } from "./components/spaces-map.js";
import { initSpaceMaps } from "./components/space-map.js";
import { initSpaceGalleries } from "./components/space-gallery.js";
import { initVisitForms } from "./components/visit-form.js";
import { initSpaceSearch } from "./components/space-search.js";
import { initTocs } from "./components/toc.js";
import { initCardLinks } from "./components/card-link.js";
import { initComparateur } from "./components/comparateur.js";
import { initComparatorBanners } from "./components/comparator-banner.js";
import { initBlogFilters } from "./components/blog-filter.js";
import { initContactForms } from "./components/contact-form.js";
import { initDevisForms } from "./components/devis-form.js";
import { initFormLabels } from "./utils/form-labels.js";
import { initHouseShapes } from "./components/house-shape.js";
import { initCustomSelects } from "./components/custom-select.js";
import { initMiniMaps } from "./components/mini-map.js";
import { initLinePills } from "./components/line-pills.js";
import { initPageSchema } from "./schema/page-schema.js";

onReady(() => {
  initCore();
  initNav();
  initHeroIntro();
  initHeroVideo(); // tôt : le hero est la première chose visible
  initFooter();
  initCollapses();
  initTocs(); // sommaires (article, pages légales) : avant les animations
  initCardLinks();
  initLinePills(); // pastilles de lignes (couleur selon la ligne)
  initPageSchema(); // JSON-LD : fil d'Ariane et FAQ de la page
  initComparateur(); // page /comparateur : charge son propre JS et CSS
  initComparatorBanners(); // bandeau qui pré-remplit le comparateur
  initBlogFilters(); // page Blog : filtre par rubrique
  initFormLabels(); // libellés reliés à leurs champs (tous les formulaires)
  initContactForms(); // page Nous contacter
  initDevisForms(); // page Événementiel : formulaire de devis
  initHouseShapes(); // formes maison aux angles arrondis
  initFormulas();
  initSliders();
  initPhotoSliders();
  initCounters();
  initReveal();
  initCardsStack();
  initStackReveal(); // cartes empilées qui se dévoilent au scroll
  initBentoReveal();
  initStars(); // après le bento : lit le délai de chaque carte
  initWiden();
  initExpand();
  // Carte avant la recherche : la recherche envoie ses événements au module carte
  initSpacesMap();
  initSpaceMaps();
  initSpaceGalleries();
  initVisitForms();
  initSpaceSearch();
  initMiniMaps(); // carte du mega menu « Nos espaces »
  initCustomSelects(); // en dernier : lit les valeurs pré-remplies des formulaires
});

console.log(`%c[Work'n'Share] main.js — build ${__BUILD_DATE__}`, "color:#7dd3fc");
