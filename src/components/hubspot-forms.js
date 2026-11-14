// src/components/hubspot-forms.js — envoie aussi les formulaires Webflow à HubSpot.
//
// Webflow garde son envoi habituel (copie dans Webflow, message de succès) ;
// en parallèle, les réponses partent vers un formulaire HubSpot via l'API
// publique de soumission (aucune clé secrète : seulement l'ID du formulaire).
//
// STRUCTURE (Webflow) :
//   form[data-hubspot-form="contact"]   clé du formulaire HubSpot (voir FORMS)
//
// Champs envoyés tels quels (nom du champ Webflow = propriété HubSpot) :
//   firstname, lastname, email, phone, company
// Tous les autres champs remplis sont regroupés dans le message, une ligne par
// champ (« Espaces : Clichy, Nanterre »), suivis du message du visiteur.
// Les champs désactivés (masqués selon la demande) ne sont pas envoyés.
//
// Le cookie hubspotutk (posé par le suivi HubSpot, seulement si le visiteur l'a
// accepté dans le bandeau cookies) relie la demande à sa visite et à son origine.
// Hors production, le message commence par « [TEST staging] ».

import { getLocale } from "../utils/i18n.js";

const PORTAL_ID = "148815361";
const ENDPOINT = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/`;
const FORMS = {
  contact: "a9d72217-fb86-4cf3-bb7d-3c999beee8b8", // « Site v2 - Contact »
};
const DIRECT = ["firstname", "lastname", "email", "phone", "company"];
const MESSAGE = "message";
const PROD_HOSTS = ["www.workandshare.com", "workandshare.com"];

export function initHubspotForms(root = document) {
  root.querySelectorAll("form[data-hubspot-form]").forEach((form) => {
    if (form.dataset.hubspotInit) return;
    const guid = FORMS[form.getAttribute("data-hubspot-form")];
    if (!guid) return;
    form.dataset.hubspotInit = "1";
    // Le navigateur a déjà validé les champs obligatoires avant « submit »
    form.addEventListener("submit", () => send(form, guid));
  });
}

function send(form, guid) {
  const fields = [];
  const details = [];
  let message = "";

  fieldNames(form).forEach((name) => {
    const value = readable(form, name);
    if (!value) return;
    if (DIRECT.includes(name)) fields.push({ objectTypeId: "0-1", name, value });
    else if (name === MESSAGE) message = value;
    else details.push(`${labelOf(form, name)} : ${value}`);
  });

  const isProd = PROD_HOSTS.includes(location.hostname);
  const text = [isProd ? "" : "[TEST staging]", details.join("\n"), message].filter(Boolean).join("\n\n");
  if (text) fields.push({ objectTypeId: "0-1", name: MESSAGE, value: text });

  const context = { pageUri: location.href, pageName: document.title };
  const hutk = document.cookie.match(/(?:^|;\s*)hubspotutk=([^;]+)/)?.[1];
  if (hutk) context.hutk = hutk;

  fetch(ENDPOINT + guid, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, context }),
    keepalive: true, // l'envoi continue même si la page change
  })
    .then((res) => {
      if (!res.ok) res.text().then((body) => console.warn("[HubSpot] envoi refusé", res.status, body));
    })
    .catch((err) => console.warn("[HubSpot] envoi impossible", err));
}

// Noms des champs actifs, dans l'ordre du formulaire (une fois chacun)
function fieldNames(form) {
  const names = [];
  [...form.elements].forEach((el) => {
    if (!el.name || el.disabled || ["submit", "button"].includes(el.type)) return;
    if (!names.includes(el.name)) names.push(el.name);
  });
  return names;
}

// Valeur lisible : texte de la pastille ou de l'option, date en toutes lettres
function readable(form, name) {
  const els = [...form.elements].filter((el) => el.name === name && !el.disabled);
  const el = els.find((f) => f.type !== "radio") || els.find((f) => f.checked);
  if (!el) return "";
  if (el.type === "radio") return el.closest("label")?.textContent.trim() || el.value;
  if (el.type === "checkbox") return el.checked ? "Oui" : "";
  if (el.tagName === "SELECT") {
    return [...el.selectedOptions]
      .filter((o) => o.value)
      .map((o) => o.text.trim())
      .join(", ");
  }
  if (el.type === "date" && el.valueAsDate) {
    return new Intl.DateTimeFormat(getLocale(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
      el.valueAsDate,
    );
  }
  return el.value.trim();
}

// Libellé du champ : groupe de pastilles (aria-labelledby), sinon le premier
// libellé trouvé en remontant les blocs parents
function labelOf(form, name) {
  const el = [...form.elements].find((f) => f.name === name);
  const group = el?.closest("[aria-labelledby]");
  if (group && form.contains(group)) {
    const title = document.getElementById(group.getAttribute("aria-labelledby"));
    if (title) return title.textContent.trim();
  }
  for (let node = el?.parentElement; node && node !== form; node = node.parentElement) {
    const label = [...node.querySelectorAll("label")].find((l) => !l.contains(el) && !l.querySelector("input"));
    if (label) return label.textContent.trim();
  }
  return name;
}
