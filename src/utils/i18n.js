// src/utils/i18n.js
// Langue de la page et textes d'interface générés par le code (aria-label,
// messages, boutons). Le contenu Webflow / CMS est déjà traduit par Webflow.
//
// La langue vient de <html lang>, rempli par Webflow Localization sur chaque
// version. Ajouter une langue : une entrée dans LOCALES + son dictionnaire.

const DEFAULT_LANG = "fr";

const LOCALES = {
  fr: { tag: "fr-FR", prefix: "" },
  en: { tag: "en-GB", prefix: "/en" },
};

const DICT = {
  fr: {
    "menu.open": "Menu",
    "menu.close": "Fermer",
  },
  en: {
    "menu.open": "Menu",
    "menu.close": "Close",
  },
};

export function getLang() {
  const lang = (document.documentElement.lang || DEFAULT_LANG).slice(0, 2).toLowerCase();
  return LOCALES[lang] ? lang : DEFAULT_LANG;
}

export function getLocale() {
  return LOCALES[getLang()];
}

// t("slider.position", { index: 1, total: 4 }) -> "1 sur 4"
export function t(key, vars = {}) {
  const str = DICT[getLang()][key] ?? DICT[DEFAULT_LANG][key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
}
