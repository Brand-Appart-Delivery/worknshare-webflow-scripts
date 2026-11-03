// src/components/visit-form.js — bloc final « Venez visiter <espace> » d'une
// page espace, avec le formulaire court de demande de visite (maquette Figma
// « Bloc final de visite #visite »).
//
// STRUCTURE (posée dans Webflow, attributs reliés au CMS de l'espace) :
//   [data-visit-form]                section (#visite)
//     data-visit-name / -building / -host / -phone   nom, immeuble, prénom de
//                                    l'hôte et téléphone de l'espace (CMS)
//     [data-visit-title]             « Venez visiter Clichy »
//     [data-visit-lead]              « Clara vous fait faire le tour de l'immeuble Blaaack… »
//     [data-visit-call]              bouton « Appeler » (lien tel: de l'espace)
//     [data-visit-space]             liste « Espace » : pré-réglée sur l'espace de la page
//     [data-visit-note]              « Clara, l'hôte de Clichy, vous rappelle… »
//
// Textes générés : t() (FR / EN). Sans prénom d'hôte ou d'immeuble, phrases
// génériques.

import { t } from "../utils/i18n.js";

export function initVisitForms(root = document) {
  root.querySelectorAll("[data-visit-form]").forEach(initVisitForm);
}

function initVisitForm(block) {
  const get = (name) => (block.getAttribute(`data-visit-${name}`) || "").trim();
  const name = get("name");
  const building = get("building");
  const host = get("host");
  const phone = get("phone");
  const set = (sel, text) => block.querySelectorAll(sel).forEach((el) => (el.textContent = text));

  if (name) set("[data-visit-title]", t("visit.title", { name }));
  set(
    "[data-visit-lead]",
    host && building
      ? t("visit.leadHostBuilding", { host, building })
      : host
        ? t("visit.leadHost", { host })
        : t("visit.lead"),
  );
  set("[data-visit-note]", host && name ? t("visit.noteHost", { host, name }) : t("visit.note"));

  // Bouton « Appeler » : numéro de l'espace
  if (phone) {
    block.querySelectorAll("[data-visit-call]").forEach((link) => {
      link.setAttribute("href", `tel:${phone.replace(/[^\d+]/g, "")}`);
      link.setAttribute("aria-label", t("visit.call", { phone }));
    });
  }

  // Liste « Espace » pré-réglée sur l'espace de la page
  const select = block.querySelector("[data-visit-space]");
  if (select && name) {
    const option = [...select.options].find((o) => o.value === name || o.text === name);
    if (option) select.value = option.value;
  }
}
