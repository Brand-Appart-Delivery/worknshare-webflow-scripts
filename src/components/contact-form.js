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
// Le JS : relie chaque libellé à son champ (les libellés Webflow ont un for=""
// vide), coche la pastille choisie (classe is-active, stylée dans Webflow),
// affiche les champs selon la demande, et pré-remplit depuis l'adresse :
// /nous-contacter?motif=visite&espace=clichy

export function initContactForms(root = document) {
  root.querySelectorAll("form[data-contact-form]").forEach(initContactForm);
}

function initContactForm(form) {
  if (form.dataset.contactInit) return;
  form.dataset.contactInit = "1";

  linkLabels(form);

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
}

// Libellés Webflow au for="" vide : un libellé qui entoure son champ n'a pas
// besoin de for (on le retire), sinon on le relie au champ du même bloc.
function linkLabels(form) {
  form.querySelectorAll("label").forEach((label) => {
    const inside = label.querySelector("input, select, textarea");
    if (inside) {
      if (label.getAttribute("for") === "") label.removeAttribute("for");
      return;
    }
    if (label.getAttribute("for")) return;
    const field = label.parentElement?.querySelector("input, select, textarea");
    if (field?.id) label.htmlFor = field.id;
  });
}
