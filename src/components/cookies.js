// src/components/cookies.js — bandeau cookies (tarteaucitron.js) et chargement
// des traceurs après consentement.
//
// Reprend la configuration du site WordPress actuel (plugin « work-and-share-
// cookies ») : mêmes services, même nom de cookie de consentement
// (workandshare-rgpd-v3), pour que les choix déjà faits par les visiteurs sur
// www.workandshare.com restent valables après la mise en ligne.
//
// Services (chacun demande un consentement) :
//   ws_google   Google Tag Manager (GA4, Google Ads…) + mode consentement Google
//   ws_lemlist  suivi des visiteurs Lemlist
//   ws_hubspot  suivi HubSpot : pages vues, origine du visiteur (UTM) et
//               récupération des formulaires Webflow dans le CRM
//
// Les traceurs ne se chargent qu'en production (PROD_HOSTS) : sur le staging
// Webflow, le bandeau s'affiche et enregistre le choix, sans fausser les stats.
//
// STRUCTURE (Webflow) :
//   [data-cookies-open]    lien « Gérer mes cookies » (footer) : rouvre le panneau
//
// tarteaucitron vient de jsDelivr (version figée) ; ses fichiers de langue et
// son CSS sont chargés depuis le même dossier. Habillage : _cookies.scss.

import { loadScript } from "../utils/load-asset.js";
import { getLang, LOCALES, t } from "../utils/i18n.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { getLenis } from "../core/core.js";

const TAC_VERSION = "1.37.0";
const TAC_SRC = `https://cdn.jsdelivr.net/npm/tarteaucitronjs@${TAC_VERSION}/tarteaucitron.min.js`;
const COOKIE_NAME = "workandshare-rgpd-v3";
const GTM_ID = "GTM-WZ435KKQ";
const LEMLIST_URL =
  "https://app.lemlist.com/api/visitors/tracking?k=IHILTTYZDyQDD7TNYECwmJ7PY%2BPNEEIjPGi%2BKKBWqQc%3D&t=tea_ZD2HD7unCiEKZPfJh";
const HUBSPOT_ID = "148815361"; // compte HubSpot (région UE)
const PROD_HOSTS = ["www.workandshare.com", "workandshare.com"];

const CLOSE_DURATION = 250; // ms, comme les animations de sortie (_cookies.scss)

const isProd = () => PROD_HOSTS.includes(location.hostname);

// Animation de sortie : tarteaucitron masque d'un coup (display: none). On pose
// .ws-closing sur les éléments visibles, puis on laisse tarteaucitron fermer
// une fois l'animation jouée. Rien si les animations sont réduites.
function animateClose(tac, method, ids) {
  const ui = tac.userInterface;
  const original = ui[method];
  if (typeof original !== "function") return;
  let closing = false;
  ui[method] = function (...args) {
    const els = ids
      .map((elId) => document.getElementById(elId))
      .filter((el) => el && getComputedStyle(el).display !== "none");
    if (closing || prefersReducedMotion() || !els.length) return original.apply(this, args);
    closing = true;
    els.forEach((el) => el.classList.add("ws-closing"));
    setTimeout(() => {
      closing = false;
      els.forEach((el) => el.classList.remove("ws-closing"));
      original.apply(this, args);
    }, CLOSE_DURATION);
  };
}

// Panneau ouvert : page figée derrière (comme le mega menu : classe sur <html>
// et Lenis arrêté) et vidéos en pause, relancées à la fermeture.
let pausedVideos = [];

function onPanel(open) {
  document.documentElement.classList.toggle("is-cookies-open", open);
  // La liste du panneau garde sa molette quand Lenis est arrêté
  document.getElementById("tarteaucitron")?.setAttribute("data-lenis-prevent", "");
  const lenis = getLenis();
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) {
    pausedVideos = [...document.querySelectorAll("video")].filter((video) => !video.paused);
    pausedVideos.forEach((video) => video.pause());
  } else {
    pausedVideos.forEach((video) => video.play().catch(() => {}));
    pausedVideos = [];
  }
}

// Mode consentement Google : tout refusé par défaut, mis à jour au choix
window.dataLayer = window.dataLayer || [];
window.gtag =
  window.gtag ||
  function () {
    window.dataLayer.push(arguments);
  };

function googleConsent(granted) {
  const state = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: state,
    analytics_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    personalization_storage: state,
  });
}

// Supprime des cookies sur le domaine courant et le domaine racine
function removeCookies(names) {
  const host = location.hostname;
  const bare = host.replace(/^www\./, "");
  const domains = ["", host, `.${host}`, bare, `.${bare}`];
  names.forEach((name) =>
    domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}${
        location.protocol === "https:" ? "; Secure" : ""
      }`;
    }),
  );
}

export function initCookies() {
  if (window.__wsCookies) return;
  window.__wsCookies = true;

  window.gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    personalization_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });

  // Réglages lus par tarteaucitron à son chargement
  window.tarteaucitronForceLanguage = getLang();
  window.tarteaucitronForceExpire = 365;
  window.tarteaucitronCustomText = {
    alertBigPrivacy: `<strong class="ws-cookie-title">${t("cookies.title")}</strong>${t("cookies.text")}`,
  };

  // « Gérer mes cookies » : rouvre le panneau (même avant le chargement de tarteaucitron)
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-cookies-open]");
    if (!link) return;
    e.preventDefault();
    window.tarteaucitron?.userInterface?.openPanel();
  });

  loadScript(TAC_SRC)
    .then(setup)
    .catch(() => {});
}

function setup() {
  const tac = window.tarteaucitron;
  if (!tac) return;
  const loaded = {};

  tac.services.ws_google = {
    key: "ws_google",
    type: "ads",
    name: t("cookies.google"),
    uri: "https://policies.google.com/privacy",
    needConsent: true,
    cookies: ["_ga", "_gid", "_gat", "_gcl_au"],
    js() {
      googleConsent(true);
      if (!isProd()) return;
      loaded.ws_google = true;
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      tac.addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`);
    },
    fallback() {
      googleConsent(false);
    },
  };

  tac.services.ws_lemlist = {
    key: "ws_lemlist",
    type: "ads",
    name: t("cookies.lemlist"),
    uri: "https://www.lemlist.com/privacy-policy",
    needConsent: true,
    cookies: [],
    js() {
      if (!isProd()) return;
      loaded.ws_lemlist = true;
      tac.addScript(LEMLIST_URL);
    },
    fallback() {},
  };

  tac.services.ws_hubspot = {
    key: "ws_hubspot",
    type: "analytic",
    name: t("cookies.hubspot"),
    uri: "https://legal.hubspot.com/fr/privacy-policy",
    needConsent: true,
    cookies: ["hubspotutk", "__hstc", "__hssc", "__hssrc"],
    js() {
      if (!isProd()) return;
      loaded.ws_hubspot = true;
      tac.addScript(`https://js-eu1.hs-scripts.com/${HUBSPOT_ID}.js`, "hs-script-loader");
    },
    fallback() {},
  };

  (tac.job = tac.job || []).push("ws_google", "ws_lemlist", "ws_hubspot");

  const prefix = LOCALES[getLang()]?.prefix || "";
  tac.init({
    privacyUrl: `${prefix}/politique-de-confidentialite`,
    bodyPosition: "bottom",
    hashtag: "#tarteaucitron",
    cookieName: COOKIE_NAME,
    orientation: "bottom",
    groupServices: false,
    showDetailsOnClick: true,
    serviceDefaultState: "wait",
    showAlertSmall: false,
    cookieslist: false,
    closePopup: false,
    showIcon: false,
    adblocker: false,
    DenyAllCta: true,
    AcceptAllCta: true,
    highPrivacy: true,
    handleBrowserDNTRequest: false,
    removeCredit: true,
    moreInfoLink: true,
    useExternalCss: false,
    useExternalJs: false,
    mandatory: true,
    mandatoryCta: true,
    googleConsentMode: false,
    partnersList: false,
  });

  animateClose(tac, "closePanel", ["tarteaucitron", "tarteaucitronBack"]);
  window.addEventListener("tac.open_panel", () => onPanel(true));
  window.addEventListener("tac.close_panel", () => onPanel(false));
  animateClose(tac, "closeAlert", ["tarteaucitronAlertBig"]);

  // Consentement retiré : on coupe Google, on efface ses cookies et on recharge
  // la page (un script déjà chargé ne peut pas être « déchargé »)
  document.addEventListener("tac.consent_updated", () => {
    const cookie = tac.cookie.read();
    Object.keys(loaded).forEach((key) => {
      if (cookie.includes(`!${key}=true`)) return;
      if (key === "ws_google") {
        googleConsent(false);
        const names = document.cookie
          .split(";")
          .map((c) => c.trim().split("=")[0])
          .filter((name) => /^(_ga|_gid|_gat|_gcl_)/.test(name));
        removeCookies(names);
      }
      if (key === "ws_hubspot") removeCookies(tac.services.ws_hubspot.cookies);
      tac.reloadThePage = true;
    });
  });
}
