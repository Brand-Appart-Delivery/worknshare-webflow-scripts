// src/utils/i18n.js
// Langue de la page et textes d'interface générés par le code (aria-label,
// messages, boutons). Le contenu Webflow / CMS est déjà traduit par Webflow.
//
// La langue vient du préfixe d'URL des versions traduites (/en/…), sinon
// français. On ne se fie pas à <html lang> : la langue principale du site
// Webflow est réglée sur « English » alors que le site est en français.
// Ajouter une langue : une entrée dans LOCALES (avec son préfixe) + son dictionnaire.

const DEFAULT_LANG = "fr";

export const LOCALES = {
  fr: { tag: "fr-FR", prefix: "" },
  en: { tag: "en-GB", prefix: "/en" },
};

const DICT = {
  fr: {
    "menu.open": "Menu",
    "menu.close": "Fermer",
    "nav.open": "Ouvrir le menu",
    "nav.close": "Fermer le menu",
    "slider.prev": "Élément précédent",
    "slider.next": "Élément suivant",
    "slider.goto": "Aller à l'élément {{index}}",
    "slider.first": "Premier élément",
    "slider.last": "Dernier élément",
    "map.count": "{n} espaces",
    "map.countOne": "1 espace",
    "map.hideList": "Masquer la liste",
    "map.showList": "Afficher la liste",
    "map.nearest": "Les plus proches {of}",
    "map.nearestMe": "Les plus proches de vous",
    "map.others": "Autres espaces · {dept}",
    "map.distance": "à vol d'oiseau",
    "map.walk": "{station} · {min} min à pied",
    "map.pin": "Espace Work & Share de {name}",
    "map.photo": "{name}, photo {n} sur {total}",
    "map.photoGo": "Voir la photo {n}",
    "rooms.count": "{n} salles correspondent",
    "rooms.countOne": "1 salle correspond",
    "map.building": "Immeuble {name}",
    "map.zoomIn": "Zoom avant",
    "map.zoomOut": "Zoom arrière",
    "map.recenter": "Recentrer sur l'espace",
    "hero.pause": "Mettre la vidéo en pause",
    "hero.play": "Lire la vidéo",
    "lightbox.label": "Photos de l'espace",
    "lightbox.close": "Fermer",
    "lightbox.prev": "Photo précédente",
    "lightbox.next": "Photo suivante",
    "lightbox.thumbs": "Toutes les photos",
    "lightbox.goto": "Voir la photo {n}",
    "gallery.tour": "Visite 360° de l'espace",
    "gallery.tourSoon": "La visite 360° de cet espace arrive bientôt.",
    "visit.title": "Venez visiter {name}",
    "visit.leadHostBuilding": "{host} vous fait faire le tour de l’immeuble {building} et répond à toutes vos questions.",
    "visit.leadHost": "{host} vous fait faire le tour de l’espace et répond à toutes vos questions.",
    "visit.lead": "L’équipe sur place vous fait faire le tour et répond à toutes vos questions.",
    "visit.noteHost": "{host}, l’hôte de {name}, vous rappelle avant demain midi.",
    "visit.note": "L’équipe de l’espace vous rappelle avant demain midi.",
    "visit.call": "Appeler l’espace au {phone}",
    "map.origin": "Point de recherche : {place}",
    "map.attribution": "© OpenFreeMap © OpenMapTiles · © contributeurs OpenStreetMap",
    "map.noRooms": "Aucun espace avec salles ne correspond.",
    "search.nearMe": "Autour de moi",
    "search.nearMeHint": "Utiliser ma position",
    "search.locating": "Localisation…",
    "search.geoError": "Position indisponible. Tapez une ville ou une adresse.",
    "search.spaces": "Nos espaces",
    "search.stations": "Gares et stations",
    "search.addresses": "Adresses et communes",
    "search.noResult": "Aucun résultat. Essayez une ville, une adresse ou une station.",
    "search.outsideIdf": "hors Île-de-France",
    "search.results": "{n} suggestions",
    "comparator.city": "Commune d’implantation",
    "comparator.cities": "Communes proposées",
    "comparator.noCity": "Commune inconnue du comparateur. Essayez la commune voisine.",
    "blog.count": "{n} articles affichés",
    "blog.countOne": "1 article affiché",
  },
  en: {
    "menu.open": "Menu",
    "menu.close": "Close",
    "nav.open": "Open menu",
    "nav.close": "Close menu",
    "slider.prev": "Previous item",
    "slider.next": "Next item",
    "slider.goto": "Go to item {{index}}",
    "slider.first": "First item",
    "slider.last": "Last item",
    "map.count": "{n} spaces",
    "map.countOne": "1 space",
    "map.hideList": "Hide the list",
    "map.showList": "Show the list",
    "map.nearest": "Closest to {place}",
    "map.nearestMe": "Closest to you",
    "map.others": "Other spaces · {dept}",
    "map.distance": "as the crow flies",
    "map.walk": "{station} · {min} min walk",
    "map.pin": "Work & Share space in {name}",
    "map.photo": "{name}, photo {n} of {total}",
    "map.photoGo": "Show photo {n}",
    "rooms.count": "{n} matching rooms",
    "rooms.countOne": "1 matching room",
    "map.building": "{name} building",
    "map.zoomIn": "Zoom in",
    "map.zoomOut": "Zoom out",
    "map.recenter": "Recenter on the space",
    "hero.pause": "Pause the video",
    "hero.play": "Play the video",
    "lightbox.label": "Photos of the space",
    "lightbox.close": "Close",
    "lightbox.prev": "Previous photo",
    "lightbox.next": "Next photo",
    "lightbox.thumbs": "All photos",
    "lightbox.goto": "Show photo {n}",
    "gallery.tour": "360° tour of the space",
    "gallery.tourSoon": "The 360° tour of this space is coming soon.",
    "visit.title": "Come and visit {name}",
    "visit.leadHostBuilding": "{host} will show you around the {building} building and answer all your questions.",
    "visit.leadHost": "{host} will show you around the space and answer all your questions.",
    "visit.lead": "The on-site team will show you around and answer all your questions.",
    "visit.noteHost": "{host}, your host in {name}, will call you back before noon tomorrow.",
    "visit.note": "The space team will call you back before noon tomorrow.",
    "visit.call": "Call the space on {phone}",
    "map.origin": "Search point: {place}",
    "map.attribution": "© OpenFreeMap © OpenMapTiles · © OpenStreetMap contributors",
    "map.noRooms": "No space with meeting rooms matches.",
    "search.nearMe": "Near me",
    "search.nearMeHint": "Use my location",
    "search.locating": "Locating…",
    "search.geoError": "Location unavailable. Type a town or an address.",
    "search.spaces": "Our spaces",
    "search.stations": "Stations",
    "search.addresses": "Addresses and towns",
    "search.noResult": "No result. Try a town, an address or a station.",
    "search.outsideIdf": "outside Île-de-France",
    "search.results": "{n} suggestions",
    "comparator.city": "Office location (town)",
    "comparator.cities": "Suggested towns",
    "comparator.noCity": "Town not covered by the comparator. Try a neighbouring one.",
    "blog.count": "{n} articles shown",
    "blog.countOne": "1 article shown",
  },
};

export function getLang() {
  const path = location.pathname;
  const found = Object.keys(LOCALES).find((lang) => {
    const prefix = LOCALES[lang].prefix;
    return prefix && (path === prefix || path.startsWith(`${prefix}/`));
  });
  return found || DEFAULT_LANG;
}

export function getLocale() {
  return LOCALES[getLang()];
}

// t("slider.position", { index: 1, total: 4 }) -> "1 sur 4"
export function t(key, vars = {}) {
  const str = DICT[getLang()][key] ?? DICT[DEFAULT_LANG][key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
}
