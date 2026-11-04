// src/components/contact-form.js — formulaire de la page « Nous contacter ».
//
// STRUCTURE (posée dans Webflow) :
//   form[data-contact-form]                 formulaire Webflow (envoi géré par Webflow)
//     [data-contact-field="motif"]          pastilles « Votre demande » :
//       label.contact-motif_option > input[type=radio][name=motif]
//     [data-contact-field="espace"]         liste « Espace »
//     [data-contact-motif="bureaux,coworking"]  champ ou ligne affiché seulement
//                                           pour ces demandes (sinon masqué et
//                                           désactivé : il n'est pas envoyé)
//
// Le JS : coche la pastille choisie (classe is-active, stylée dans Webflow),
// affiche les champs selon la demande, et pré-remplit depuis l'adresse :
// /nous-contacter?motif=visite&espace=clichy

// (Libellés reliés à leurs champs : utils/form-labels.js, pour tous les formulaires.)
//
// Après l'envoi : le récap du message de succès est rempli avec les réponses,
// la section passe en is-sent (colonne de gauche masquée, succès centré).

import { getLenis } from "../core/core.js";
import { prefersReducedMotion } from "../utils/motion.js";

export function initContactForms(root = document) {
  root.querySelectorAll("form[data-contact-form]").forEach(initContactForm);
}

function initContactForm(form) {
  if (form.dataset.contactInit) return;
  form.dataset.contactInit = "1";

  const radios = [...form.querySelectorAll('input[type="radio"][name="motif"]')];
  const conditional = [...form.querySelectorAll("[data-contact-motif]")];

  const update = () => {
    const motif = radios.find((r) => r.checked)?.value || "";

    radios.forEach((r) => r.closest(".contact-motif_option")?.classList.toggle("is-active", r.checked));

    conditional.forEach((block) => {
      const motifs = block.getAttribute("data-contact-motif").split(",").map((m) => m.trim());
      const show = motifs.includes(motif);
      block.hidden = !show;
      // Champ masqué : désactivé, donc ni obligatoire ni envoyé
      block.querySelectorAll("input, select, textarea").forEach((field) => (field.disabled = !show));
    });
  };

  radios.forEach((r) => r.addEventListener("change", update));

  // Pré-remplissage depuis l'adresse (?motif=…&espace=…)
  const params = new URLSearchParams(window.location.search);
  const motif = params.get("motif");
  if (motif) {
    const radio = radios.find((r) => r.value === motif);
    if (radio) radio.checked = true;
  }
  const espace = params.get("espace");
  const select = form.querySelector('[data-contact-field="espace"]');
  if (espace && select && [...select.options].some((o) => o.value === espace)) select.value = espace;

  update();

  // À l'envoi : récap rempli avec les réponses (Webflow affiche ensuite le
  // message de succès, le formulaire est masqué)
  form.addEventListener("submit", () => fillRecap(form));
  watchSuccess(form);
}

// Texte affiché pour un champ : libellé de la pastille ou de l'option, sinon
// la valeur saisie. Vide si le champ est désactivé (non envoyé).
function fieldText(form, name) {
  const fields = [...form.querySelectorAll(`[name="${name}"]`)].filter((f) => !f.disabled);
  const field = fields.find((f) => f.type !== "radio") || fields.find((f) => f.checked);
  if (!field) return "";
  if (field.type === "radio") return field.closest("label")?.textContent.trim() || field.value;
  if (field.tagName === "SELECT") return field.value ? field.options[field.selectedIndex].text.trim() : "";
  return field.value.trim();
}

// RÉCAP (dans le message de succès, posé dans Webflow) :
//   [data-contact-recap-row="xxx"]    ligne, masquée si vide
//     [data-contact-recap-value="xxx"]  valeur ; « xxx » = name du champ,
//                                       ou « nom-complet » (prénom + nom)
function fillRecap(form) {
  const success = form.parentElement?.querySelector("[data-contact-success]");
  if (!success) return;
  const values = {
    "nom-complet": [fieldText(form, "prenom"), fieldText(form, "nom")].filter(Boolean).join(" "),
  };
  success.querySelectorAll("[data-contact-recap-value]").forEach((el) => {
    const key = el.getAttribute("data-contact-recap-value");
    // Bloc qui contient d'autres valeurs (Coordonnées) : on remplit ses enfants
    if (el.querySelector("[data-contact-recap-value]")) return;
    const text = key in values ? values[key] : fieldText(form, key);
    el.textContent = text;
    el.hidden = !text;
  });
  // Ligne sans aucune valeur : masquée
  success.querySelectorAll("[data-contact-recap-row]").forEach((row) => {
    row.hidden = ![...row.querySelectorAll("[data-contact-recap-value]")].some((v) => !v.hidden && v.textContent.trim());
  });
}

// Message de succès affiché par Webflow : la section passe en is-sent (colonne
// de gauche masquée, succès centré, cf. _contact-form.scss), puis on remonte
// en haut de la section
function watchSuccess(form) {
  const done = form.parentElement?.querySelector(".w-form-done");
  const section = form.closest("[data-contact]");
  if (!done || !section) return;
  const observer = new MutationObserver(() => {
    if (getComputedStyle(done).display === "none") return;
    observer.disconnect();
    section.classList.add("is-sent");
    const top = section.getBoundingClientRect().top + window.scrollY;
    const lenis = getLenis();
    if (window.scrollY > top) {
      if (lenis) lenis.scrollTo(top, { immediate: prefersReducedMotion(), force: true });
      else window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  });
  observer.observe(done, { attributes: true, attributeFilter: ["style", "class"] });
}
