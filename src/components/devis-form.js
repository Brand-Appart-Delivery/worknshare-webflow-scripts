// src/components/devis-form.js — formulaire de devis de la page Événementiel.
//
// STRUCTURE (posée dans Webflow) :
//   form[data-form="devis"]                     formulaire Webflow (envoi par Webflow)
//     [data-devis-formats]                      groupe de pastilles « Format »
//       [data-devis-format-option="seminaire"]  pastille (lien role="radio")
//     input[data-devis-format-input]            champ caché « format », envoyé
//     select[data-devis-lieu]                   liste « Lieu »
//
// Clic (ou Entrée / Espace) sur une pastille : elle passe en is-active
// (style posé dans Webflow), aria-checked="true", et son nom (« Séminaire »)
// part dans le champ caché. Flèches gauche / droite : pastille voisine, comme
// un groupe de boutons radio. Pré-remplissage depuis l'adresse :
// /evenementiel?format=seminaire&lieu=clichy#devis

export function initDevisForms(root = document) {
  root.querySelectorAll('form[data-form="devis"]').forEach(initDevisForm);
}

function initDevisForm(form) {
  if (form.dataset.devisInit) return;
  form.dataset.devisInit = "1";

  const options = [...form.querySelectorAll("[data-devis-format-option]")];
  const input = form.querySelector("[data-devis-format-input]");
  if (!options.length) return;

  const select = (option, focus = false) => {
    options.forEach((o) => {
      const on = o === option;
      o.classList.toggle("is-active", on);
      o.setAttribute("aria-checked", String(on));
      // Un seul arrêt de tabulation dans le groupe : la pastille choisie
      o.tabIndex = on ? 0 : -1;
    });
    if (input) input.value = option ? option.textContent.trim() : "";
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

  // Au départ : aucune pastille choisie, la première reçoit la tabulation
  options.forEach((o, i) => (o.tabIndex = i === 0 ? 0 : -1));

  // Pré-remplissage depuis l'adresse (?format=…&lieu=…)
  const params = new URLSearchParams(window.location.search);
  const format = params.get("format");
  const match = format && options.find((o) => o.getAttribute("data-devis-format-option") === format);
  if (match) select(match);

  const lieu = params.get("lieu");
  const lieuSelect = form.querySelector("[data-devis-lieu]");
  if (lieu && lieuSelect && [...lieuSelect.options].some((o) => o.value === lieu)) lieuSelect.value = lieu;
}
