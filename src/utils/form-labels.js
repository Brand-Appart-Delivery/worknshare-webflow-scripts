// src/utils/form-labels.js — relie chaque libellé de formulaire à son champ.
//
// Les libellés Webflow sortent avec un for="" vide : cliquer dessus ne fait
// rien et les lecteurs d'écran ne les associent pas au champ. Un libellé qui
// entoure son champ n'a pas besoin de for (on le retire) ; sinon on le relie
// au champ du même bloc (qui doit avoir un id).

export function linkLabels(form) {
  form.querySelectorAll("label").forEach((label) => {
    const inside = label.querySelector("input, select, textarea");
    if (inside) {
      if (label.getAttribute("for") === "") label.removeAttribute("for");
      return;
    }
    if (label.getAttribute("for")) return;
    const field = label.parentElement?.querySelector("input, select, textarea");
    if (field?.id) label.htmlFor = field.id;
    else label.removeAttribute("for");
  });
}

// Tous les formulaires de la page
export function initFormLabels(root = document) {
  root.querySelectorAll("form").forEach(linkLabels);
}
