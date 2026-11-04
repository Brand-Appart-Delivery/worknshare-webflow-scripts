// src/components/space-gallery.js — galerie photo d'une page espace : ouvre la
// visionneuse (components/lightbox.js) au clic sur une photo ou sur « +14
// Toutes les photos ».
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-gallery]                    bloc galerie
//     img                             photos affichées (principale, miniatures)
//     [data-gallery-open="2"]         ouvre la visionneuse sur la photo n° 2
//                                     (0 = première)
//     [data-gallery-count]            « +14 » : recalculé (photos non affichées)
//     switch « Photos / Visite 360° » :
//       [data-tour-360][data-tour-url]  bouton « Visite 360° » (data-tour-url
//                                     relié au champ CMS « Visite 360° »)
//       bouton voisin                 « Photos » (retour à la photo)
//   [data-gallery-photo]              photos en plus, n'importe où dans la page
//                                     (ex. liste CMS cachée reliée au champ
//                                     « Galerie ») : ajoutées après celles du bloc
//
// Légende de chaque photo : son texte alternatif. Les doublons (même image)
// ne sont comptés qu'une fois.

import { createLightbox } from "./lightbox.js";
import { createTabIndicator } from "../utils/tab-indicator.js";
import { t, getLang } from "../utils/i18n.js";

// Plus grande version d'une image (srcset Webflow), sinon son src
function bestSrc(img) {
  const set = img.getAttribute("srcset");
  if (set) {
    const best = set
      .split(",")
      .map((part) => part.trim().split(/\s+/))
      .map(([url, w]) => ({ url, w: parseFloat(w) || 0 }))
      .sort((a, b) => b.w - a.w)[0];
    if (best?.url) return best.url;
  }
  return img.currentSrc || img.getAttribute("src") || "";
}

// Fichier d'origine (sans les variantes « -p-500 » de Webflow) : sert à repérer
// les doublons
const key = (src) => src.replace(/-p-\d+(\.\w+)$/, "$1").split("?")[0];

export function initSpaceGalleries(root = document) {
  root.querySelectorAll("[data-gallery]").forEach(initGallery);
}

function initGallery(gallery) {
  const imgs = [
    ...gallery.querySelectorAll("img"),
    ...document.querySelectorAll("[data-gallery-photo] img, img[data-gallery-photo]"),
  ].filter((img) => !img.closest(".w-condition-invisible, .w-dyn-empty"));

  const seen = new Set();
  const photos = [];
  imgs.forEach((img) => {
    const src = bestSrc(img);
    if (!src || /placeholder/i.test(src) || seen.has(key(src))) return;
    seen.add(key(src));
    photos.push({ src, thumb: img.currentSrc || img.getAttribute("src"), alt: img.getAttribute("alt") || "" });
  });
  if (!photos.length) return;

  // « +N » : photos qui ne sont pas visibles dans le bloc
  const shown = gallery.querySelectorAll("img").length;
  const counter = gallery.querySelector("[data-gallery-count]");
  if (counter) {
    const rest = photos.length - shown;
    counter.textContent = rest > 0 ? `+${rest}` : "";
    counter.hidden = rest <= 0;
  }

  const lightbox = createLightbox();
  const tourTab = gallery.querySelector("[data-tour-360]");
  const switcher = tourTab?.parentElement || null;
  // (le bouton « Photos » du switch ne fait que revenir à la photo)
  [...gallery.querySelectorAll("[data-gallery-open]")].filter((el) => !switcher?.contains(el)).forEach((trigger) => {
    // Liens Webflow href="#" : pas de saut d'ancre
    if (trigger.tagName === "A") {
      trigger.removeAttribute("href");
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
    }
    const at = Math.min(parseInt(trigger.getAttribute("data-gallery-open"), 10) || 0, photos.length - 1);
    const open = (e) => {
      e.preventDefault();
      e.stopPropagation();
      lightbox.open(photos, at, trigger);
    };
    trigger.addEventListener("click", open);
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open(e);
    });
  });

  if (switcher) initSwitch(gallery, switcher, tourTab);

  // Clic sur la grande photo : ouvre aussi la visionneuse (sur la 1re)
  // (sauf si la photo est déjà dans un déclencheur [data-gallery-open])
  const main = gallery.querySelector(".space-gallery_main img, [data-gallery-main]");
  if (main && !main.closest("[data-gallery-open]")) {
    main.style.cursor = "zoom-in";
    main.addEventListener("click", () => lightbox.open(photos, 0, main));
  }
}

// Adresse de la visite : le champ CMS peut contenir l'adresse (ex. Matterport
// https://my.matterport.com/show/?m=…) ou le code <iframe …> complet copié
// depuis Matterport : on en garde l'adresse (src). Seulement http(s).
// Options Matterport ajoutées si elles ne sont pas déjà dans l'adresse du CMS :
// pas de marque (brand=0), pas de fenêtre d'aide (help=0), interface dans la
// langue de la page (lang=fr / en).
const TOUR_OPTIONS = { brand: "0", help: "0" };

function tourUrl(value) {
  const raw = (value || "").trim();
  const src = /<iframe/i.test(raw) ? (raw.match(/src=["']([^"']+)["']/i) || [])[1] || "" : raw;
  const clean = src.replace(/&amp;/g, "&");
  if (!/^https?:\/\//i.test(clean)) return "";
  try {
    const url = new URL(clean);
    if (/matterport\.com$/i.test(url.hostname)) {
      const options = { ...TOUR_OPTIONS, lang: getLang() };
      Object.entries(options).forEach(([key, val]) => {
        if (!url.searchParams.has(key)) url.searchParams.set(key, val);
      });
    }
    return url.toString();
  } catch (e) {
    return clean;
  }
}

// ---------- Switch « Photos / Visite 360° » ----------
// Visite 360° : la visite (iframe, créée au premier clic) remplace la grande
// photo ; sans adresse dans le CMS, un message « bientôt disponible ».
// Photos : retour à la photo. Fond actif qui glisse (utils/tab-indicator.js).
function initSwitch(gallery, switcher, tourTab) {
  const tabs = [...switcher.children].filter((el) => el.matches("a, button"));
  const photosTab = tabs.find((tab) => tab !== tourTab);
  const main = gallery.querySelector(".space-gallery_main, [data-gallery-main]") || switcher.parentElement;
  const url = tourUrl(tourTab.getAttribute("data-tour-url"));
  let panel = null;
  let active = photosTab;

  const indicator = createTabIndicator(switcher, { getActive: () => active, className: "space-gallery_indicator" });

  const tourPanel = () => {
    if (panel) return panel;
    panel = document.createElement("div");
    panel.className = "space-gallery_tour";
    if (url) {
      const frame = document.createElement("iframe");
      frame.src = url;
      frame.title = t("gallery.tour");
      frame.loading = "lazy";
      frame.allow = "fullscreen; xr-spatial-tracking; gyroscope; accelerometer"; // comme le code Matterport
      frame.allowFullscreen = true;
      panel.appendChild(frame);
    } else {
      panel.classList.add("is-empty");
      panel.innerHTML = `<p>${t("gallery.tourSoon")}</p>`;
    }
    main.appendChild(panel);
    return panel;
  };

  const select = (tab) => {
    active = tab;
    tabs.forEach((el) => {
      el.classList.toggle("is-active", el === tab);
      el.setAttribute("aria-pressed", el === tab ? "true" : "false");
    });
    const tour = tab === tourTab;
    if (tour) tourPanel();
    // Visite 360° : la grande zone prend toute la hauteur de la galerie (les
    // miniatures s'effacent, maquette « Visite 360° ») ; hauteur de la galerie
    // inchangée, la page ne bouge pas. Photos : hauteur d'origine.
    if (tour) {
      const total = gallery.offsetHeight;
      main.style.height = `${main.offsetHeight}px`;
      gallery.style.height = `${total}px`;
      main.getBoundingClientRect(); // part de la hauteur actuelle
      main.style.height = `${total}px`;
    } else {
      main.style.height = `${baseHeight()}px`;
      const done = () => {
        main.style.height = "";
        gallery.style.height = "";
      };
      main.addEventListener("transitionend", done, { once: true });
      setTimeout(done, 600); // repli si pas de transition
    }
    gallery.classList.toggle("is-tour", tour);
    indicator.move();
  };

  // Hauteur d'origine de la grande zone (sans le mode visite)
  const baseHeight = () => {
    const saved = main.style.height;
    main.style.height = "";
    gallery.classList.remove("is-tour");
    const h = main.offsetHeight;
    gallery.classList.add("is-tour");
    main.style.height = saved;
    main.getBoundingClientRect();
    return h;
  };

  tabs.forEach((tab) => {
    if (tab.tagName === "A") {
      tab.removeAttribute("href");
      tab.setAttribute("tabindex", "0");
    }
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (tab !== active) select(tab);
    });
    tab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tab.click();
      }
    });
  });
}
