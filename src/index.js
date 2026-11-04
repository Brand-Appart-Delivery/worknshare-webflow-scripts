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

onReady(() => {
  initCore();
  initNav();
  initHeroIntro();
  initHeroVideo(); // tôt : le hero est la première chose visible
  initFooter();
  initCollapses();
  initTocs(); // sommaires (article, pages légales) : avant les animations
  initCardLinks();
  initComparateur(); // page /comparateur : charge son propre JS et CSS
  initFormulas();
  initSliders();
  initPhotoSliders();
  initCounters();
  initReveal();
  initCardsStack();
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
});

console.log(`%c[Work'n'Share] main.js — build ${__BUILD_DATE__}`, "color:#7dd3fc");
