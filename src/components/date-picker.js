// src/components/date-picker.js — champs date des formulaires avec un calendrier
// aux couleurs du site (même panneau blanc que les listes déroulantes),
// à la place du calendrier natif du navigateur (différent sur chaque système).
//
// STRUCTURE (Webflow) :
//   input[data-date-input]       champ texte du formulaire (Webflow)
//   input[type="date"]           tout champ date d'un formulaire (devis des
//                                lieux, page Événementiel…) : même calendrier,
//                                sans attribut à poser
//   OPTIONS :
//     data-date-min="today"      pas de date passée (par défaut)
//     data-date-min="none"       toutes les dates
//     data-native-date           garder le calendrier natif
//     data-date-undecided="off"  pas de choix « Date pas encore définie »
//
// « Date pas encore définie » (affiché par défaut sous le calendrier) : le champ
// passe en texte et envoie ce libellé (t("date.undecided")) à la place d'une date.
//
// Le champ de Webflow reste dans le formulaire (caché) : il passe en type
// « date » et c'est lui qui est envoyé et validé (required, min). Le JS pose
// devant lui un bouton qui reprend ses classes Webflow (même aspect) et ouvre
// le calendrier. Choisir un jour met à jour le champ et déclenche « change ».
//
// Clavier (dans le calendrier) : flèches = jour / semaine, Page préc. / suiv.
// = mois, Début / Fin = début / fin de semaine, Entrée = choisir, Échap = fermer.
//
// Classes créées : date-picker, date-picker_button, date-picker_value,
// date-picker_native, date-picker_panel, date-picker_head, date-picker_month,
// date-picker_nav, date-picker_grid, date-picker_weekday, date-picker_day
// (+ is-today, is-selected, is-outside). Styles : _date-picker.scss.

import { t, getLocale } from "../utils/i18n.js";

const GAP = 8; // px entre le champ et le calendrier
let uid = 0;

export function initDatePickers(root = document) {
  root
    .querySelectorAll('input[data-date-input], form input[type="date"]:not([data-native-date])')
    .forEach(initDatePicker);
}

// Champ envoyé : date native, pas de date passée sauf data-date-min="none"
function setupNative(input) {
  input.type = "date";
  if (input.getAttribute("data-date-min") !== "none" && !input.min)
    input.min = toIso(new Date());
}

// ---------- Dates « locales » au format AAAA-MM-JJ (sans fuseau) ----------
const pad = (n) => String(n).padStart(2, "0");
const toIso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Même jour le mois suivant / précédent (31 → dernier jour du mois si besoin)
const addMonths = (d, n) => {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(
    d.getFullYear(),
    d.getMonth() + n,
    Math.min(d.getDate(), last),
  );
};
const sameDay = (a, b) => !!a && !!b && toIso(a) === toIso(b);

function initDatePicker(input) {
  if (input.dataset.datePicker) return;
  input.dataset.datePicker = "1";
  // Texte d'attente : celui du champ, sauf « Example Text » (défaut de Webflow,
  // quelle que soit la casse)
  const own = input.placeholder.trim();
  const placeholder = own && !/^example text$/i.test(own) ? own : t("date.placeholder");
  const allowUndecided = input.getAttribute("data-date-undecided") !== "off";
  setupNative(input);
  if (input.hasAttribute("data-native-date")) return;
  const id = `date-picker-${++uid}`;
  const locale = getLocale();
  const minDate = () => fromIso(input.min);

  // ---------- Bouton (mêmes classes que le champ : même aspect) ----------
  const wrap = document.createElement("div");
  wrap.className = "date-picker";
  input.before(wrap);
  wrap.appendChild(input);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `${input.className} date-picker_button`;
  button.id = `${id}-button`;
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${id}-panel`);
  const value = document.createElement("span");
  value.className = "date-picker_value";
  button.appendChild(value);
  wrap.insertBefore(button, input);

  input.classList.add("date-picker_native");
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");

  // Libellé : relié au bouton (un clic dessus met le focus sur le bouton)
  const labels = input.id
    ? [...document.querySelectorAll(`label[for="${CSS.escape(input.id)}"]`)]
    : [];
  labels.forEach((label, i) => {
    if (!label.id) label.id = `${id}-label-${i}`;
    label.addEventListener("click", (e) => {
      e.preventDefault();
      button.focus();
    });
  });
  if (labels.length)
    button.setAttribute(
      "aria-labelledby",
      `${labels.map((l) => l.id).join(" ")} ${button.id}`,
    );
  else if (input.getAttribute("aria-label"))
    button.setAttribute("aria-label", input.getAttribute("aria-label"));

  // ---------- Calendrier (rattaché au <body> : rien ne le coupe) ----------
  const panel = document.createElement("div");
  panel.className = "search_suggest date-picker_panel";
  panel.id = `${id}-panel`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t("date.dialog"));
  panel.setAttribute("data-lenis-prevent", "");
  panel.hidden = true;
  panel.innerHTML = `
    <div class="date-picker_head">
      <button type="button" class="date-picker_nav is-prev"><span aria-hidden="true"></span></button>
      <p class="date-picker_month" aria-live="polite"></p>
      <button type="button" class="date-picker_nav is-next"><span aria-hidden="true"></span></button>
    </div>
    <table class="date-picker_grid" role="grid"><thead><tr></tr></thead><tbody></tbody></table>`;
  document.body.appendChild(panel);

  // Choix « Date pas encore définie », sous la grille
  let undecidedBtn = null;
  if (allowUndecided) {
    undecidedBtn = document.createElement("button");
    undecidedBtn.type = "button";
    undecidedBtn.className = "date-picker_undecided";
    undecidedBtn.textContent = t("date.undecided");
    panel.appendChild(undecidedBtn);
  }
  const isUndecided = () => input.dataset.dateUndecided === "1";

  const prev = panel.querySelector(".is-prev");
  const next = panel.querySelector(".is-next");
  const monthLabel = panel.querySelector(".date-picker_month");
  const grid = panel.querySelector(".date-picker_grid");
  const body = grid.querySelector("tbody");
  prev.setAttribute("aria-label", t("date.prev"));
  next.setAttribute("aria-label", t("date.next"));
  monthLabel.id = `${id}-month`;
  grid.setAttribute("aria-labelledby", monthLabel.id);

  // En-tête des jours (semaine du lundi), noms courts et complets
  const monday = new Date(2024, 0, 1); // un lundi
  const short = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const long = new Intl.DateTimeFormat(locale, { weekday: "long" });
  grid.querySelector("thead tr").innerHTML = Array.from(
    { length: 7 },
    (_, i) => {
      const d = addDays(monday, i);
      return `<th scope="col" class="date-picker_weekday" abbr="${long.format(d)}">${short.format(d).replace(".", "")}</th>`;
    },
  ).join("");

  const fmtMonth = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const fmtFull = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fmtDay = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let focused = null; // jour qui a le focus dans la grille

  // Texte du bouton = date choisie (ou texte d'attente)
  function refresh() {
    const undecided = isUndecided();
    const date = undecided ? null : fromIso(input.value);
    value.textContent = undecided
      ? t("date.undecided")
      : date
        ? fmtFull.format(date)
        : placeholder;
    button.classList.toggle("is-placeholder", !date && !undecided);
    button.disabled = input.disabled;
    if (undecidedBtn) {
      undecidedBtn.classList.toggle("is-selected", undecided);
      undecidedBtn.setAttribute("aria-pressed", String(undecided));
    }
  }

  // Grille du mois de « focused » : 6 semaines, du lundi au dimanche
  function render() {
    const first = new Date(focused.getFullYear(), focused.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    const min = minDate();
    const selected = fromIso(input.value);
    const today = new Date();
    const label = fmtMonth.format(first);
    monthLabel.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    // Pas de mois entièrement passé
    prev.disabled =
      !!min && new Date(first.getFullYear(), first.getMonth(), 0) < min;

    let html = "";
    for (let w = 0; w < 6; w++) {
      html += "<tr>";
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, w * 7 + i);
        const outside = d.getMonth() !== first.getMonth();
        const disabled = !!min && d < min;
        const classes = ["date-picker_day"];
        if (outside) classes.push("is-outside");
        if (sameDay(d, today)) classes.push("is-today");
        if (sameDay(d, selected)) classes.push("is-selected");
        html += `<td role="gridcell"${sameDay(d, selected) ? ' aria-selected="true"' : ""}><button type="button" class="${classes.join(" ")}" data-date="${toIso(d)}" tabindex="${sameDay(d, focused) ? 0 : -1}" aria-label="${fmtDay.format(d)}"${sameDay(d, today) ? ' aria-current="date"' : ""}${disabled ? " disabled" : ""}>${d.getDate()}</button></td>`;
      }
      html += "</tr>";
    }
    body.innerHTML = html;
  }

  // Déplace le focus sur un jour (change de mois si besoin), jamais avant min
  function focusDay(date) {
    const min = minDate();
    focused = min && date < min ? min : date;
    render();
    body.querySelector(`[data-date="${toIso(focused)}"]`)?.focus();
  }

  function place() {
    if (panel.hidden) return;
    const rect = button.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const left = Math.min(rect.left, window.innerWidth - width - 16);
    panel.style.top = `${rect.bottom + window.scrollY + GAP}px`;
    panel.style.left = `${Math.max(16, left) + window.scrollX}px`;
    panel.style.width = `${Math.min(width, window.innerWidth - 32)}px`;
  }

  function open() {
    if (!panel.hidden || input.disabled) return;
    const min = minDate();
    const selected = isUndecided() ? null : fromIso(input.value);
    const today = new Date();
    focused = selected || (min && today < min ? min : today);
    refresh();
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    wrap.classList.add("is-open");
    place();
    focusDay(focused);
  }

  function close(returnFocus = true) {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    wrap.classList.remove("is-open");
    if (returnFocus) button.focus();
  }

  // Date choisie (AAAA-MM-JJ), ou null pour « Date pas encore définie »
  // (le champ passe alors en texte pour envoyer ce libellé)
  function choose(iso) {
    if (iso) {
      delete input.dataset.dateUndecided;
      input.type = "date";
      input.value = iso;
    } else {
      input.dataset.dateUndecided = "1";
      input.type = "text";
      input.value = t("date.undecided");
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  }

  // ---------- Souris et clavier ----------
  button.addEventListener("click", () => (panel.hidden ? open() : close()));
  button.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      open();
    }
  });

  prev.addEventListener("click", () => {
    focused = addMonths(focused, -1);
    const min = minDate();
    if (min && focused < min) focused = min;
    render();
  });
  next.addEventListener("click", () => {
    focused = addMonths(focused, 1);
    render();
  });

  body.addEventListener("click", (e) => {
    const day = e.target.closest(".date-picker_day");
    if (day && !day.disabled) choose(day.dataset.date);
  });
  undecidedBtn?.addEventListener("click", () => choose(null));

  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      return close();
    }
    // Tab : on garde le focus dans le calendrier (précédent, suivant, jour)
    if (e.key === "Tab") {
      const stops = [
        prev,
        next,
        body.querySelector('[tabindex="0"]'),
        undecidedBtn,
      ].filter(
        (el) => el && !el.disabled,
      );
      const i = stops.indexOf(document.activeElement);
      e.preventDefault();
      stops[(i + (e.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus();
      return;
    }
    if (!e.target.classList.contains("date-picker_day")) return;
    const moves = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -((focused.getDay() + 6) % 7)),
      End: () => addDays(focused, 6 - ((focused.getDay() + 6) % 7)),
    };
    if (moves[e.key]) {
      e.preventDefault();
      focusDay(moves[e.key]());
    }
  });

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (
        !panel.hidden &&
        !wrap.contains(e.target) &&
        !panel.contains(e.target)
      )
        close(false);
    },
    true,
  );

  let placing = false;
  const schedulePlace = () => {
    if (placing || panel.hidden) return;
    placing = true;
    requestAnimationFrame(() => {
      placing = false;
      place();
    });
  };
  window.addEventListener("resize", schedulePlace, { passive: true });
  document.addEventListener("scroll", schedulePlace, {
    passive: true,
    capture: true,
  });

  // ---------- Synchronisation avec le champ ----------
  // Valeur changée par un autre script : « change » ; activé / désactivé
  // (champs conditionnels du formulaire de contact) : observé.
  input.addEventListener("change", refresh);
  new MutationObserver(() => {
    refresh();
    if (input.disabled) close(false);
  }).observe(input, { attributes: true, attributeFilter: ["disabled"] });
  // Champ obligatoire vide à l'envoi : le focus va sur le bouton
  input.addEventListener("invalid", () => button.focus());
  // Formulaire vidé : retour au champ date
  input.form?.addEventListener("reset", () =>
    setTimeout(() => {
      delete input.dataset.dateUndecided;
      input.type = "date";
      refresh();
    }),
  );

  refresh();
}
