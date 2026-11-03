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
import { initCounters } from "./animations/counter.js";
import { initReveal } from "./animations/reveal.js";
import { initWiden } from "./animations/widen.js";
import { initHeroIntro } from "./animations/hero-intro.js";
import { initSpacesMap } from "./components/spaces-map.js";
import { initSpaceSearch } from "./components/space-search.js";

onReady(() => {
  initCore();
  initNav();
  initHeroIntro(); // tôt : le hero est la première chose visible
  initFooter();
  initCollapses();
  initFormulas();
  initSliders();
  initCounters();
  initReveal();
  initWiden();
  // Carte avant la recherche : la recherche envoie ses événements au module carte
  initSpacesMap();
  initSpaceSearch();
});

console.log(`%c[Work'n'Share] main.js — build ${__BUILD_DATE__}`, "color:#7dd3fc");
