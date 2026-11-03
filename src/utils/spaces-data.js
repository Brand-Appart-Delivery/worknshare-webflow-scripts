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
// Un espace présent deux fois dans la page n'est compté qu'une fois.

const isTrue = (v) => v === "true" || v === "1";

function hasOffer(el, name) {
  const attr = el.getAttribute(`data-${name}`);
  if (attr != null) return isTrue(attr);
  const flag = el.querySelector(`[data-offer="${name}"]`);
  return !!flag && !flag.classList.contains("w-condition-invisible");
}

export function readSpaces(root = document) {
  const bySlug = new Map();
  root.querySelectorAll("[data-space][data-lat][data-lng]").forEach((el) => {
    const slug = el.getAttribute("data-space");
    const lat = parseFloat(el.getAttribute("data-lat"));
    const lng = parseFloat(el.getAttribute("data-lng"));
    if (!slug || !Number.isFinite(lat) || !Number.isFinite(lng) || bySlug.has(slug)) return;
    const img = el.querySelector("img");
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
      url: el.getAttribute("href") || `/espaces/${slug}/`,
      photo: img ? img.currentSrc || img.src : "",
      photoAlt: img ? img.alt : "",
    });
  });
  return [...bySlug.values()];
}
