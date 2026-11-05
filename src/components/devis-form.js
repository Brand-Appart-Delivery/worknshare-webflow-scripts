// src/components/devis-form.js — formulaire de devis (page Événementiel et
// pages des lieux événementiels).
//
// STRUCTURE (posée dans Webflow) :
//   form[data-form="devis"]                         formulaire Webflow (envoi par Webflow)
//     Groupes de pastilles (liens role="radio", style is-active posé dans Webflow) :
//       [data-devis-formats]                        « Format » (page Événementiel)
//         [data-devis-format-option="seminaire"]    pastille
//       input[data-devis-format-input]              champ caché envoyé (nom affiché)
//       [data-devis-restauration]                   « Restauration sur place »
//         [data-devis-restauration-option="oui"]    pastille
//       input[data-devis-restauration-input]        champ caché envoyé (« oui » / « non »)
//     select[data-devis-format-select]              liste « Format » (pages lieux)
//     select[data-devis-lieu]                       liste « Lieu »
//     input[data-venue-espace-input]                champ « Espace », rempli avec
//       [data-espace-name="Clichy"]                 le nom du lieu (lié au CMS)
//
//   a[data-devis-format="seminaire"]                carte de format (hors formulaire) :
//                                                   au clic, présélectionne ce format
//
// Pastilles : clic, Entrée / Espace, flèches = comme un groupe de boutons radio ;
// le fond de la pastille choisie glisse de l'une à l'autre (utils/tab-indicator.js).
// Pré-remplissage depuis l'adresse : /evenementiel?format=seminaire&lieu=clichy#devis

import { createSegmentedIndicator } from "../utils/tab-indicator.js";

export function initDevisForms(root = document) {
  root.querySelectorAll('form[data-form="devis"]').forEach(initDevisForm);
}

function initDevisForm(form) {
  if (form.dataset.devisInit) return;
  form.dataset.devisInit = "1";

  // Pastilles « Format » : le nom affiché (« Séminaire ») part dans le champ caché
  const formats = radioGroup(form, "data-devis-format-option", "data-devis-format-input", (o) =>
    o.textContent.trim(),
  );
  // Pastilles « Restauration » : la valeur (« oui » / « non ») part dans le champ caché
  radioGroup(form, "data-devis-restauration-option", "data-devis-restauration-input", (o) =>
    o.getAttribute("data-devis-restauration-option"),
  );

  const formatSelect = form.querySelector("[data-devis-format-select]");

  // Choisit un format (pastille ou liste), ex. depuis une carte ou l'adresse
  const pickFormat = (value) => {
    if (!value) return;
    formats?.selectValue(value);
    if (formatSelect && [...formatSelect.options].some((o) => o.value === value)) {
      formatSelect.value = value;
      // prévient la liste personnalisée (custom-select.js)
      formatSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  // Cartes de format de la page : présélectionnent le format (l'ancre #devis
  // fait défiler jusqu'au formulaire). Écoute sur le document en capture : le
  // scroll vers les ancres (core.js) arrête la propagation du clic.
  document.addEventListener(
    "click",
    (e) => {
      const card = e.target.closest?.("a[data-devis-format]");
      if (card) pickFormat(card.getAttribute("data-devis-format"));
    },
    true,
  );

  // Champ « Espace » des pages lieux : nom du lieu
  const espace = form.querySelector("[data-venue-espace-input]");
  const espaceName = espace?.getAttribute("data-espace-name")?.trim();
  if (espace && espaceName && !espace.value) espace.value = espaceName;

  // Pré-remplissage depuis l'adresse (?format=…&lieu=…)
  const params = new URLSearchParams(window.location.search);
  pickFormat(params.get("format"));

  const lieu = params.get("lieu");
  const lieuSelect = form.querySelector("[data-devis-lieu]");
  if (lieu && lieuSelect && [...lieuSelect.options].some((o) => o.value === lieu)) {
    lieuSelect.value = lieu;
    lieuSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// Groupe de pastilles qui se comporte comme des boutons radio. Garde le choix
// posé dans Webflow (is-active / aria-checked="true"), sinon aucun choix.
function radioGroup(form, optionAttr, inputAttr, valueOf) {
  const options = [...form.querySelectorAll(`[${optionAttr}]`)];
  if (!options.length) return null;
  const input = form.querySelector(`[${inputAttr}]`);
  let current = options.find((o) => o.getAttribute("aria-checked") === "true") || null;
  // Fond glissant seulement si une pastille est choisie au départ (sa couleur sert de modèle)
  const indicator = current ? createSegmentedIndicator(options[0].parentElement, () => current) : null;

  const select = (option, focus = false) => {
    current = option;
    indicator?.move();
    options.forEach((o) => {
      const on = o === option;
      o.classList.toggle("is-active", on);
      o.setAttribute("aria-checked", String(on));
      // Un seul arrêt de tabulation dans le groupe : la pastille choisie
      o.tabIndex = on ? 0 : -1;
    });
    if (input) input.value = option ? valueOf(option) : "";
    if (focus && option) option.focus();
  };

  options.forEach((option, i) => {
    option.addEventListener("click", (e) => {
      e.preventDefault(); // lien Webflow href="#"
      select(option);
    });
    option.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        select(option);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        select(options[(i + 1) % options.length], true);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        select(options[(i - 1 + options.length) % options.length], true);
      }
    });
  });

  // État de départ : celui de Webflow, sinon la première reçoit la tabulation
  if (current) select(current);
  else options.forEach((o, i) => (o.tabIndex = i === 0 ? 0 : -1));

  return {
    selectValue(value) {
      const match = options.find((o) => o.getAttribute(optionAttr) === value);
      if (match) select(match);
    },
  };
}
