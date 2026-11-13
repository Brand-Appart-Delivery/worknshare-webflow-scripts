// src/components/slider.js — sliders Swiper (chargé par Webflow, lu sur window.Swiper).
//
// STRUCTURE (attributs à poser dans Webflow) :
//   [data-slider]                 bloc du slider (section ou div)
//     [data-slider-track]         piste : ses enfants directs sont les slides
//                                 (marche aussi sur une Collection List CMS)
//     [data-slider-prev]          flèche précédente (optionnelle)
//     [data-slider-next]          flèche suivante (optionnelle)
//     [data-slider-dots]          conteneur des points de pagination (optionnel)
//
// OPTIONS (sur [data-slider]) :
//   data-slider-loop="true"       défilement en boucle
//   data-slider-autoplay="5000"   défilement automatique (ms), stoppé au survol
//   data-slider-center="true"     slide active centrée
//   data-slider-speed="600"       durée de transition (ms)
//   data-slider-per-view="3"      slides visibles en desktop (≥ 992 px)
//   data-slider-per-view-tablet="2.2"  de 768 à 991 px
//   data-slider-per-view-mobile="1.15" en dessous de 768 px
//   data-slider-mobile-only="true"  slider seulement en mobile et tablette
//                                 (≤ 991 px, avant que la grille passe en
//                                 colonne) : au-dessus, la grille Webflow reste
//                                 telle quelle (Swiper retiré si on agrandit).
//                                 En tablette : data-slider-per-view-tablet, sinon
//                                 2,2 slides si per-view-mobile est posé
//   data-slider-gap="edge"        les slides hors vue sont repoussées hors de la
//                                 page (marge jusqu'au bord de l'écran + 24 px) et
//                                 entrent / sortent par les côtés ; l'espace entre
//                                 les slides visibles reste celui de Webflow
//
// Navigation : flèches, points, clavier, glissé (souris / doigt) et glissé à
// deux doigts au trackpad (horizontal).
//
// Sans data-slider-per-view : largeur des slides donnée par Webflow
// (slidesPerView "auto"). L'espace entre slides reprend le gap de la piste.
// États : .is-disabled sur une flèche en bout de course, .is-active sur le point actif.
//
// Swiper est chargé ici, seulement sur les pages qui ont un [data-slider]
// (plus besoin de la balise dans le footer Webflow). S'il est déjà présent sur
// window (ancienne balise du footer), on s'en sert directement.

import { prefersReducedMotion } from "../utils/motion.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";
import { t } from "../utils/i18n.js";
import { SLIDER_QUERY } from "../utils/env.js";
import { loadScript } from "../utils/load-asset.js";

const SWIPER_SRC = "https://cdn.jsdelivr.net/npm/swiper@11.1.14/swiper-bundle.min.js";

const EDGE_EXTRA = 24; // px au-delà du bord de l'écran (option data-slider-gap="edge")

const TABLET_PER_VIEW = 2.2; // slides visibles en tablette (mode mobile seulement)

export function initSliders(root = document) {
  const blocks = root.querySelectorAll("[data-slider]");
  if (!blocks.length) return;
  if (typeof window.Swiper !== "undefined") return setupSliders(blocks);
  loadScript(SWIPER_SRC)
    .then(() => setupSliders(blocks))
    .catch((err) => console.warn("[slider]", err.message));
}

function setupSliders(blocks) {
  if (typeof window.Swiper === "undefined") return;
  blocks.forEach((block) => {
    if (!readBool(block, "data-slider-mobile-only")) return initSlider(block);
    // Mobile seulement : créé sous 992 px, retiré au-dessus
    const mq = window.matchMedia(SLIDER_QUERY);
    let destroy = null;
    const sync = () => {
      if (mq.matches && !destroy) destroy = initSlider(block, { mobileOnly: true });
      else if (!mq.matches && destroy) {
        destroy();
        destroy = null;
      }
    };
    sync();
    mq.addEventListener("change", sync);
  });
}

function readBool(el, name) {
  return el.getAttribute(name) === "true";
}

function readNumber(el, name, fallback) {
  const value = parseFloat(el.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
}

function initSlider(block, { mobileOnly = false } = {}) {
  const track = block.querySelector("[data-slider-track]");
  if (!track || track.closest("[data-slider]") !== block || track.swiper) return;
  const slides = [...track.children];
  if (!slides.length) return;

  // Espace entre les slides : on reprend le gap posé dans Webflow
  const styles = getComputedStyle(track);
  const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;

  // Option « bord d'écran » : décalage des slides hors vue = distance entre le
  // début de la piste et le bord de la fenêtre, + 24 px (variable --slider-edge)
  const edgeGap = block.getAttribute("data-slider-gap") === "edge";
  const setEdge = () => block.style.setProperty("--slider-edge", `${Math.round(track.getBoundingClientRect().left) + EDGE_EXTRA}px`);
  if (edgeGap) {
    block.classList.add("is-slider-edge");
    setEdge();
  }

  // Swiper veut : conteneur > wrapper > slides. On enveloppe la piste dans
  // un conteneur créé ici (pas de classe Webflow touchée).
  const viewport = document.createElement("div");
  viewport.className = "swiper slider_viewport";
  track.parentNode.insertBefore(viewport, track);
  viewport.appendChild(track);
  track.classList.add("swiper-wrapper");
  slides.forEach((slide) => slide.classList.add("swiper-slide"));

  const prev = block.querySelector("[data-slider-prev]");
  const next = block.querySelector("[data-slider-next]");
  const dots = block.querySelector("[data-slider-dots]");
  const reduced = prefersReducedMotion();
  const autoplayDelay = readNumber(block, "data-slider-autoplay", 0);

  // Les flèches sont des liens Webflow (href="#" ou "#section") : on retire le
  // lien, sinon le scroll d'ancre de Webflow (qui ignore preventDefault) fait
  // sauter la page. Elles restent des boutons au clavier (Entrée / Espace).
  [prev, next].forEach((arrow) => {
    if (!arrow) return;
    arrow.addEventListener("click", (e) => e.preventDefault());
    if (arrow.tagName !== "A") return;
    arrow.removeAttribute("href");
    arrow.setAttribute("role", "button");
    if (!arrow.hasAttribute("tabindex")) arrow.setAttribute("tabindex", "0");
    arrow.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      arrow.click();
    });
  });

  // Nombre de slides visibles : "auto" (largeurs Webflow) ou fixé par écran
  const perView = readNumber(block, "data-slider-per-view", 0);
  const perViewTablet = readNumber(block, "data-slider-per-view-tablet", perView);
  const perViewMobile = readNumber(block, "data-slider-per-view-mobile", perViewTablet);
  const sizing = mobileOnly
    ? perViewMobile
      ? {
          slidesPerView: perViewMobile,
          breakpoints: { 768: { slidesPerView: readNumber(block, "data-slider-per-view-tablet", TABLET_PER_VIEW) } },
        }
      : { slidesPerView: "auto" }
    : perView
    ? {
        slidesPerView: perViewMobile,
        breakpoints: { 768: { slidesPerView: perViewTablet }, 992: { slidesPerView: perView } },
      }
    : { slidesPerView: "auto" };

  const swiper = new window.Swiper(viewport, {
    ...sizing,
    spaceBetween: gap,
    speed: reduced ? 0 : readNumber(block, "data-slider-speed", 600),
    loop: readBool(block, "data-slider-loop"),
    centeredSlides: readBool(block, "data-slider-center"),
    grabCursor: true,
    watchOverflow: true, // flèches désactivées si tout tient à l'écran
    autoplay:
      autoplayDelay && !reduced ? { delay: autoplayDelay, pauseOnMouseEnter: true, disableOnInteraction: false } : false,
    navigation: {
      prevEl: prev,
      nextEl: next,
      disabledClass: "is-disabled",
      // Tout tient à l'écran : classe à part (une classe commune avec disabledClass
      // serait retirée par Swiper juste après avoir été posée). Même style en CSS.
      lockClass: "is-locked",
    },
    pagination: dots
      ? {
          el: dots,
          clickable: true,
          bulletClass: "slider_dot",
          bulletActiveClass: "is-active",
        }
      : false,
    a11y: {
      prevSlideMessage: t("slider.prev"),
      nextSlideMessage: t("slider.next"),
      paginationBulletMessage: t("slider.goto"),
      firstSlideMessage: t("slider.first"),
      lastSlideMessage: t("slider.last"),
      // role="group" n'est permis que sur un bloc neutre (div) : pas sur un
      // lien, un élément de liste ou un article (sinon liste cassée pour les
      // lecteurs d'écran)
      slideRole: slides[0].tagName === "DIV" ? "group" : "",
    },
    keyboard: { enabled: true, onlyInViewport: true },
    // Glissé à deux doigts au trackpad (et molette horizontale) : une slide par
    // geste. Horizontal seulement : le défilement vertical de la page passe.
    mousewheel: { forceToAxis: true, thresholdDelta: 10 },
    on: {
      // Slider prêt ou redimensionné : la hauteur de page a pu bouger
      afterInit: () => requestScrollRefresh(),
    },
  });

  // Option « bord d'écran » : classes is-offside-prev / -next sur les slides
  // hors vue (CSS : décalées hors de la page). Mises à jour dès le début de
  // chaque changement, pour que la slide qui entre glisse depuis l'extérieur.
  if (edgeGap) {
    const updateOffside = () => {
      const perView = typeof swiper.params.slidesPerView === "number" ? swiper.params.slidesPerView : 1;
      const first = swiper.activeIndex;
      const last = first + Math.ceil(perView) - 1;
      swiper.slides.forEach((slide, i) => {
        slide.classList.toggle("is-offside-prev", i < first);
        slide.classList.toggle("is-offside-next", i > last);
      });
    };
    block.style.setProperty("--slider-speed", `${swiper.params.speed}ms`);
    updateOffside();
    swiper.on("slideChange", updateOffside);
    swiper.on("breakpoint", updateOffside);
    swiper.on("resize", () => {
      setEdge();
      updateOffside();
    });
  }

  block.classList.add("is-slider-ready");

  // Retrait complet (mode mobile seulement, en repassant en desktop) : la
  // piste retrouve sa place et ses classes Webflow
  return () => {
    swiper.destroy(true, true);
    viewport.before(track);
    viewport.remove();
    track.classList.remove("swiper-wrapper");
    slides.forEach((slide) => slide.classList.remove("swiper-slide", "is-offside-prev", "is-offside-next"));
    block.classList.remove("is-slider-ready", "is-slider-edge");
    block.style.removeProperty("--slider-edge");
    block.style.removeProperty("--slider-speed");
    requestScrollRefresh();
  };
}
