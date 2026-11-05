// src/components/rooms-filter.js — filtre « Combien serez-vous ? » de la section
// « Nos salles » (pages des lieux événementiels).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-rooms]                                section
//     [data-room-filter]                        bloc du filtre
//       [data-room-filter-option="toutes"]      pastille « Toutes » (lien role="radio")
//       [data-room-filter-option="10 à 20"]     pastille d'une jauge (même texte
//                                               que l'option « Jauge » du CMS)
//     [data-room]                               salle (élément de la liste CMS)
//       data-room-jauge="10 à 20"               jauge de la salle (CMS)
//       data-room-capacite="15"                 capacité max (CMS)
//
// Clic sur une jauge : seules les salles de cette jauge restent. S'il n'y en a
// aucune, on montre les salles assez grandes pour le groupe (capacité ≥ début
// de la fourchette), pour ne jamais laisser la liste vide. Pastilles = groupe
// de boutons radio (flèches au clavier). Le nombre de salles affichées est
// annoncé aux lecteurs d'écran. Le fond de la pastille active glisse d'une
// pastille à l'autre (utils/tab-indicator.js).

import { t } from "../utils/i18n.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";
import { createSegmentedIndicator } from "../utils/tab-indicator.js";

export function initRoomsFilters(root = document) {
  root.querySelectorAll("[data-rooms]").forEach(initRoomsFilter);
}

// « Moins de 10 » -> 0 ; « 10 à 20 » -> 10 ; « Plus de 100 » -> 100
function minOf(label) {
  if (/^moins|^less|^under/i.test(label)) return 0;
  const n = label.match(/\d+/);
  return n ? parseInt(n[0], 10) : 0;
}

const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

function initRoomsFilter(section) {
  const options = [...section.querySelectorAll("[data-room-filter-option]")];
  const rooms = [...section.querySelectorAll("[data-room]")];
  if (!options.length || !rooms.length) return;

  // Annonce pour les lecteurs d'écran (« 3 salles »)
  const status = document.createElement("p");
  status.className = "rooms-filter_status";
  status.setAttribute("role", "status");
  section.querySelector("[data-room-filter]")?.appendChild(status);

  function apply(value) {
    const all = !value || norm(value) === "toutes" || norm(value) === "all";
    let visible = all ? rooms : rooms.filter((r) => norm(r.getAttribute("data-room-jauge")) === norm(value));
    // Aucune salle de cette jauge : celles qui peuvent accueillir le groupe
    if (!visible.length) {
      const min = minOf(value);
      visible = rooms.filter((r) => (parseInt(r.getAttribute("data-room-capacite"), 10) || 0) >= min);
    }

    rooms.forEach((room) => {
      const show = visible.includes(room);
      const wasHidden = room.hidden;
      room.hidden = !show;
      // Petite apparition des salles qui reviennent
      if (show && wasHidden && !prefersReducedMotion()) {
        room.classList.remove("is-room-in");
        void room.offsetWidth; // relance l'animation
        room.classList.add("is-room-in");
      }
    });

    const n = visible.length;
    status.textContent = t(n === 1 ? "rooms.countOne" : "rooms.count", { n });
    requestScrollRefresh();
  }

  let current = options.find((o) => o.getAttribute("aria-checked") === "true") || options[0];
  const indicator = createSegmentedIndicator(options[0].parentElement, () => current);

  const select = (option, focus = false) => {
    current = option;
    options.forEach((o) => {
      const on = o === option;
      o.classList.toggle("is-active", on);
      o.setAttribute("aria-checked", String(on));
      o.tabIndex = on ? 0 : -1; // un seul arrêt de tabulation dans le groupe
    });
    if (focus) option.focus();
    indicator.move();
    apply(option.getAttribute("data-room-filter-option"));
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

  // Départ : la pastille active posée dans Webflow (« Toutes »)
  options.forEach((o) => (o.tabIndex = o === current ? 0 : -1));
}
