// src/components/room-details.js — détail d'une salle (« Voir la salle ») dans la
// section « Nos salles » des pages lieux événementiels (Figma 4681:28306).
//
// STRUCTURE (attributs posés dans Webflow) :
//   [data-room]                          salle (élément de la liste CMS)
//     [data-room-card]                   carte (photo, nom, « Voir la salle »)
//       [data-room-toggle]               bouton « Voir la salle » (1er <span> = libellé)
//     [data-room-panel]                  détail, masqué par Webflow
//       [data-room-close]                bouton « Fermer »
//       [data-room-configurations]       capacités (texte riche « 16 · Réunion »)
//       [data-room-views]                photo / plan
//         [data-room-view-toggle="photo|plan"]   onglets (role="tab")
//         img.venue-room_view            photo ; img.venue-room_view.is-plan = plan
//
// Clic sur « Voir la salle » : la carte passe en rose (is-open), son bouton
// devient « Refermer », le détail s'ouvre sur toute la largeur sous la rangée
// (une seule salle ouverte à la fois). « Fermer », « Refermer » ou Échap
// referment. Onglets Photos / Plan avec fond glissant ; onglet Plan masqué si la
// salle n'a pas de plan.

import { t } from "../utils/i18n.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { requestScrollRefresh } from "../utils/scroll-refresh.js";
import { getLenis } from "../core/core.js";
import { createSegmentedIndicator } from "../utils/tab-indicator.js";

let uid = 0;

export function initRoomDetails(root = document) {
  root.querySelectorAll("[data-rooms]").forEach((section) => {
    const rooms = [...section.querySelectorAll("[data-room]")].filter(
      (room) => room.querySelector("[data-room-toggle]") && room.querySelector("[data-room-panel]"),
    );
    if (!rooms.length) return;
    const controls = rooms.map((room) => initRoom(room, () => controls));
  });
}

// Lien Webflow (href="#") utilisé comme bouton
function asButton(el, onPress) {
  if (el.tagName === "A") el.removeAttribute("href");
  if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    onPress();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onPress();
  });
}

function initRoom(room, getAll) {
  const toggle = room.querySelector("[data-room-toggle]");
  const panel = room.querySelector("[data-room-panel]");
  const label = toggle.querySelector("span") || toggle;
  const openLabel = label.textContent.trim();

  const id = panel.id || `room-detail-${++uid}`;
  panel.id = id;
  toggle.setAttribute("aria-controls", id);
  panel.setAttribute("role", "region");
  const title = panel.querySelector(".venue-room_detail-title, h3, h4, p");
  if (title) {
    title.id = title.id || `${id}-title`;
    panel.setAttribute("aria-labelledby", title.id);
  }

  let isOpen = false;
  let views = null; // onglets photo / plan, préparés à la première ouverture

  function open() {
    getAll().forEach((c) => c !== api && c.close(false));
    isOpen = true;
    room.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    label.textContent = t("rooms.closeRoom");
    if (!views) views = initViews(room);
    views?.refresh();
    if (!prefersReducedMotion()) {
      panel.classList.remove("is-panel-in");
      void panel.offsetWidth; // relance l'animation
      panel.classList.add("is-panel-in");
    }
    requestScrollRefresh();
    // Le détail doit être visible : défilement doux si son haut sort de l'écran
    requestAnimationFrame(() => {
      const top = panel.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.6 || top < 0) {
        const target = room.querySelector("[data-room-card]");
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(target, { offset: -120 });
        else target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
    });
  }

  function close(focusToggle = true) {
    if (!isOpen) return;
    isOpen = false;
    room.classList.remove("is-open");
    panel.classList.remove("is-panel-in");
    toggle.setAttribute("aria-expanded", "false");
    label.textContent = openLabel;
    requestScrollRefresh();
    if (focusToggle) toggle.focus({ preventScroll: true });
  }

  asButton(toggle, () => (isOpen ? close(false) : open()));
  // Toute la carte est cliquable (le bouton reste la cible clavier)
  const card = room.querySelector("[data-room-card]");
  card?.addEventListener("click", (e) => {
    if (e.target.closest("[data-room-toggle]")) return; // déjà géré
    isOpen ? close(false) : open();
  });
  room.querySelectorAll("[data-room-close]").forEach((btn) => asButton(btn, () => close()));
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  formatConfigurations(panel);

  const api = { close };
  return api;
}

// Capacités « 16 · Réunion » -> chiffre + libellé (mis en forme en pastilles)
function formatConfigurations(panel) {
  const box = panel.querySelector("[data-room-configurations]");
  if (!box) return;
  box.querySelectorAll("li, p").forEach((item) => {
    if (item.querySelector(".room-config_value")) return;
    const match = item.textContent.trim().match(/^(\d[\d\s  ]*)\s*[·:–-]\s*(.+)$/);
    if (!match) return;
    item.textContent = "";
    const value = document.createElement("strong");
    value.className = "room-config_value";
    value.textContent = match[1].trim();
    const name = document.createElement("span");
    name.className = "room-config_label";
    name.textContent = match[2].trim();
    item.append(value, name);
  });
}

// Onglets Photos / Plan de la salle
function initViews(room) {
  const box = room.querySelector("[data-room-views]");
  if (!box) return null;
  const tabs = [...box.querySelectorAll("[data-room-view-toggle]")];
  if (!tabs.length) return null;
  const photo = box.querySelector(".venue-room_view:not(.is-plan)");
  const plan = box.querySelector(".venue-room_view.is-plan");
  const hasPlan = plan && !plan.classList.contains("w-dyn-bind-empty") && plan.getAttribute("src");

  // Pas de plan : onglets inutiles
  if (!hasPlan) {
    tabs[0].parentElement.hidden = true;
    return null;
  }

  let current = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
  const indicator = createSegmentedIndicator(tabs[0].parentElement, () => current, { copyColor: false });

  const show = (tab, focus = false) => {
    current = tab;
    const isPlan = tab.getAttribute("data-room-view-toggle") === "plan";
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    box.classList.toggle("is-plan-view", isPlan);
    if (photo) photo.hidden = isPlan;
    if (plan) plan.hidden = !isPlan;
    indicator.move();
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    asButton(tab, () => show(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      show(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });
  show(current);

  // Le panneau était masqué à la création : on recale le fond à l'ouverture
  return { refresh: () => indicator.move(false) };
}
