// src/utils/spaces-data.js — les espaces Work & Share lus dans la page.
//
// Source : les éléments de la liste CMS du module carte, qui portent les
// champs en attributs (posés dans Webflow) :
//   [data-space=slug][data-lat][data-lng] + data-name, data-city, data-dept,
//   data-building, data-address, data-postcode, data-station,
//   data-coworking, data-offices, data-rooms ("true" / "false")
// Les offres peuvent aussi venir de repères cachés dans l'élément :
//   [data-offer="rooms|coworking|offices"], affichés par Webflow seulement si
//   l'offre est cochée (visibilité conditionnelle -> classe w-condition-invisible
//   sinon). L'API Webflow ne sait pas lier un booléen à un attribut.
// Photos du carrousel de la fiche : liste CMS imbriquée [data-space-gallery]
// (champ Galerie), posée à côté du lien dans le même élément de liste.
// Un espace présent deux fois dans la page n'est compté qu'une fois.

import { getLang, LOCALES } from "./i18n.js";

const isTrue = (v) => v === "true" || v === "1";

// Adresse de la fiche d'un espace. Si le lien Webflow ne pointe pas vers CET
// espace (lien vers le modèle « detail_espaces » au lieu de l'espace courant),
// il est réécrit : /espaces/<slug>, avec le préfixe de langue (/en…).
function spaceUrl(el, slug) {
  const href = el.getAttribute("href") || "";
  if (href.split(/[?#]/)[0].replace(/\/$/, "").endsWith(`/${slug}`)) return href;
  const prefix = (LOCALES[getLang()] || {}).prefix || "";
  const url = `${prefix}/espaces/${slug}`;
  if (el.tagName === "A") el.setAttribute("href", url);
  return url;
}

function hasOffer(el, name) {
  const attr = el.getAttribute(`data-${name}`);
  if (attr != null) return isTrue(attr);
  const flag = el.querySelector(`[data-offer="${name}"]`);
  return !!flag && !flag.classList.contains("w-condition-invisible");
}

// Plus grande version d'une image (srcset Webflow), sinon son src
function bestSrc(img) {
  const set = img.getAttribute("srcset");
  if (set) {
    const best = set
      .split(",")
      .map((part) => part.trim().split(/\s+/))
      .map(([url, w]) => ({ url, w: parseFloat(w) || 0 }))
      .sort((a, b) => b.w - a.w)[0];
    if (best && best.url) return best.url;
  }
  return img.getAttribute("src") || "";
}

function readPhotos(el, mainImg) {
  const item = el.closest(".w-dyn-item") || el.parentElement;
  const gallery = [...(item?.querySelectorAll("[data-space-gallery] img") || [])]
    .filter((img) => !img.closest(".w-condition-invisible, .w-dyn-empty"))
    .map(bestSrc)
    // Image vide de Webflow (champ non relié)
    .filter((src) => src && !/placeholder/i.test(src));
  const main = mainImg ? bestSrc(mainImg) : "";
  return [...new Set([main, ...gallery].filter(Boolean))];
}

export function readSpaces(root = document) {
  const bySlug = new Map();
  root.querySelectorAll("[data-space][data-lat][data-lng]").forEach((el) => {
    const slug = el.getAttribute("data-space");
    const lat = parseFloat(el.getAttribute("data-lat"));
    const lng = parseFloat(el.getAttribute("data-lng"));
    if (!slug || !Number.isFinite(lat) || !Number.isFinite(lng) || bySlug.has(slug)) return;
    const img = el.querySelector("img:not([data-space-gallery] img)");
    bySlug.set(slug, {
      slug,
      lat,
      lng,
      el,
      name: el.getAttribute("data-name") || slug,
      city: el.getAttribute("data-city") || "",
      dept: el.getAttribute("data-dept") || "",
      building: el.getAttribute("data-building") || "",
      address: el.getAttribute("data-address") || "",
      postcode: el.getAttribute("data-postcode") || "",
      station: el.getAttribute("data-station") || "",
      coworking: hasOffer(el, "coworking"),
      offices: hasOffer(el, "offices"),
      rooms: hasOffer(el, "rooms"),
      url: spaceUrl(el, slug),
      photo: img ? bestSrc(img) : "",
      photos: readPhotos(el, img),
      photoAlt: img ? img.alt : "",
    });
  });
  return [...bySlug.values()];
}
