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
// Vue « Plan » : plan dessiné (room-plan.js) d'après la surface de la carte
// (« 40 m² ») et les capacités (« 16 · Réunion », « 14 · En U »…) ; sélecteur
// des seules configurations renseignées. Sans capacité : image du plan CMS.
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
import { createRoomPlan } from "./room-plan.js";

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

  room.roomConfigs = readConfigs(panel); // avant la mise en forme ci-dessous
  formatConfigurations(panel);
  addFeatureIcons(panel);

  const api = { close };
  return api;
}

// Icône de chaque équipement, choisie d'après son texte. ico-* = icônes du
// site (Webflow) ; screen, mic, video, split = icônes ajoutées (_room-details.scss)
const FEATURE_ICONS = [
  [/lumi[eè]re|fen[eê]tre|soleil|jour/i, "ico-sun"],
  [/paperboard|tableau|whiteboard/i, "ico-presentation"],
  [/[ée]cran|visio|t[ée]l[ée]|projecteur/i, "room-icon is-screen"],
  [/r[ée]gie|vid[ée]o|cam[ée]ra|captation/i, "room-icon is-video"],
  [/micro|sono|son\b|enceinte|audio/i, "room-icon is-mic"],
  [/divisible|modulable|cloison/i, "room-icon is-split"],
  [/bistrot|caf[ée]|restaura|bar\b|cocktail|traiteur/i, "ico-coffee"],
  [/rooftop|terrasse|jardin/i, "ico-rooftop"],
  [/wi-?fi|internet|fibre/i, "ico-wifi"],
  [/parking/i, "ico-parking"],
  [/mobilier|fauteuil|canap|lounge/i, "ico-sofa"],
  [/acc[eè]s|badge|24/i, "ico-key"],
];

function addFeatureIcons(panel) {
  panel.querySelectorAll("[data-room-equipements] li").forEach((li) => {
    if (li.querySelector(".room-feature_icon")) return;
    const text = li.textContent;
    const cls = (FEATURE_ICONS.find(([re]) => re.test(text)) || [, "ico-check-circle"])[1];
    const puce = document.createElement("span");
    puce.className = "room-feature_icon";
    puce.setAttribute("aria-hidden", "true");
    const icon = document.createElement("span");
    icon.className = cls;
    puce.appendChild(icon);
    li.prepend(puce);
  });
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

// Onglets Photos / Plan de la salle. Si la salle a des capacités par
// configuration (Réunion, En U, Théâtre, Cocktail), la vue « Plan » montre le
// plan dessiné (room-plan.js) et, sous lui, un sélecteur des configurations
// renseignées ; sinon l'image « Plan de la salle » du CMS.
const PLAN_KEYS = ["reunion", "theatre", "en-u", "cocktail"]; // ordre Figma
const isFilled = (img) => img && !img.classList.contains("w-dyn-bind-empty") && img.getAttribute("src");
const plain = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// « Réunion » -> reunion ; « En U » / « U » -> en-u ; autres (classe…) : ignorées
function configKey(label) {
  const l = plain(label);
  if (l.startsWith("reunion") || l.startsWith("meeting")) return "reunion";
  if (l.startsWith("theatre")) return "theatre";
  if (l === "u" || l.startsWith("en u") || l.startsWith("u-")) return "en-u";
  if (l.startsWith("cocktail")) return "cocktail";
  return null;
}

// Capacités lues dans [data-room-configurations] (« 16 · Réunion »)
function readConfigs(panel) {
  const box = panel.querySelector("[data-room-configurations]");
  if (!box) return [];
  const found = {};
  box.querySelectorAll("li, p").forEach((item) => {
    const m = item.textContent.replace(/\s+/g, " ").trim().match(/^(\d+)\s*[·:–-]?\s*(.+)$/);
    const key = m && configKey(m[2]);
    if (key && !found[key]) found[key] = parseInt(m[1], 10);
  });
  return PLAN_KEYS.filter((k) => found[k]).map((k) => ({ key: k, n: found[k] }));
}

// Surface en m² (« 40 m² ») lue dans la carte
function readSurface(room) {
  const m = (room.querySelector(".venue-room_meta")?.textContent || "").match(/(\d+[.,]?\d*)\s*m/);
  return m ? parseFloat(m[1].replace(",", ".")) : 40;
}

function initViews(room) {
  const box = room.querySelector("[data-room-views]");
  if (!box) return null;
  const tabs = [...box.querySelectorAll("[data-room-view-toggle]")];
  if (!tabs.length) return null;
  const photo = box.querySelector(".venue-room_view:not(.is-plan)");
  const planImgs = [...box.querySelectorAll(".venue-room_view.is-plan")];
  const mainPlan = planImgs.find((img) => !img.hasAttribute("data-room-plan"));
  const configs = room.roomConfigs || [];

  // Ni capacités ni image de plan : onglets inutiles
  if (!configs.length && !isFilled(mainPlan)) {
    tabs[0].parentElement.hidden = true;
    return null;
  }

  // Plan dessiné, créé à la première ouverture de la vue « Plan »
  let drawn = null, stage = null, read = null, picker = null;
  function ensurePlan() {
    if (drawn || !configs.length) return;
    stage = document.createElement("div");
    stage.className = "room-plan";
    stage.setAttribute("role", "img");
    box.appendChild(stage);
    read = document.createElement("p");
    read.className = "room-plan_read";
    box.appendChild(read);
    drawn = createRoomPlan(stage, { surface: readSurface(room), configs });
    const label = (c) => t(`rooms.plan.${c.key}`);
    const select = (c) => {
      drawn.show(c.key);
      read.textContent = t("rooms.planSeats", { n: c.n });
      stage.setAttribute("aria-label", t("rooms.planAlt", { config: label(c), n: c.n }));
    };
    if (configs.length > 1) picker = createConfigSwitch(box, configs.map(label), (i) => select(configs[i]));
    else select(configs[0]);
  }

  let current = tabs.find((tb) => tb.getAttribute("aria-selected") === "true") || tabs[0];
  const indicator = createSegmentedIndicator(tabs[0].parentElement, () => current, { copyColor: false });

  const show = (tab, focus = false) => {
    current = tab;
    const isPlan = tab.getAttribute("data-room-view-toggle") === "plan";
    tabs.forEach((tb) => {
      const on = tb === tab;
      tb.classList.toggle("is-active", on);
      tb.setAttribute("aria-selected", String(on));
      tb.tabIndex = on ? 0 : -1;
    });
    if (isPlan) ensurePlan();
    box.classList.toggle("is-plan-view", isPlan);
    if (photo) photo.hidden = isPlan;
    // Image du CMS seulement sans plan dessiné
    planImgs.forEach((img) => (img.hidden = !(isPlan && !drawn && img === mainPlan)));
    [stage, read].forEach((el) => el && (el.hidden = !isPlan));
    if (picker) {
      picker.element.hidden = !isPlan;
      if (isPlan) picker.refresh();
    }
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

  // Le panneau était masqué à la création : on recale les fonds à l'ouverture
  return {
    refresh: () => {
      indicator.move(false);
      picker?.refresh();
    },
  };
}

// Pastilles de configuration sous le plan (libellés via t())
function createConfigSwitch(box, labels, onChange) {
  const group = document.createElement("div");
  group.className = "room-plan-switch";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", t("rooms.planConfig"));

  let current = null;
  const buttons = labels.map((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "room-plan-switch_option";
    btn.setAttribute("role", "radio");
    btn.textContent = label;
    group.appendChild(btn);
    return btn;
  });
  // Sous la boîte photo / plan, hors du cadre (Figma) : boîte et sélecteur
  // regroupés dans la même colonne de la grille
  const col = document.createElement("div");
  col.className = "room-media-col";
  box.before(col);
  col.append(box, group);
  const indicator = createSegmentedIndicator(group, () => current, { copyColor: false });

  const select = (i, focus = false) => {
    current = buttons[i];
    buttons.forEach((b, k) => {
      b.classList.toggle("is-active", k === i);
      b.setAttribute("aria-checked", String(k === i));
      b.tabIndex = k === i ? 0 : -1;
    });
    indicator.move();
    if (focus) current.focus();
    onChange(i);
  };

  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => select(i));
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      select((i + step + buttons.length) % buttons.length, true);
    });
  });
  select(0);

  return { element: group, refresh: () => indicator.move(false) };
}
