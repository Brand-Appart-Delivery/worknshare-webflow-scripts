(() => {
  // src/utils/on-ready.js
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // src/utils/scroll-refresh.js
  var timer = null;
  var dueAt = 0;
  function requestScrollRefresh(delay = 150) {
    if (typeof window.ScrollTrigger === "undefined") return;
    const target = Date.now() + delay;
    if (timer && target <= dueAt) return;
    clearTimeout(timer);
    dueAt = target;
    timer = setTimeout(() => {
      timer = null;
      window.ScrollTrigger.refresh();
    }, delay);
  }

  // src/utils/motion.js
  var query = window.matchMedia("(prefers-reduced-motion: reduce)");
  function prefersReducedMotion() {
    return query.matches;
  }

  // src/core/core.js
  var SMOOTH_SCROLL_ENABLED = true;
  var NAV_SELECTOR = "[data-nav]";
  var ANCHOR_DURATION = 2;
  var HASH_LOAD_DELAY = 400;
  var lenisInstance = null;
  var easeInOutCubic = (t2) => t2 < 0.5 ? 4 * t2 * t2 * t2 : 1 - Math.pow(-2 * t2 + 2, 3) / 2;
  function getAnchorOffset() {
    const nav = document.querySelector(NAV_SELECTOR);
    return nav ? -nav.getBoundingClientRect().height : 0;
  }
  function scrollToHash(hash, { instant = false } = {}) {
    if (!hash || hash === "#") return false;
    let target = null;
    try {
      target = document.querySelector(hash);
    } catch (e) {
      return false;
    }
    if (!target) return false;
    const offset = getAnchorOffset();
    if (lenisInstance) {
      lenisInstance.scrollTo(target, {
        offset,
        duration: instant ? 0 : ANCHOR_DURATION,
        easing: easeInOutCubic,
        immediate: instant,
        force: true
        // Lenis ignore scrollTo() quand il est arrêté (menu ouvert)
      });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: instant ? "auto" : "smooth" });
    }
    return true;
  }
  function initAnchors() {
    document.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest && e.target.closest("a[href*='#']");
        if (!link) return;
        if (link.matches("[role='tab'], [role='button'], [data-formula-tab], [data-slider-prev], [data-slider-next]")) return;
        const url = new URL(link.href, window.location.href);
        const samePage = url.origin === location.origin && url.pathname === location.pathname;
        if (!samePage || !url.hash || url.hash === "#") return;
        if (scrollToHash(url.hash)) {
          e.preventDefault();
          e.stopPropagation();
          history.pushState(null, "", url.hash);
        }
      },
      true
    );
    if (window.location.hash) {
      const hash = window.location.hash;
      window.scrollTo(0, 0);
      const go = () => {
        if (window.scrollY > 50) return;
        scrollToHash(hash);
        setTimeout(() => scrollToHash(hash, { instant: true }), ANCHOR_DURATION * 1e3 + 100);
      };
      const start = () => setTimeout(go, HASH_LOAD_DELAY);
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
    }
  }
  function initLenis() {
    if (lenisInstance) return lenisInstance;
    if (!SMOOTH_SCROLL_ENABLED || typeof window.Lenis === "undefined") return null;
    if (prefersReducedMotion()) return null;
    lenisInstance = new window.Lenis({ lerp: 0.1, smoothWheel: true, anchors: false });
    const hasGsap = typeof window.gsap !== "undefined";
    if (hasGsap) {
      if (typeof window.ScrollTrigger !== "undefined") {
        window.gsap.registerPlugin(window.ScrollTrigger);
        lenisInstance.on("scroll", window.ScrollTrigger.update);
      }
      window.gsap.ticker.add((time) => lenisInstance.raf(time * 1e3));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
    if (typeof ResizeObserver !== "undefined") {
      let lastHeight = 0;
      let timer2 = null;
      new ResizeObserver(() => {
        clearTimeout(timer2);
        timer2 = setTimeout(() => {
          const height = document.body.scrollHeight;
          if (height === lastHeight) return;
          lastHeight = height;
          lenisInstance.resize();
          requestScrollRefresh(0);
        }, 150);
      }).observe(document.body);
    }
    return lenisInstance;
  }
  function getLenis() {
    return lenisInstance;
  }
  function isPlainReload() {
    var _a;
    const nav = (_a = performance.getEntriesByType) == null ? void 0 : _a.call(performance, "navigation")[0];
    return !!nav && nav.type === "reload" && !location.hash;
  }
  function scrollTopNow() {
    window.scrollTo(0, 0);
    lenisInstance == null ? void 0 : lenisInstance.scrollTo(0, { immediate: true, force: true });
  }
  function resetScrollOnReload() {
    if (!isPlainReload()) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTopNow();
    const again = () => requestAnimationFrame(scrollTopNow);
    if (document.readyState === "complete") again();
    else window.addEventListener("load", again, { once: true });
  }
  function initCore() {
    initLenis();
    resetScrollOnReload();
    initAnchors();
  }

  // src/components/collapse.js
  function initCollapses(root = document) {
    root.querySelectorAll("[data-collapse]").forEach((el) => {
      const trigger = el.querySelector("[data-collapse-trigger]");
      const content = el.querySelector("[data-collapse-content]");
      if (!trigger || !content) return;
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", (e) => {
        if (trigger.tagName === "A") e.preventDefault();
        const isOpen = !el.classList.contains("is-open");
        el.classList.toggle("is-open", isOpen);
        trigger.setAttribute("aria-expanded", String(isOpen));
      });
    });
  }

  // src/utils/i18n.js
  var DEFAULT_LANG = "fr";
  var LOCALES = {
    fr: { tag: "fr-FR", prefix: "" },
    en: { tag: "en-GB", prefix: "/en" }
  };
  var DICT = {
    fr: {
      "menu.open": "Menu",
      "menu.close": "Fermer",
      "nav.open": "Ouvrir le menu",
      "nav.close": "Fermer le menu",
      "slider.prev": "\xC9l\xE9ment pr\xE9c\xE9dent",
      "slider.next": "\xC9l\xE9ment suivant",
      "slider.goto": "Aller \xE0 l'\xE9l\xE9ment {{index}}",
      "slider.first": "Premier \xE9l\xE9ment",
      "slider.last": "Dernier \xE9l\xE9ment",
      "map.count": "{n} espaces",
      "map.countOne": "1 espace",
      "map.hideList": "Masquer la liste",
      "map.showList": "Afficher la liste",
      "map.seeList": "Voir la liste",
      "map.showMap": "Voir la carte",
      "map.nearest": "Les plus proches {of}",
      "map.nearestMe": "Les plus proches de vous",
      "map.others": "Autres espaces \xB7 {dept}",
      "map.distance": "\xE0 vol d'oiseau",
      "map.walk": "{station} \xB7 {min} min \xE0 pied",
      "map.pin": "Espace Work & Share de {name}",
      "map.photo": "{name}, photo {n} sur {total}",
      "map.photoGo": "Voir la photo {n}",
      "rooms.count": "{n} salles correspondent",
      "rooms.countOne": "1 salle correspond",
      "rooms.closeRoom": "Refermer",
      "rooms.planConfig": "Configuration de la salle",
      "rooms.plan.reunion": "R\xE9union",
      "rooms.plan.theatre": "Th\xE9\xE2tre",
      "rooms.plan.en-u": "En U",
      "rooms.plan.cocktail": "Cocktail",
      "rooms.planSeats": "{n} personnes",
      "rooms.planAlt": "Plan de la salle en configuration {config}, {n} personnes",
      "map.building": "Immeuble {name}",
      "map.zoomIn": "Zoom avant",
      "map.zoomOut": "Zoom arri\xE8re",
      "map.recenter": "Recentrer sur l'espace",
      "hero.pause": "Mettre la vid\xE9o en pause",
      "hero.play": "Lire la vid\xE9o",
      "lightbox.label": "Photos de l'espace",
      "lightbox.close": "Fermer",
      "lightbox.prev": "Photo pr\xE9c\xE9dente",
      "lightbox.next": "Photo suivante",
      "lightbox.thumbs": "Toutes les photos",
      "lightbox.goto": "Voir la photo {n}",
      "gallery.tour": "Visite 360\xB0 de l'espace",
      "gallery.tourSoon": "La visite 360\xB0 de cet espace arrive bient\xF4t.",
      "visit.title": "Venez visiter {name}",
      "visit.leadHostBuilding": "{host} vous fait faire le tour de l\u2019immeuble {building} et r\xE9pond \xE0 toutes vos questions.",
      "visit.leadHost": "{host} vous fait faire le tour de l\u2019espace et r\xE9pond \xE0 toutes vos questions.",
      "visit.lead": "L\u2019\xE9quipe sur place vous fait faire le tour et r\xE9pond \xE0 toutes vos questions.",
      "visit.noteHost": "{host}, l\u2019h\xF4te de {name}, vous rappelle avant demain midi.",
      "visit.note": "L\u2019\xE9quipe de l\u2019espace vous rappelle avant demain midi.",
      "visit.call": "Appeler l\u2019espace au {phone}",
      "map.origin": "Point de recherche : {place}",
      "map.attribution": "\xA9 OpenFreeMap \xA9 OpenMapTiles \xB7 \xA9 contributeurs OpenStreetMap",
      "map.noRooms": "Aucun espace avec salles ne correspond.",
      "search.nearMe": "Autour de moi",
      "search.tabShort.bureaux": "Bureaux",
      "search.tabShort.salles": "\xC9v\xE9nements",
      "formula.choose": "Votre situation",
      "search.nearMeHint": "Utiliser ma position",
      "search.locating": "Localisation\u2026",
      "search.geoError": "Position indisponible. Tapez une ville ou une adresse.",
      "search.spaces": "Nos espaces",
      "search.stations": "Gares et stations",
      "search.addresses": "Adresses et communes",
      "search.noResult": "Aucun r\xE9sultat. Essayez une ville, une adresse ou une station.",
      "search.outsideIdf": "hors \xCEle-de-France",
      "search.results": "{n} suggestions",
      "comparator.city": "Commune d\u2019implantation",
      "comparator.cities": "Communes propos\xE9es",
      "comparator.noCity": "Commune inconnue du comparateur. Essayez la commune voisine.",
      "blog.count": "{n} articles affich\xE9s",
      "blog.countOne": "1 article affich\xE9"
    },
    en: {
      "menu.open": "Menu",
      "menu.close": "Close",
      "nav.open": "Open menu",
      "nav.close": "Close menu",
      "slider.prev": "Previous item",
      "slider.next": "Next item",
      "slider.goto": "Go to item {{index}}",
      "slider.first": "First item",
      "slider.last": "Last item",
      "map.count": "{n} spaces",
      "map.countOne": "1 space",
      "map.hideList": "Hide the list",
      "map.showList": "Show the list",
      "map.seeList": "See the list",
      "map.showMap": "See the map",
      "map.nearest": "Closest to {place}",
      "map.nearestMe": "Closest to you",
      "map.others": "Other spaces \xB7 {dept}",
      "map.distance": "as the crow flies",
      "map.walk": "{station} \xB7 {min} min walk",
      "map.pin": "Work & Share space in {name}",
      "map.photo": "{name}, photo {n} of {total}",
      "map.photoGo": "Show photo {n}",
      "rooms.count": "{n} matching rooms",
      "rooms.countOne": "1 matching room",
      "rooms.closeRoom": "Close",
      "rooms.planConfig": "Room layout",
      "rooms.plan.reunion": "Meeting",
      "rooms.plan.theatre": "Theatre",
      "rooms.plan.en-u": "U-shape",
      "rooms.plan.cocktail": "Cocktail",
      "rooms.planSeats": "{n} people",
      "rooms.planAlt": "Room plan, {config} layout, {n} people",
      "map.building": "{name} building",
      "map.zoomIn": "Zoom in",
      "map.zoomOut": "Zoom out",
      "map.recenter": "Recenter on the space",
      "hero.pause": "Pause the video",
      "hero.play": "Play the video",
      "lightbox.label": "Photos of the space",
      "lightbox.close": "Close",
      "lightbox.prev": "Previous photo",
      "lightbox.next": "Next photo",
      "lightbox.thumbs": "All photos",
      "lightbox.goto": "Show photo {n}",
      "gallery.tour": "360\xB0 tour of the space",
      "gallery.tourSoon": "The 360\xB0 tour of this space is coming soon.",
      "visit.title": "Come and visit {name}",
      "visit.leadHostBuilding": "{host} will show you around the {building} building and answer all your questions.",
      "visit.leadHost": "{host} will show you around the space and answer all your questions.",
      "visit.lead": "The on-site team will show you around and answer all your questions.",
      "visit.noteHost": "{host}, your host in {name}, will call you back before noon tomorrow.",
      "visit.note": "The space team will call you back before noon tomorrow.",
      "visit.call": "Call the space on {phone}",
      "map.origin": "Search point: {place}",
      "map.attribution": "\xA9 OpenFreeMap \xA9 OpenMapTiles \xB7 \xA9 OpenStreetMap contributors",
      "map.noRooms": "No space with meeting rooms matches.",
      "search.nearMe": "Near me",
      "search.tabShort.bureaux": "Offices",
      "search.tabShort.salles": "Events",
      "formula.choose": "Your situation",
      "search.nearMeHint": "Use my location",
      "search.locating": "Locating\u2026",
      "search.geoError": "Location unavailable. Type a town or an address.",
      "search.spaces": "Our spaces",
      "search.stations": "Stations",
      "search.addresses": "Addresses and towns",
      "search.noResult": "No result. Try a town, an address or a station.",
      "search.outsideIdf": "outside \xCEle-de-France",
      "search.results": "{n} suggestions",
      "comparator.city": "Office location (town)",
      "comparator.cities": "Suggested towns",
      "comparator.noCity": "Town not covered by the comparator. Try a neighbouring one.",
      "blog.count": "{n} articles shown",
      "blog.countOne": "1 article shown"
    }
  };
  function getLang() {
    const path = location.pathname;
    const found = Object.keys(LOCALES).find((lang) => {
      const prefix = LOCALES[lang].prefix;
      return prefix && (path === prefix || path.startsWith(`${prefix}/`));
    });
    return found || DEFAULT_LANG;
  }
  function getLocale() {
    return LOCALES[getLang()];
  }
  function t(key2, vars = {}) {
    var _a, _b;
    const str = (_b = (_a = DICT[getLang()][key2]) != null ? _a : DICT[DEFAULT_LANG][key2]) != null ? _b : key2;
    return str.replace(/\{(\w+)\}/g, (_, name) => name in vars ? vars[name] : `{${name}}`);
  }

  // src/utils/scroll-indicator.js
  var GAP = 12;
  var MIN_THUMB = 32;
  function createScrollIndicator(zone, anchor = null) {
    if (!zone) return null;
    const sticky = !anchor;
    if (sticky) {
      anchor = document.createElement("div");
      anchor.className = "scroll-indicator_holder";
      anchor.setAttribute("aria-hidden", "true");
    }
    const track = document.createElement("div");
    track.className = "scroll-indicator";
    track.setAttribute("aria-hidden", "true");
    const thumb = document.createElement("div");
    thumb.className = "scroll-indicator_thumb";
    track.appendChild(thumb);
    anchor.appendChild(track);
    if (sticky) zone.prepend(anchor);
    zone.classList.add("has-scroll-indicator");
    if (sticky) track.classList.add("is-sticky");
    const attach = () => {
      if (sticky && anchor.parentElement !== zone) zone.prepend(anchor);
      else if (sticky && zone.firstElementChild !== anchor) zone.prepend(anchor);
      schedule();
    };
    let trackHeight = 0;
    let thumbHeight = 0;
    const update = () => {
      const max = zone.scrollHeight - zone.clientHeight;
      track.hidden = max <= 1;
      if (track.hidden) return;
      if (sticky) {
        const offset = track.getBoundingClientRect().top - zone.getBoundingClientRect().top - zone.clientTop;
        trackHeight = Math.max(zone.clientHeight - offset * 2, 0);
      } else {
        trackHeight = Math.max(zone.clientHeight - anchor.offsetHeight - GAP * 2, 0);
      }
      thumbHeight = Math.max(MIN_THUMB, trackHeight * zone.clientHeight / zone.scrollHeight);
      track.style.height = `${trackHeight}px`;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${(trackHeight - thumbHeight) * zone.scrollTop / max}px)`;
    };
    let frame = 0;
    function schedule() {
      if (!frame) frame = requestAnimationFrame(() => (frame = 0, update()));
    }
    let idle = null;
    zone.addEventListener(
      "scroll",
      () => {
        schedule();
        track.classList.add("is-active");
        clearTimeout(idle);
        idle = setTimeout(() => track.classList.remove("is-active"), 800);
      },
      { passive: true }
    );
    window.addEventListener("resize", schedule, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(schedule);
      observer.observe(zone);
      observer.observe(anchor);
      [...zone.children].forEach((child) => observer.observe(child));
    }
    thumb.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const startScroll = zone.scrollTop;
      const ratio = (zone.scrollHeight - zone.clientHeight) / Math.max(trackHeight - thumbHeight, 1);
      thumb.setPointerCapture(e.pointerId);
      track.classList.add("is-dragging");
      const move = (ev) => zone.scrollTop = startScroll + (ev.clientY - startY) * ratio;
      const up = () => {
        track.classList.remove("is-dragging");
        thumb.removeEventListener("pointermove", move);
        thumb.removeEventListener("pointerup", up);
        thumb.removeEventListener("pointercancel", up);
      };
      thumb.addEventListener("pointermove", move);
      thumb.addEventListener("pointerup", up);
      thumb.addEventListener("pointercancel", up);
    });
    track.addEventListener("pointerdown", (e) => {
      if (e.target !== track) return;
      const y = e.clientY - track.getBoundingClientRect().top - thumbHeight / 2;
      const max = zone.scrollHeight - zone.clientHeight;
      zone.scrollTo({ top: y / Math.max(trackHeight - thumbHeight, 1) * max, behavior: "smooth" });
    });
    update();
    return { update, attach };
  }

  // src/components/nav.js
  var DESKTOP_QUERY = window.matchMedia("(min-width: 992px)");
  var HOVER_QUERY = window.matchMedia("(hover: hover) and (pointer: fine)");
  var HOVER_CLOSE_DELAY = 250;
  var ICON_MENU = "M4 7h16M4 12h16M4 17h16";
  var ICON_CLOSE = "M6 6l12 12M18 6L6 18";
  function initNav(root = document) {
    const header = root.querySelector("[data-nav]");
    if (!header) return;
    initMegaPanels(header);
    initDrawer(header);
    initScrollState(header);
    initNavHeight(header);
    initNavPill(header);
    markCurrentLinks(header);
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const openTrigger = header.querySelector("[data-mega-trigger][aria-expanded='true'], [data-nav-toggle][aria-expanded='true']");
      closeAll(header);
      if (openTrigger) openTrigger.focus();
    });
    document.addEventListener("click", (e) => {
      if (!header.contains(e.target)) closeAll(header);
    });
    DESKTOP_QUERY.addEventListener("change", () => closeAll(header));
  }
  function getPanel(header, trigger) {
    const name = trigger.getAttribute("data-mega-trigger");
    return header.querySelector(`[data-mega-panel="${name}"]`);
  }
  function setPanel(trigger, panel, open2) {
    panel.classList.toggle("is-open", open2);
    trigger.setAttribute("aria-expanded", String(open2));
  }
  function initMegaPanels(header) {
    header.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
      const panel = getPanel(header, trigger);
      if (!panel) return;
      trigger.setAttribute("aria-expanded", "false");
      const toggle = () => setPanel(trigger, panel, !panel.classList.contains("is-open"));
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const isHoverMenu = !trigger.closest("[data-nav-panel]") && DESKTOP_QUERY.matches && HOVER_QUERY.matches;
        if (isHoverMenu) setPanel(trigger, panel, true);
        else toggle();
      });
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
      if (trigger.closest("[data-nav-panel]")) return;
      let closeTimer = null;
      const open2 = () => {
        if (!DESKTOP_QUERY.matches || !HOVER_QUERY.matches) return;
        clearTimeout(closeTimer);
        setPanel(trigger, panel, true);
      };
      const scheduleClose = () => {
        if (!DESKTOP_QUERY.matches || !HOVER_QUERY.matches) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => setPanel(trigger, panel, false), HOVER_CLOSE_DELAY);
      };
      trigger.addEventListener("mouseenter", open2);
      panel.addEventListener("mouseenter", open2);
      header.addEventListener("mouseleave", scheduleClose);
      trigger.parentElement.querySelectorAll("a").forEach((link) => {
        if (link !== trigger) link.addEventListener("mouseenter", scheduleClose);
      });
      header.addEventListener("focusout", (e) => {
        const next = e.relatedTarget;
        if (!next || !trigger.contains(next) && !panel.contains(next)) {
          if (panel.classList.contains("is-open") && !panel.matches(":hover")) setPanel(trigger, panel, false);
        }
      });
    });
  }
  function initDrawer(header) {
    const toggle = header.querySelector("[data-nav-toggle]");
    const drawer = header.querySelector("[data-nav-panel]");
    if (!toggle || !drawer) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("nav.open"));
    drawer.setAttribute("data-lenis-prevent", "");
    createScrollIndicator(drawer);
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      setDrawer(header, !drawer.classList.contains("is-open"));
    });
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setDrawer(header, !drawer.classList.contains("is-open"));
      }
    });
    header.addEventListener("keydown", (e) => {
      if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      const focusables = [toggle, ...drawer.querySelectorAll("a[href], [role='button'], button, input")].filter(
        (el) => el.offsetParent !== null
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    drawer.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link || link.matches("[data-mega-trigger]")) return;
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      setDrawer(header, false);
    });
  }
  function setDrawer(header, open2) {
    const toggle = header.querySelector("[data-nav-toggle]");
    const drawer = header.querySelector("[data-nav-panel]");
    if (!toggle || !drawer) return;
    drawer.classList.toggle("is-open", open2);
    toggle.setAttribute("aria-expanded", String(open2));
    toggle.setAttribute("aria-label", t(open2 ? "nav.close" : "nav.open"));
    const path = toggle.querySelector("svg path");
    if (path) path.setAttribute("d", open2 ? ICON_CLOSE : ICON_MENU);
    document.documentElement.classList.toggle("is-nav-open", open2);
    const lenis = getLenis();
    if (lenis) open2 ? lenis.stop() : lenis.start();
    if (!open2) {
      drawer.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
        const panel = getPanel(header, trigger);
        if (panel) setPanel(trigger, panel, false);
      });
    }
  }
  function closeAll(header) {
    header.querySelectorAll("[data-mega-trigger]").forEach((trigger) => {
      const panel = getPanel(header, trigger);
      if (panel) setPanel(trigger, panel, false);
    });
    if (header.querySelector("[data-nav-panel].is-open")) setDrawer(header, false);
  }
  var SCROLL_THRESHOLD = 8;
  var DIRECTION_DELTA = 6;
  function initScrollState(header) {
    let mode = "flow";
    let lastY = window.scrollY;
    let travel = 0;
    let ticking = false;
    const hero = document.querySelector("[data-hero-video], [data-hero]") || [...document.querySelectorAll("main section, .page-wrapper section")].find((s) => !header.contains(s));
    const isHero = () => !!hero && (hero.matches("[data-hero-video], [data-hero]") || hero.offsetHeight <= window.innerHeight * 1.2 && !hero.querySelector("form"));
    const inHero = (y) => isHero() && y < hero.getBoundingClientRect().bottom + y - header.offsetHeight;
    const locked = () => header.querySelector("[data-mega-panel].is-open, [data-nav-panel].is-open") || header.contains(document.activeElement) || document.documentElement.classList.contains("is-hero-intro-running");
    const apply = () => {
      const y = Math.max(window.scrollY, 0);
      const height = header.offsetHeight;
      header.classList.toggle("is-flow", mode === "flow");
      header.classList.toggle("is-hidden", mode === "hidden");
      header.classList.toggle("is-scrolled", mode !== "flow" && y > SCROLL_THRESHOLD);
      header.style.translate = mode === "flow" ? `0 ${-Math.min(y, height)}px` : "";
    };
    const update = () => {
      ticking = false;
      const y = Math.max(window.scrollY, 0);
      const dy = y - lastY;
      lastY = y;
      if (dy !== 0) travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (y <= 0) mode = "flow";
      else if (inHero(y) && !locked()) {
        mode = mode === "flow" || y < header.offsetHeight ? "flow" : "hidden";
      } else if (locked()) mode = mode === "flow" && y < header.offsetHeight ? "flow" : "shown";
      else if (travel < -DIRECTION_DELTA && mode !== "shown") mode = y > 0 ? "shown" : "flow";
      else if (travel > DIRECTION_DELTA && mode === "shown") mode = "hidden";
      apply();
    };
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    header.addEventListener("focusin", schedule);
    header.addEventListener("click", schedule);
    if (window.scrollY > header.offsetHeight) mode = "shown";
    apply();
  }
  function initNavPill(header) {
    const menu = header.querySelector(".navbar_menu");
    const links = menu ? [...menu.querySelectorAll(".navbar_link")] : [];
    if (!links.length) return;
    const pill = document.createElement("span");
    pill.className = "navbar_pill";
    pill.setAttribute("aria-hidden", "true");
    menu.prepend(pill);
    menu.classList.add("has-pill");
    let target = null;
    const place = (link) => {
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.height = `${link.offsetHeight}px`;
      pill.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
    };
    const show = (link) => {
      if (!link || !link.offsetWidth) return;
      if (!pill.classList.contains("is-visible")) {
        pill.classList.add("is-instant");
        place(link);
        pill.getBoundingClientRect();
        pill.classList.remove("is-instant");
        pill.classList.add("is-visible");
      } else {
        place(link);
      }
      links.forEach((l) => l.classList.toggle("is-pill", l === link));
      target = link;
    };
    const restingLink = () => links.find((l) => l.getAttribute("aria-expanded") === "true");
    const rest = () => {
      const link = restingLink();
      if (link) return show(link);
      pill.classList.remove("is-visible");
      links.forEach((l) => l.classList.remove("is-pill"));
      target = null;
    };
    links.forEach((link) => {
      link.addEventListener("pointerenter", () => show(link));
      link.addEventListener("focus", () => show(link));
    });
    menu.addEventListener("pointerleave", rest);
    menu.addEventListener("focusout", (e) => {
      if (!menu.contains(e.relatedTarget)) rest();
    });
    const observer = new MutationObserver(() => {
      if (!menu.matches(":hover")) rest();
    });
    links.forEach((l) => observer.observe(l, { attributes: true, attributeFilter: ["aria-expanded"] }));
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => target && place(target)).observe(menu);
    }
  }
  function initNavHeight(header) {
    const update = () => {
      document.documentElement.style.setProperty("--nav-height", `${header.offsetHeight}px`);
    };
    update();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(update).observe(header);
  }
  function normalizePath(path) {
    return path.replace(/\/+$/, "") || "/";
  }
  function markCurrentLinks(header) {
    const current = normalizePath(location.pathname);
    header.querySelectorAll("a[href]").forEach((link) => {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.hash) return;
      const path = normalizePath(url.pathname);
      if (path === "/") return;
      if (current === path || current.startsWith(`${path}/`)) {
        link.setAttribute("aria-current", current === path ? "page" : "true");
      }
    });
  }

  // src/components/footer.js
  function initFooter(root = document) {
    const year = String((/* @__PURE__ */ new Date()).getFullYear());
    root.querySelectorAll("[data-footer-year]").forEach((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (/\b(19|20)\d{2}\b/.test(node.nodeValue)) {
          node.nodeValue = node.nodeValue.replace(/\b(19|20)\d{2}\b/, year);
          break;
        }
      }
    });
  }

  // src/utils/tab-indicator.js
  function createTabIndicator(tablist, { getActive, themeAttr = null, className = "" } = {}) {
    const indicator = document.createElement("span");
    indicator.className = `tab-indicator ${className}`.trim();
    indicator.setAttribute("aria-hidden", "true");
    tablist.prepend(indicator);
    tablist.classList.add("is-sliding");
    let animatingUntil = 0;
    function move(animate2 = true) {
      const tab = getActive();
      if (animate2) animatingUntil = performance.now() + 450;
      if (!tab || !tab.offsetWidth) return;
      if (!animate2) indicator.classList.add("is-instant");
      indicator.style.width = `${tab.offsetWidth}px`;
      indicator.style.height = `${tab.offsetHeight}px`;
      indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
      if (themeAttr) indicator.setAttribute("data-theme", tab.getAttribute(themeAttr) || "");
      if (!animate2) {
        indicator.getBoundingClientRect();
        indicator.classList.remove("is-instant");
      }
    }
    const recalc = () => move(performance.now() < animatingUntil);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(recalc).observe(tablist);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => move(false));
    move(false);
    return { move, element: indicator };
  }
  function createSegmentedIndicator(group, getActive, { copyColor = true } = {}) {
    const active = getActive();
    const color = copyColor && active ? getComputedStyle(active).backgroundColor : "";
    group.classList.add("is-segmented");
    const indicator = createTabIndicator(group, { getActive, className: "segmented-indicator" });
    if (color && color !== "rgba(0, 0, 0, 0)") indicator.element.style.backgroundColor = color;
    return indicator;
  }

  // src/components/formula.js
  function initFormulas(root = document) {
    root.querySelectorAll("[data-formula]").forEach(initFormula);
  }
  function initFormula(formula) {
    const tabs = [...formula.querySelectorAll("[data-formula-tab]")];
    if (!tabs.length) return;
    const tablist = tabs[0].parentElement;
    const getPanel2 = (tab) => formula.querySelector(`[data-formula-panel="${tab.getAttribute("data-formula-tab")}"]`);
    let current = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
    function select(tab, { focus = false } = {}) {
      if (tab === current) return;
      current = tab;
      tabs.forEach((t2) => {
        const isActive = t2 === tab;
        t2.classList.toggle("is-active", isActive);
        t2.setAttribute("aria-selected", String(isActive));
        t2.setAttribute("tabindex", isActive ? "0" : "-1");
        const panel = getPanel2(t2);
        if (!panel) return;
        if (isActive) {
          panel.removeAttribute("hidden");
          panel.classList.add("is-entering");
          panel.addEventListener("animationend", () => panel.classList.remove("is-entering"), { once: true });
        } else {
          panel.setAttribute("hidden", "");
        }
      });
      indicator.move();
      if (list && list.value !== tab.getAttribute("data-formula-tab")) {
        list.value = tab.getAttribute("data-formula-tab");
        list.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (focus) tab.focus();
      const left = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
      tablist.scrollTo({ left, behavior: "smooth" });
      requestScrollRefresh();
    }
    tabs.forEach((tab) => {
      tab.removeAttribute("href");
      const isActive = tab === current;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      const panel = getPanel2(tab);
      if (panel) panel.toggleAttribute("hidden", !isActive);
    });
    const list = document.createElement("select");
    list.className = "form_input";
    list.setAttribute("data-enhance-select", "");
    list.setAttribute("aria-label", tablist.getAttribute("aria-label") || t("formula.choose"));
    tabs.forEach((tab) => list.add(new Option(tab.textContent.trim(), tab.getAttribute("data-formula-tab"))));
    list.value = current.getAttribute("data-formula-tab");
    list.addEventListener("change", () => {
      const tab = tabs.find((t2) => t2.getAttribute("data-formula-tab") === list.value);
      if (tab) select(tab);
    });
    const listWrap = document.createElement("div");
    listWrap.className = "formula_select";
    listWrap.appendChild(list);
    tablist.after(listWrap);
    const indicator = createTabIndicator(tablist, {
      getActive: () => current,
      themeAttr: "data-formula-theme",
      className: "formula_indicator"
    });
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        select(tab);
      });
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        else if (e.key === " " || e.key === "Enter") next = tab;
        if (!next) return;
        e.preventDefault();
        select(next, { focus: true });
      });
    });
  }

  // src/components/slider.js
  var EDGE_EXTRA = 24;
  var MOBILE = "(max-width: 767px)";
  function initSliders(root = document) {
    if (typeof window.Swiper === "undefined") return;
    root.querySelectorAll("[data-slider]").forEach((block) => {
      if (!readBool(block, "data-slider-mobile-only")) return initSlider(block);
      const mq = window.matchMedia(MOBILE);
      let destroy = null;
      const sync = () => {
        if (mq.matches && !destroy) destroy = initSlider(block, { mobileOnly: true });
        else if (!mq.matches && destroy) {
          destroy();
          destroy = null;
        }
      };
      sync();
      mq.addEventListener("change", sync);
    });
  }
  function readBool(el, name) {
    return el.getAttribute(name) === "true";
  }
  function readNumber(el, name, fallback) {
    const value = parseFloat(el.getAttribute(name));
    return Number.isFinite(value) ? value : fallback;
  }
  function initSlider(block, { mobileOnly = false } = {}) {
    const track = block.querySelector("[data-slider-track]");
    if (!track || track.closest("[data-slider]") !== block || track.swiper) return;
    const slides = [...track.children];
    if (!slides.length) return;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;
    const edgeGap = block.getAttribute("data-slider-gap") === "edge";
    const setEdge = () => block.style.setProperty("--slider-edge", `${Math.round(track.getBoundingClientRect().left) + EDGE_EXTRA}px`);
    if (edgeGap) {
      block.classList.add("is-slider-edge");
      setEdge();
    }
    const viewport = document.createElement("div");
    viewport.className = "swiper slider_viewport";
    track.parentNode.insertBefore(viewport, track);
    viewport.appendChild(track);
    track.classList.add("swiper-wrapper");
    slides.forEach((slide) => slide.classList.add("swiper-slide"));
    const prev = block.querySelector("[data-slider-prev]");
    const next = block.querySelector("[data-slider-next]");
    const dots = block.querySelector("[data-slider-dots]");
    const reduced = prefersReducedMotion();
    const autoplayDelay = readNumber(block, "data-slider-autoplay", 0);
    [prev, next].forEach((arrow) => {
      if (!arrow) return;
      arrow.addEventListener("click", (e) => e.preventDefault());
      if (arrow.tagName !== "A") return;
      arrow.removeAttribute("href");
      arrow.setAttribute("role", "button");
      if (!arrow.hasAttribute("tabindex")) arrow.setAttribute("tabindex", "0");
      arrow.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        arrow.click();
      });
    });
    const perView = readNumber(block, "data-slider-per-view", 0);
    const perViewTablet = readNumber(block, "data-slider-per-view-tablet", perView);
    const perViewMobile = readNumber(block, "data-slider-per-view-mobile", perViewTablet);
    const sizing = mobileOnly ? { slidesPerView: perViewMobile || "auto" } : perView ? {
      slidesPerView: perViewMobile,
      breakpoints: { 768: { slidesPerView: perViewTablet }, 992: { slidesPerView: perView } }
    } : { slidesPerView: "auto" };
    const swiper = new window.Swiper(viewport, {
      ...sizing,
      spaceBetween: gap,
      speed: reduced ? 0 : readNumber(block, "data-slider-speed", 600),
      loop: readBool(block, "data-slider-loop"),
      centeredSlides: readBool(block, "data-slider-center"),
      grabCursor: true,
      watchOverflow: true,
      // flèches désactivées si tout tient à l'écran
      autoplay: autoplayDelay && !reduced ? { delay: autoplayDelay, pauseOnMouseEnter: true, disableOnInteraction: false } : false,
      navigation: {
        prevEl: prev,
        nextEl: next,
        disabledClass: "is-disabled",
        // Tout tient à l'écran : classe à part (une classe commune avec disabledClass
        // serait retirée par Swiper juste après avoir été posée). Même style en CSS.
        lockClass: "is-locked"
      },
      pagination: dots ? {
        el: dots,
        clickable: true,
        bulletClass: "slider_dot",
        bulletActiveClass: "is-active"
      } : false,
      a11y: {
        prevSlideMessage: t("slider.prev"),
        nextSlideMessage: t("slider.next"),
        paginationBulletMessage: t("slider.goto"),
        firstSlideMessage: t("slider.first"),
        lastSlideMessage: t("slider.last")
      },
      keyboard: { enabled: true, onlyInViewport: true },
      on: {
        // Slider prêt ou redimensionné : la hauteur de page a pu bouger
        afterInit: () => requestScrollRefresh()
      }
    });
    if (edgeGap) {
      const updateOffside = () => {
        const perView2 = typeof swiper.params.slidesPerView === "number" ? swiper.params.slidesPerView : 1;
        const first = swiper.activeIndex;
        const last = first + Math.ceil(perView2) - 1;
        swiper.slides.forEach((slide, i) => {
          slide.classList.toggle("is-offside-prev", i < first);
          slide.classList.toggle("is-offside-next", i > last);
        });
      };
      block.style.setProperty("--slider-speed", `${swiper.params.speed}ms`);
      updateOffside();
      swiper.on("slideChange", updateOffside);
      swiper.on("breakpoint", updateOffside);
      swiper.on("resize", () => {
        setEdge();
        updateOffside();
      });
    }
    block.classList.add("is-slider-ready");
    return () => {
      swiper.destroy(true, true);
      viewport.before(track);
      viewport.remove();
      track.classList.remove("swiper-wrapper");
      slides.forEach((slide) => slide.classList.remove("swiper-slide", "is-offside-prev", "is-offside-next"));
      block.classList.remove("is-slider-ready", "is-slider-edge");
      block.style.removeProperty("--slider-edge");
      block.style.removeProperty("--slider-speed");
      requestScrollRefresh();
    };
  }

  // src/components/photo-slider.js
  var SWIPE = 40;
  function initPhotoSliders(root = document) {
    root.querySelectorAll("[data-photo-slider]").forEach(initPhotoSlider);
  }
  function initPhotoSlider(block) {
    const slides = [...block.querySelectorAll("[data-photo-slide]")];
    if (!slides.length) return;
    const prev = block.querySelector("[data-slider-prev]");
    const next = block.querySelector("[data-slider-next]");
    const dotsWrap = block.querySelector(".slider_dots, [data-slider-dots]");
    const model = dotsWrap == null ? void 0 : dotsWrap.querySelector("[aria-current='true'], .slider_dot");
    const activeClass = [...(model == null ? void 0 : model.classList) || []].find((c) => c !== "slider_dot" && /active/.test(c)) || "is-active";
    let index = 0;
    let dots = [];
    function place(slide, x, animate2) {
      slide.classList.toggle("is-instant", !animate2);
      slide.style.setProperty("--slide-x", `${x}%`);
    }
    function show(i, dir = Math.sign(i - index) || 1, first = false) {
      const old = index;
      index = (i + slides.length) % slides.length;
      slides.forEach((slide, k) => {
        const on = k === index;
        slide.classList.toggle("is-active", on);
        slide.setAttribute("aria-hidden", on ? "false" : "true");
        const n = slides.length;
        if (k === (index + 1) % n || k === (index - 1 + n) % n) slide.loading = "eager";
      });
      if (first) {
        slides.forEach((slide, k) => place(slide, k === index ? 0 : 100, false));
      } else if (old !== index) {
        const incoming = slides[index];
        place(incoming, dir * 100, false);
        void incoming.offsetWidth;
        place(incoming, 0, true);
        place(slides[old], -dir * 100, true);
      }
      dots.forEach((dot, k) => {
        dot.classList.toggle(activeClass, k === index);
        dot.setAttribute("aria-current", k === index ? "true" : "false");
      });
    }
    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      dots = slides.map((_, k) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "slider_dot";
        dot.setAttribute("aria-label", t("map.photoGo", { n: k + 1 }));
        dot.addEventListener("click", () => {
          show(k);
          restart();
        });
        dotsWrap.appendChild(dot);
        return dot;
      });
    }
    [
      [prev, -1],
      [next, 1]
    ].forEach(([arrow, step]) => {
      if (!arrow) return;
      if (arrow.tagName === "A") {
        arrow.removeAttribute("href");
        arrow.setAttribute("role", "button");
        if (!arrow.hasAttribute("tabindex")) arrow.setAttribute("tabindex", "0");
      }
      arrow.addEventListener("click", (e) => {
        e.preventDefault();
        show(index + step, step);
        restart();
      });
      arrow.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        arrow.click();
      });
    });
    const single = slides.length < 2;
    [prev, next, dotsWrap].forEach((el) => el && (el.hidden = single));
    let startX = null;
    block.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      startX = e.clientX;
    });
    block.addEventListener("pointerup", (e) => {
      if (startX == null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > SWIPE && !single) {
        show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        restart();
      }
    });
    block.addEventListener("pointercancel", () => startX = null);
    slides.forEach((slide) => slide.draggable = false);
    block.addEventListener("keydown", (e) => {
      if (single || e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      show(index + step, step);
      restart();
    });
    const delay = parseInt(block.getAttribute("data-photo-slider-autoplay"), 10) || 0;
    let timer2 = null;
    let paused = false;
    function restart() {
      clearInterval(timer2);
      if (!delay || single || paused || prefersReducedMotion()) return;
      timer2 = setInterval(() => show(index + 1, 1), delay);
    }
    const pause = (on) => () => {
      paused = on;
      restart();
    };
    block.addEventListener("mouseenter", pause(true));
    block.addEventListener("mouseleave", pause(false));
    block.addEventListener("focusin", pause(true));
    block.addEventListener("focusout", pause(false));
    block.classList.add("is-photo-ready");
    show(0, 1, true);
    restart();
  }

  // src/components/rooms-filter.js
  function initRoomsFilters(root = document) {
    root.querySelectorAll("[data-rooms]").forEach(initRoomsFilter);
  }
  function minOf(label) {
    if (/^moins|^less|^under/i.test(label)) return 0;
    const n = label.match(/\d+/);
    return n ? parseInt(n[0], 10) : 0;
  }
  var norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  function initRoomsFilter(section) {
    const options = [...section.querySelectorAll("[data-room-filter-option]")];
    const rooms = [...section.querySelectorAll("[data-room]")];
    if (!rooms.length) return;
    const more = section.querySelector("[data-room-more]");
    const limit = parseInt(more == null ? void 0 : more.getAttribute("data-room-more"), 10) || 4;
    let expanded = !more;
    let filter = "toutes";
    const status = document.createElement("p");
    status.className = "rooms-filter_status";
    status.setAttribute("role", "status");
    (section.querySelector("[data-room-filter]") || section).appendChild(status);
    const isAll = (value) => !value || norm(value) === "toutes" || norm(value) === "all";
    function matching(value) {
      if (isAll(value)) return rooms;
      const exact = rooms.filter((r) => norm(r.getAttribute("data-room-jauge")) === norm(value));
      if (exact.length) return exact;
      const min = minOf(value);
      return rooms.filter((r) => (parseInt(r.getAttribute("data-room-capacite"), 10) || 0) >= min);
    }
    function render(announce = true) {
      const matched = matching(filter);
      const visible = expanded ? matched : matched.slice(0, limit);
      rooms.forEach((room) => {
        const show = visible.includes(room);
        const wasHidden = room.hidden;
        room.hidden = !show;
        if (show && wasHidden && !prefersReducedMotion()) {
          room.classList.remove("is-room-in");
          void room.offsetWidth;
          room.classList.add("is-room-in");
        }
      });
      if (more) {
        const hasMore = matched.length > visible.length;
        more.parentElement.hidden = !hasMore;
        more.setAttribute("aria-expanded", String(!hasMore));
      }
      if (announce) {
        const n = visible.length;
        status.textContent = t(n === 1 ? "rooms.countOne" : "rooms.count", { n });
      }
      requestScrollRefresh();
    }
    let current = options.find((o) => o.getAttribute("aria-checked") === "true") || options[0];
    const indicator = current ? createSegmentedIndicator(current.parentElement, () => current) : null;
    const select = (option, focus = false) => {
      current = option;
      options.forEach((o) => {
        const on = o === option;
        o.classList.toggle("is-active", on);
        o.setAttribute("aria-checked", String(on));
        o.tabIndex = on ? 0 : -1;
      });
      if (focus) option.focus();
      indicator == null ? void 0 : indicator.move();
      filter = option.getAttribute("data-room-filter-option");
      render();
    };
    options.forEach((option, i) => {
      option.addEventListener("click", (e) => {
        e.preventDefault();
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
    options.forEach((o) => o.tabIndex = o === current ? 0 : -1);
    if (current) filter = current.getAttribute("data-room-filter-option");
    if (more) {
      if (more.tagName === "A") more.removeAttribute("href");
      if (!more.hasAttribute("tabindex")) more.tabIndex = 0;
      const showAll = () => {
        var _a;
        const before = rooms.filter((r) => !r.hidden);
        expanded = true;
        render();
        const first = rooms.find((r) => !r.hidden && !before.includes(r));
        (_a = first == null ? void 0 : first.querySelector("a, button")) == null ? void 0 : _a.focus({ preventScroll: true });
      };
      more.addEventListener("click", (e) => {
        e.preventDefault();
        showAll();
      });
      more.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        showAll();
      });
    }
    render(false);
  }

  // src/utils/iso.js
  var NS = "http://www.w3.org/2000/svg";
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  var rad = (d) => d * Math.PI / 180;
  var r2 = (n) => Math.round(n * 100) / 100;
  var poly = (pts) => "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
  var seg = (a, b) => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
  var open = (pts) => pts.length < 2 ? "" : "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L");
  var Cam = (azDeg, k, S) => ({ az: rad(azDeg), k, S, ox: 0, oy: 0 });
  function proj(C) {
    const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
    return (x, y, z) => {
      const X = x * c - y * s, Y = x * s + y * c;
      return [C.ox + C.S * X, C.oy + C.S * (Y * C.k - z * zf)];
    };
  }
  function bounds(C, pts) {
    const P = proj({ ...C, ox: 0, oy: 0 });
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (const p of pts) {
      const q = P(p[0], p[1], p[2]);
      a = Math.min(a, q[0]);
      b = Math.max(b, q[0]);
      c = Math.min(c, q[1]);
      d = Math.max(d, q[1]);
    }
    return { x0: a, x1: b, y0: c, y1: d };
  }
  function fit(C, pts, cx, cy) {
    const b = bounds(C, pts);
    C.ox = cx - (b.x0 + b.x1) / 2;
    C.oy = cy - (b.y0 + b.y1) / 2;
  }
  var facing = (C) => {
    const s = Math.sin(C.az), c = Math.cos(C.az);
    return (q) => q.nu * s + q.nv * c >= -1e-6;
  };
  function rrect(u0, v0, u1, v1, r, n = 4) {
    r = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
    const out = [];
    for (const [cu, cv, a0] of [
      [u1 - r, v1 - r, 0],
      [u0 + r, v1 - r, 90],
      [u0 + r, v0 + r, 180],
      [u1 - r, v0 + r, 270]
    ])
      for (let k = 0; k <= n; k++) {
        const a = rad(a0 + 90 * k / n), ca = Math.cos(a), sa = Math.sin(a);
        out.push({ u: cu + r * ca, v: cv + r * sa, nu: ca, nv: sa });
      }
    return out;
  }
  function disc(cx, cy, R, n = 20) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      out.push({ u: cx + R * ca, v: cy + R * sa, nu: ca, nv: sa });
    }
    return out;
  }
  function hull(input) {
    const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) {
      while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (up.length > 1 && x(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    lo.pop();
    up.pop();
    return lo.concat(up);
  }
  var ringAt = (P, ring, z) => ring.map((q) => P(q.u, q.v, z));
  function run(ring, keep) {
    const n = ring.length;
    let s = -1;
    for (let i = 0; i < n; i++)
      if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) {
        s = i;
        break;
      }
    if (s < 0) return keep(ring[0]) ? ring.slice() : [];
    const out = [];
    for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n]);
    return out;
  }
  function prism(P, front, ring, inner, z0, z1) {
    return {
      sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))),
      crease: inner ? open(ringAt(P, run(inner, front), z1)) : ""
    };
  }
  var rings = (x0, y0, x1, y1, r, b) => [rrect(x0, y0, x1, y1, r), rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b))];
  function extremes(P, ring) {
    const pr = ring.map((q) => P(q.u, q.v, 0));
    let a = 0, b = 0, c = 0;
    pr.forEach((p, k) => {
      if (p[0] < pr[a][0]) a = k;
      if (p[0] > pr[b][0]) b = k;
      if (p[1] > pr[c][1]) c = k;
    });
    return [ring[a], ring[b], ring[c]];
  }
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (u) => ((ax * u + bx) * u + cx) * u;
    const Y = (u) => ((ay * u + by) * u + cy) * u;
    const dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return (t2) => {
      if (t2 <= 0) return 0;
      if (t2 >= 1) return 1;
      let u = t2;
      for (let i = 0; i < 8; i++) {
        const e = X(u) - t2;
        if (Math.abs(e) < 1e-5) break;
        const d = dX(u);
        if (Math.abs(d) < 1e-6) break;
        u -= e / d;
      }
      return Y(clamp(u, 0, 1));
    };
  }
  var EASE_LIFT = bezier(0.32, 0.72, 0, 1);
  var tween = (v, dur = 700) => ({ from: v, to: v, t0: -1e9, dur, instant: false });
  var tval = (tw, now) => {
    if (tw.instant) return tw.to;
    const p = clamp((now - tw.t0) / tw.dur, 0, 1);
    return tw.from + (tw.to - tw.from) * EASE_LIFT(p);
  };
  var tset = (tw, to, now, delay, instant = false) => {
    if (tw.to === to && !instant) return;
    tw.from = tval(tw, now);
    tw.to = to;
    tw.t0 = now + delay;
    tw.instant = instant;
  };
  var tdone = (tw, now) => tw.instant || now >= tw.t0 + tw.dur;
  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  }
  function solid(parent) {
    const g = mk("g", {}, parent);
    return { g, sil: mk("path", { class: "sil" }, g), cr: mk("path", { class: "nf lo" }, g) };
  }
  var put = (el, s) => {
    el.sil.setAttribute("d", s.sil);
    el.cr.setAttribute("d", s.crease);
  };

  // src/components/room-plan.js
  var IN = 450;
  var STAGGER = 40;
  var WALL = 24;
  var WT = 1.2;
  var SEAT = 4.2;
  var BACKTOP = 9;
  var TABLE = 7.2;
  var BAR = 10.5;
  var HIGH = 10.4;
  var CH = 4.2;
  function reunion(n, RW, RD) {
    const L = [];
    const pitch = 6.4;
    const maxSide = Math.max(2, Math.floor((RW - 26) / pitch));
    const islands = clamp(Math.ceil(n / (2 * maxSide)), 1, Math.max(1, Math.floor(RD / 26)));
    let left = n;
    for (let k = 0; k < islands; k++) {
      const count = Math.ceil(left / (islands - k));
      left -= count;
      const side = Math.ceil(count / 2);
      const len = side * pitch + 3;
      const x0 = (RW - len) / 2 + 3;
      const cy = RD / islands * (k + 0.5);
      L.push(["table", x0, cy - 6, [len, 12]]);
      for (let i = 0; i < side; i++) {
        const x = x0 + 1.5 + i * pitch;
        L.push(["chair", x, cy - 11.5, "-y"]);
        if (i < count - side) L.push(["chair", x, cy + 7.5, "+y"]);
      }
    }
    return L;
  }
  function enU(n, RW, RD) {
    const L = [];
    const xa = 14, xb = RW - 18;
    const yt = 6, yb = RD - 12;
    L.push(["table", xa, yt, [xb - xa, 6]], ["table", xa, yb, [xb - xa, 6]], ["table", xb, yt, [6, yb + 6 - yt]]);
    const armLen = xb - xa - 4, endLen = yb - yt - 8;
    let end = clamp(Math.round(n * endLen / (2 * armLen + endLen)), 1, Math.max(1, Math.floor(endLen / 6)));
    if (n < 6) end = 0;
    const top = Math.ceil((n - end) / 2), bottom = n - end - top;
    const along = (count, from, len) => Array.from({ length: count }, (_, i) => from + (i + 0.5) * len / count - CH / 2);
    along(top, xa + 2, armLen).forEach((x) => L.push(["chair", x, yt - 4.6, "-y"]));
    along(bottom, xa + 2, armLen).forEach((x) => L.push(["chair", x, yb + 6.6, "+y"]));
    along(end, yt + 10, endLen).forEach((y) => L.push(["chair", xb + 7.4, y, "+x"]));
    return L;
  }
  function theatre(n, RW, RD) {
    const L = [];
    const cols = Math.max(1, Math.floor((RD - 10) / 6.6));
    const rows = Math.ceil(n / cols);
    const pitch = clamp((RW - 22) / Math.max(rows, 1), 6, 11);
    let left = n;
    for (let r = 0; r < rows; r++) {
      const inRow = Math.min(cols, left);
      left -= inRow;
      const y0 = (RD - inRow * 6.6) / 2 + 1.2;
      for (let c = 0; c < inRow; c++) L.push(["chair", 16 + r * pitch, y0 + c * 6.6, "+x"]);
    }
    return L;
  }
  var seeded = (seed) => () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  function cocktail(n, RW, RD) {
    const L = [];
    if (RW > 40) L.push(["bar", RW * 0.42, 3, [Math.min(26, RW * 0.33), 6]]);
    const count = clamp(Math.round(n / 4.5), 2, 60);
    const x0 = 14, x1 = RW - 8, y0 = 14, y1 = RD - 6;
    const W = x1 - x0, H = y1 - y0;
    const cols = Math.max(1, Math.round(Math.sqrt(count * W / H)));
    const rows = Math.ceil(count / cols);
    const rnd = seeded(n * 7 + Math.round(RW));
    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++)
      for (let c = 0; c < cols && placed < count; c++, placed++) {
        const jx = (rnd() - 0.5) * (W / cols) * 0.4, jy = (rnd() - 0.5) * (H / rows) * 0.4;
        const x = x0 + (c + 0.5) * W / cols + jx + (r % 2 ? W / cols / 4 : 0);
        L.push(["high", clamp(x, x0, x1), y0 + (r + 0.5) * H / rows + jy]);
      }
    return L;
  }
  var BUILDERS = { reunion, "en-u": enU, theatre, cocktail };
  function depthOrder(items) {
    const behind = (a, b) => a.b[2] <= b.b[0] || a.b[3] <= b.b[1];
    const key2 = (it) => (it.b[0] + it.b[2] + it.b[1] + it.b[3]) / 2;
    const n = items.length, ins = new Array(n).fill(0), out = items.map(() => []);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (i !== j && behind(items[i], items[j]) && !behind(items[j], items[i])) {
          out[i].push(j);
          ins[j]++;
        }
    const ready = items.map((_, i) => i).filter((i) => ins[i] === 0), res = [];
    while (ready.length) {
      ready.sort((a, b) => key2(items[a]) - key2(items[b]));
      const i = ready.shift();
      res.push(items[i]);
      for (const j of out[i]) if (--ins[j] === 0) ready.push(j);
    }
    items.splice(0, n, ...res);
  }
  function createRoomPlan(stage, { surface = 40, configs = [] } = {}) {
    const area = clamp(surface || 40, 12, 400) * 100;
    const RW = Math.sqrt(area * 1.6), RD = area / RW;
    const svg = mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
    const corners = [[-WT, -WT, WALL], [RW, -WT, WALL], [-WT, RD, WALL], [RW, RD, 0], [-WT, RD, 0], [RW, -WT, 0]];
    const C = Cam(45, 0.5, 1);
    const b0 = bounds(C, corners);
    C.S = Math.min(360 / (b0.x1 - b0.x0), 270 / (b0.y1 - b0.y0));
    fit(C, corners, 200, 165);
    const P = proj(C), front = facing(C);
    const g = mk("g", {}, svg);
    const box = (x0, y0, x1, y1, z0, z1, r = 0.6, bv = 0.3) => {
      const s = solid(g);
      const [ring, inner] = rings(x0, y0, x1, y1, r, bv);
      put(s, prism(P, front, ring, inner, z0, z1));
    };
    box(0, 0, RW, RD, -1.2, 0, 2.5, 1.2);
    box(-WT, -WT, RW, 0, 0, WALL, 0.4, 0.2);
    box(-WT, 0, 0, RD, 0, WALL, 0.4, 0.2);
    const onBack = (pts) => poly(pts.map(([x, z]) => P(x, 0, z)));
    const onLeft = (pts) => poly(pts.map(([y, z]) => P(0, y, z)));
    const windows = Math.max(1, Math.floor((RW - 12) / 23));
    const step = (RW - 12) / windows;
    for (let i = 0; i < windows; i++) {
      const x0 = 10 + i * step + (step - 16) / 2;
      mk("path", { d: onBack([[x0, 9], [x0 + 16, 9], [x0 + 16, 22], [x0, 22]]), class: "nf lo" }, g);
      mk("path", { d: seg(P(x0 + 8, 0, 9), P(x0 + 8, 0, 22)), class: "nf lo" }, g);
    }
    const sw = Math.min(10, RD * 0.2);
    const screen = mk("path", { d: onLeft([[RD / 2 - sw, 10], [RD / 2 + sw, 10], [RD / 2 + sw, 21], [RD / 2 - sw, 21]]), class: "nf hi" }, g);
    mk("path", { d: onLeft([[RD - 13, 0], [RD - 4, 0], [RD - 4, 21], [RD - 13, 21]]), class: "nf lo" }, g);
    const keys = configs.map((c) => c.key);
    const items = [];
    configs.forEach(({ key: key2, n }) => {
      var _a;
      (((_a = BUILDERS[key2]) == null ? void 0 : _a.call(BUILDERS, n, RW, RD)) || []).forEach(([kind, x, y, d]) => items.push({ key: key2, kind, x, y, d }));
    });
    const flat = (it) => it.kind === "table" || it.kind === "bar";
    const centre = (it) => flat(it) ? [it.x + it.d[0] / 2, it.y + it.d[1] / 2] : it.kind === "high" ? [it.x, it.y] : [it.x + CH / 2, it.y + CH / 2];
    const foot = (it) => flat(it) ? [it.x, it.y, it.x + it.d[0], it.y + it.d[1]] : it.kind === "high" ? [it.x - 3.5, it.y - 3.5, it.x + 3.5, it.y + 3.5] : [it.x, it.y, it.x + CH, it.y + CH];
    for (const it of items) it.b = foot(it);
    depthOrder(items);
    for (const it of items) {
      it.g = mk("g", {}, g);
      it.h = tween(0);
      it.parts = it.kind === "chair" || it.kind === "high" ? [solid(it.g), solid(it.g)] : [solid(it.g)];
      if (it.kind === "table" || it.kind === "high") {
        it.drop = mk("path", { class: "nf dash" }, it.g);
        it.g.insertBefore(it.drop, it.g.firstChild);
      }
    }
    function draw(it, h) {
      var _a;
      if (h < 0.03) {
        for (const s of it.parts) {
          s.sil.setAttribute("d", "");
          s.cr.setAttribute("d", "");
        }
        (_a = it.drop) == null ? void 0 : _a.setAttribute("d", "");
        return;
      }
      const { x, y } = it;
      if (it.kind === "chair") {
        const [seat, back] = it.parts;
        let [r, i] = rings(x, y, x + CH, y + CH, 0.8, 0.4);
        put(seat, prism(P, front, r, i, SEAT * h - 0.4, SEAT * h));
        const bx = {
          "+x": [x + CH - 0.5, y, x + CH, y + CH],
          "-x": [x, y, x + 0.5, y + CH],
          "+y": [x, y + CH - 0.5, x + CH, y + CH],
          "-y": [x, y, x + CH, y + 0.5]
        }[it.d];
        [r, i] = rings(bx[0], bx[1], bx[2], bx[3], 0.2, 0.1);
        put(back, prism(P, front, r, i, SEAT * h, BACKTOP * h));
      } else if (flat(it)) {
        const top = it.kind === "table" ? TABLE : BAR;
        const [r, i] = rings(x, y, x + it.d[0], y + it.d[1], 1, it.kind === "table" ? 1.2 : 0.8);
        put(it.parts[0], prism(P, front, r, i, it.kind === "table" ? (top - 0.5) * h : 0, top * h));
        if (it.drop) {
          const e = extremes(P, r).map((q) => [P(q.u, q.v, (top - 0.5) * h), P(q.u, q.v, 0)]);
          it.drop.setAttribute("d", e.map(([a, c]) => seg(a, c)).join(""));
        }
      } else {
        put(it.parts[0], prism(P, front, disc(x, y, 2.5), disc(x, y, 1.6), 0, 0.3 * h));
        put(it.parts[1], prism(P, front, disc(x, y, 3.5), disc(x, y, 2.4), (HIGH - 0.4) * h, HIGH * h));
        it.drop.setAttribute("d", seg(P(x, y, 0.3 * h), P(x, y, (HIGH - 0.4) * h)));
      }
    }
    let raf = 0;
    function frame() {
      const now = performance.now();
      let moving = false;
      for (const it of items) {
        draw(it, tval(it.h, now));
        if (!tdone(it.h, now)) moving = true;
      }
      raf = moving ? requestAnimationFrame(frame) : 0;
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    let current = null;
    function show(key2) {
      if (!keys.includes(key2) || key2 === current) return;
      const first = current === null;
      current = key2;
      const now = performance.now();
      const instant = first || prefersReducedMotion();
      const [wx, wy] = [RW / 2, RD / 2];
      for (const it of items) {
        const [cx, cy] = centre(it);
        const far = Math.hypot(cx - wx, cy - wy) / 10 * STAGGER;
        if (it.key === key2) tset(it.h, 1, now, IN + far, instant);
        else tset(it.h, 0, now, far / 2, instant);
      }
      screen.setAttribute("class", key2 === "cocktail" ? "nf lo" : "nf hi");
      for (const it of items) if (it.kind === "bar") it.parts[0].sil.classList.toggle("hi", key2 === "cocktail");
      if (instant) frame();
      else wake();
    }
    show(keys[0]);
    return { show, keys };
  }

  // src/components/room-details.js
  var uid = 0;
  function initRoomDetails(root = document) {
    root.querySelectorAll("[data-rooms]").forEach((section) => {
      const rooms = [...section.querySelectorAll("[data-room]")].filter(
        (room) => room.querySelector("[data-room-toggle]") && room.querySelector("[data-room-panel]")
      );
      if (!rooms.length) return;
      const controls = rooms.map((room) => initRoom(room, () => controls));
    });
  }
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
    let views = null;
    function open2() {
      getAll().forEach((c) => c !== api && c.close(false));
      isOpen = true;
      room.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      label.textContent = t("rooms.closeRoom");
      if (!views) views = initViews(room);
      views == null ? void 0 : views.refresh();
      if (!prefersReducedMotion()) {
        panel.classList.remove("is-panel-in");
        void panel.offsetWidth;
        panel.classList.add("is-panel-in");
      }
      requestScrollRefresh();
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
    asButton(toggle, () => isOpen ? close(false) : open2());
    const card = room.querySelector("[data-room-card]");
    card == null ? void 0 : card.addEventListener("click", (e) => {
      if (e.target.closest("[data-room-toggle]")) return;
      isOpen ? close(false) : open2();
    });
    room.querySelectorAll("[data-room-close]").forEach((btn) => asButton(btn, () => close()));
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    room.roomConfigs = readConfigs(panel);
    formatConfigurations(panel);
    addFeatureIcons(panel);
    const api = { close };
    return api;
  }
  var FEATURE_ICONS = [
    [/lumi[eè]re|fen[eê]tre|soleil|jour/i, "sun"],
    [/paperboard|tableau|whiteboard/i, "board"],
    [/[ée]cran|visio|t[ée]l[ée]|projecteur/i, "screen"],
    [/r[ée]gie|vid[ée]o|cam[ée]ra|captation/i, "video"],
    [/micro|sono|son\b|enceinte|audio/i, "mic"],
    [/divisible|modulable|cloison/i, "split"],
    [/bistrot|caf[ée]|restaura|bar\b|cocktail|traiteur/i, "coffee"],
    [/rooftop|terrasse|jardin/i, "terrace"],
    [/wi-?fi|internet|fibre/i, "wifi"],
    [/parking/i, "parking"],
    [/mobilier|fauteuil|canap|lounge/i, "sofa"],
    [/acc[eè]s|badge|24/i, "key"]
  ];
  function addFeatureIcons(panel) {
    panel.querySelectorAll("[data-room-equipements] li").forEach((li) => {
      if (li.querySelector(".room-feature_icon")) return;
      const text = li.textContent;
      const name = (FEATURE_ICONS.find(([re]) => re.test(text)) || [, "check"])[1];
      const puce = document.createElement("span");
      puce.className = "room-feature_icon";
      puce.setAttribute("aria-hidden", "true");
      const icon2 = document.createElement("span");
      icon2.className = `room-icon is-${name}`;
      puce.appendChild(icon2);
      li.prepend(puce);
    });
  }
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
  var PLAN_KEYS = ["reunion", "theatre", "en-u", "cocktail"];
  var isFilled = (img) => img && !img.classList.contains("w-dyn-bind-empty") && img.getAttribute("src");
  var plain = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  function configKey(label) {
    const l = plain(label);
    if (l.startsWith("reunion") || l.startsWith("meeting")) return "reunion";
    if (l.startsWith("theatre")) return "theatre";
    if (l === "u" || l.startsWith("en u") || l.startsWith("u-")) return "en-u";
    if (l.startsWith("cocktail")) return "cocktail";
    return null;
  }
  function readConfigs(panel) {
    const box = panel.querySelector("[data-room-configurations]");
    if (!box) return [];
    const found = {};
    box.querySelectorAll("li, p").forEach((item) => {
      const m = item.textContent.replace(/\s+/g, " ").trim().match(/^(\d+)\s*[·:–-]?\s*(.+)$/);
      const key2 = m && configKey(m[2]);
      if (key2 && !found[key2]) found[key2] = parseInt(m[1], 10);
    });
    return PLAN_KEYS.filter((k) => found[k]).map((k) => ({ key: k, n: found[k] }));
  }
  function readSurface(room) {
    var _a;
    const m = (((_a = room.querySelector(".venue-room_meta")) == null ? void 0 : _a.textContent) || "").match(/(\d+[.,]?\d*)\s*m/);
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
    if (!configs.length && !isFilled(mainPlan)) {
      tabs[0].parentElement.hidden = true;
      return null;
    }
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
      planImgs.forEach((img) => img.hidden = !(isPlan && !drawn && img === mainPlan));
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
    return {
      refresh: () => {
        indicator.move(false);
        picker == null ? void 0 : picker.refresh();
      }
    };
  }
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

  // src/animations/counter.js
  var DEFAULT_DURATION = 1800;
  var NUMBER_REGEX = /\d[\d\s  .,]*\d|\d/;
  var GAP2 = 0.35;
  var WINDOW = 0.06;
  var easeOutCubic = (t2) => 1 - Math.pow(1 - t2, 3);
  function parse(text) {
    const match = text.match(NUMBER_REGEX);
    if (!match) return null;
    const raw = match[0];
    const separator = (raw.match(/[\s  .,]/) || [""])[0];
    const value = parseInt(raw.replace(/\D/g, ""), 10);
    if (!Number.isFinite(value)) return null;
    return {
      value,
      separator,
      before: text.slice(0, match.index),
      after: text.slice(match.index + raw.length)
    };
  }
  function format(n, separator) {
    const digits = String(Math.round(n));
    if (!separator) return digits;
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }
  var finalText = (data) => data.before + format(data.value, data.separator) + data.after;
  function buildRoll(el, data) {
    const text = finalText(data);
    el.textContent = "";
    const probe = document.createElement("span");
    probe.className = "count-roll";
    [...text].forEach((char) => {
      const cell = document.createElement("span");
      cell.textContent = char;
      probe.appendChild(cell);
    });
    el.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    const widths = [...probe.children].map((cell) => cell.getBoundingClientRect().width);
    probe.remove();
    const sr = document.createElement("span");
    sr.className = "count-sr";
    sr.textContent = text;
    const roll = document.createElement("span");
    roll.className = "count-roll";
    roll.setAttribute("aria-hidden", "true");
    const gap = Math.round(height * GAP2);
    const win = Math.round(height * WINDOW);
    roll.style.setProperty("--count-line", `${height}px`);
    roll.style.setProperty("--count-gap", `${gap}px`);
    roll.style.setProperty("--count-win", `${win}px`);
    const digitsTotal = (text.match(/\d/g) || []).length;
    let digitIndex = 0;
    const columns = [];
    const numberStart = data.before.length;
    const numberEnd = text.length - data.after.length;
    [...text].forEach((char, i) => {
      const isDigit = /\d/.test(char) && i >= numberStart && i < numberEnd;
      if (!isDigit) {
        const cell = document.createElement("span");
        cell.className = "count-char";
        cell.textContent = char;
        roll.appendChild(cell);
        return;
      }
      const power = digitsTotal - 1 - digitIndex++;
      const col = document.createElement("span");
      col.className = "count-col";
      col.style.width = `${widths[i]}px`;
      const strip = document.createElement("span");
      strip.className = "count-strip";
      for (let d = 0; d <= 10; d++) {
        const cell = document.createElement("span");
        cell.textContent = d % 10;
        strip.appendChild(cell);
      }
      col.appendChild(strip);
      roll.appendChild(col);
      columns.push({ col, strip, power });
    });
    el.append(sr, roll);
    return { roll, columns, pitch: height + gap * 2, offset: win - gap };
  }
  function positions(columns, value) {
    const byPower = [...columns].sort((a, b) => a.power - b.power);
    const pos = /* @__PURE__ */ new Map();
    let lower = null;
    byPower.forEach((c) => {
      const unit = Math.pow(10, c.power);
      let p;
      if (c.power === 0) p = value;
      else {
        const lowerDigit = lower % 10;
        p = Math.floor(value / unit) + Math.max(lowerDigit - 9, 0);
      }
      pos.set(c, p);
      lower = p;
    });
    return pos;
  }
  function paint(state, value) {
    const { columns, pitch, offset } = state;
    const pos = positions(columns, value);
    columns.forEach((c) => {
      const unit = Math.pow(10, c.power);
      c.strip.style.transform = `translateY(${offset - pos.get(c) % 10 * pitch}px)`;
      c.col.style.opacity = c.power === 0 ? 1 : Math.min(Math.max(value / unit - 0.6, 0) * 2.5, 1);
    });
  }
  function reserve(el) {
    const data = el._count;
    if (!data || data.done) return;
    el.style.minWidth = el.style.maxWidth = el.style.minHeight = "";
    const roll = el.querySelector(".count-roll");
    const saved = [...el.childNodes];
    el.textContent = finalText(data);
    const rect = el.getBoundingClientRect();
    el.textContent = "";
    el.append(...saved);
    el.style.minWidth = el.style.maxWidth = `${rect.width}px`;
    el.style.minHeight = `${rect.height}px`;
    return roll;
  }
  function finish(el, data) {
    data.done = true;
    el.textContent = finalText(data);
    el.style.minWidth = el.style.maxWidth = el.style.minHeight = "";
    el.classList.remove("is-counting");
  }
  function animate(el, data, duration) {
    const state = el._roll;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      if (progress >= 1) return finish(el, data);
      paint(state, data.value * easeOutCubic(progress));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function initCounters(root = document) {
    var _a;
    const items = [...root.querySelectorAll("[data-count]")];
    if (!items.length || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const el = entry.target;
          el._count.started = true;
          animate(el, el._count, parseFloat(el.getAttribute("data-count-duration")) || DEFAULT_DURATION);
        });
      },
      { threshold: 0.4 }
    );
    const setup = (el) => {
      el._roll = buildRoll(el, el._count);
      paint(el._roll, 0);
      reserve(el);
    };
    items.forEach((el) => {
      const data = parse(el.textContent.trim());
      if (!data) return;
      el._count = data;
      if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
      el.classList.add("is-counting");
      setup(el);
      observer.observe(el);
    });
    const rebuild = () => items.forEach((el) => {
      if (!el._count || el._count.done || el._count.started) return;
      setup(el);
    });
    (_a = document.fonts) == null ? void 0 : _a.ready.then(rebuild);
    window.addEventListener("resize", rebuild, { passive: true });
  }

  // src/animations/reveal.js
  var DEFAULT_STAGGER = 140;
  var DEFAULT_DISTANCE = 32;
  function initReveal(root = document) {
    const groups = [...root.querySelectorAll("[data-reveal-stagger]")];
    if (!groups.length || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          reveal(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    groups.forEach((group) => {
      const stagger = parseFloat(group.getAttribute("data-reveal-stagger")) || DEFAULT_STAGGER;
      const distance = parseFloat(group.getAttribute("data-reveal-distance")) || DEFAULT_DISTANCE;
      group.style.setProperty("--reveal-distance", `${distance}px`);
      [...group.children].forEach((item, i) => {
        item.style.setProperty("--reveal-delay", `${i * stagger}ms`);
      });
      group.classList.add("is-reveal-pending");
      observer.observe(group);
    });
  }
  function reveal(group) {
    group.classList.add("is-revealed");
    group.classList.remove("is-reveal-pending");
    const items = group.children.length;
    const stagger = parseFloat(group.getAttribute("data-reveal-stagger")) || DEFAULT_STAGGER;
    setTimeout(() => group.classList.add("is-reveal-done"), items * stagger + 800);
  }

  // src/animations/cards-stack.js
  var ROTATIONS = [-7, 5, -3, 6, -5, 3];
  var OFFSETS = [
    [-10, 6],
    [8, -4],
    [-4, -8],
    [10, 4],
    [-8, -2],
    [4, 8]
  ];
  var DEFAULT_DELAY = 90;
  var DURATION = 900;
  function initCardsStack(root = document) {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    root.querySelectorAll("[data-cards-stack]").forEach(initGrid);
  }
  function initGrid(grid) {
    const cards = [...grid.children];
    if (cards.length < 2) return;
    if (grid.matches("[data-mobile-slider], [data-slider-track]") && window.matchMedia("(max-width: 767px)").matches) return;
    const sameRow = () => cards.every((card) => Math.abs(card.offsetTop - cards[0].offsetTop) < 4);
    const stack = () => {
      const stacked = grid.classList.contains("is-stacked");
      grid.classList.remove("is-stacked");
      const g = grid.getBoundingClientRect();
      const rects = cards.map((card) => card.getBoundingClientRect());
      const cx = g.left + g.width / 2;
      const cy = Math.min(...rects.map((r) => r.top + r.height / 2));
      cards.forEach((card, i) => {
        const r = rects[i];
        const [ox, oy] = OFFSETS[i % OFFSETS.length];
        card.style.setProperty("--stack-x", `${cx - (r.left + r.width / 2) + ox}px`);
        card.style.setProperty("--stack-y", `${cy - (r.top + r.height / 2) + oy}px`);
        card.style.setProperty("--stack-r", `${ROTATIONS[i % ROTATIONS.length]}deg`);
        card.style.zIndex = String(cards.length - i);
      });
      if (stacked) grid.classList.add("is-stacked");
    };
    if (!sameRow()) return;
    stack();
    grid.classList.add("is-stacked");
    const delay = parseFloat(grid.getAttribute("data-cards-stack-delay")) || DEFAULT_DELAY;
    const deal = () => {
      cards.forEach((card, i) => card.style.setProperty("--stack-delay", `${i * delay}ms`));
      grid.classList.add("is-dealing");
      grid.classList.remove("is-stacked");
      setTimeout(() => {
        grid.classList.remove("is-dealing");
        cards.forEach((card) => {
          ["--stack-x", "--stack-y", "--stack-r", "--stack-delay"].forEach((v) => card.style.removeProperty(v));
          card.style.zIndex = "";
        });
      }, DURATION + delay * cards.length + 50);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        window.removeEventListener("resize", onResize);
        deal();
      },
      { threshold: 0.35 }
    );
    observer.observe(grid);
    function onResize() {
      if (!grid.classList.contains("is-stacked")) return;
      if (sameRow()) stack();
      else {
        grid.classList.remove("is-stacked");
        observer.disconnect();
        window.removeEventListener("resize", onResize);
      }
    }
    window.addEventListener("resize", onResize, { passive: true });
  }

  // src/animations/stack-reveal.js
  var DESKTOP = "(min-width: 992px)";
  var PEEK = 16;
  var SHRINK = 0.08;
  var TILT = 2;
  var SHADOW_FROM = "0 32px 64px rgba(18, 20, 4, 0.22)";
  var SHADOW_TO = "0 0px 0px rgba(18, 20, 4, 0)";
  function initStackReveal(root = document) {
    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger || prefersReducedMotion()) return;
    gsap.registerPlugin(ScrollTrigger);
    root.querySelectorAll("[data-stack-reveal]").forEach((stack) => {
      const cards = [...stack.querySelectorAll("[data-stack-reveal-item]")];
      if (cards.length < 2) return;
      const mm = gsap.matchMedia();
      mm.add(DESKTOP, () => {
        cards.forEach((card, i) => {
          card.style.position = "relative";
          card.style.zIndex = String(cards.length - i);
        });
        const first = cards[0];
        const firstTop = () => first.getBoundingClientRect().top + window.scrollY;
        const naturalTop = (card) => firstTop() + card.offsetTop - first.offsetTop;
        cards.slice(1).forEach((card, k) => {
          const rank = k + 1;
          const front = cards[k];
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: first,
              // Démarre quand la première carte arrive au tiers haut de
              // l'écran ; la carte atteint sa place quand le bas de sa
              // position prévue arrive en bas de l'écran
              start: () => firstTop() - window.innerHeight * 0.3,
              end: () => naturalTop(card) + card.offsetHeight - window.innerHeight,
              scrub: true,
              invalidateOnRefresh: true
            }
          });
          tl.fromTo(
            card,
            {
              // Rangée sous la première carte, bord qui dépasse en bas
              y: () => first.offsetTop + first.offsetHeight - card.offsetTop - card.offsetHeight + rank * PEEK,
              scale: 1 - rank * SHRINK,
              rotation: rank % 2 ? -TILT : TILT,
              transformOrigin: "50% 100%"
            },
            { y: 0, scale: 1, rotation: 0, ease: "none" },
            0
          );
          tl.fromTo(front, { boxShadow: SHADOW_FROM }, { boxShadow: SHADOW_TO, ease: "none" }, 0);
        });
        requestScrollRefresh();
        return () => cards.forEach((card) => {
          card.style.position = "";
          card.style.zIndex = "";
          card.style.boxShadow = "";
        });
      });
    });
  }

  // src/animations/bento-reveal.js
  var DEFAULT_SELECTOR = ".event-card";
  var DEFAULT_SPREAD = 450;
  var DURATION2 = 800;
  function initBentoReveal(root = document) {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    root.querySelectorAll("[data-bento-reveal]").forEach(initBento);
  }
  function initBento(bento) {
    if (bento.matches("[data-slider-track]") && window.matchMedia("(max-width: 767px)").matches) return;
    const selector = bento.getAttribute("data-bento-reveal") || DEFAULT_SELECTOR;
    const tiles = selector === "self" ? [bento] : [...bento.querySelectorAll(selector)];
    if (!tiles.length) return;
    const spread = parseFloat(bento.getAttribute("data-bento-reveal-spread")) || DEFAULT_SPREAD;
    const box = bento.getBoundingClientRect();
    const lefts = tiles.map((tile) => tile.getBoundingClientRect().left - box.left);
    const far = Math.max(...lefts, 1);
    tiles.forEach((tile, i) => {
      tile.classList.add("bento-tile");
      tile.style.setProperty("--bento-delay", `${Math.round(lefts[i] / far * spread)}ms`);
    });
    bento.classList.add("is-bento-pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        bento.classList.add("is-bento-revealing");
        bento.classList.remove("is-bento-pending");
        setTimeout(() => {
          bento.classList.remove("is-bento-revealing");
          tiles.forEach((tile) => {
            tile.classList.remove("bento-tile");
            tile.style.removeProperty("--bento-delay");
          });
        }, DURATION2 + spread + 50);
      },
      { threshold: 0.3 }
    );
    observer.observe(bento);
  }

  // src/animations/stars.js
  var STEP = 90;
  var AFTER_CARD = 350;
  function initStars(root = document) {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const rows = [...root.querySelectorAll("[data-stars], .review-card_stars")];
    if (!rows.length) return;
    rows.forEach((row) => {
      const tile = row.closest(".bento-tile");
      const cardDelay = tile ? parseFloat(getComputedStyle(tile).getPropertyValue("--bento-delay")) || 0 : 0;
      const base = (tile ? AFTER_CARD : 0) + cardDelay;
      [...row.children].forEach((star, i) => star.style.setProperty("--star-delay", `${base + i * STEP}ms`));
      row.classList.add("is-stars-pending");
    });
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const row = entry.target;
        row.classList.add("is-stars-in");
        row.classList.remove("is-stars-pending");
      }),
      { threshold: 0.6 }
    );
    rows.forEach((row) => observer.observe(row));
  }

  // src/animations/widen.js
  var TARGET = 24;
  var DESKTOP2 = "(min-width: 992px)";
  function initWiden(root = document) {
    const blocks = [...root.querySelectorAll("[data-widen]")];
    if (!blocks.length || prefersReducedMotion()) return;
    const groups = /* @__PURE__ */ new Map();
    blocks.forEach((block) => {
      const name = block.getAttribute("data-widen") || "";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(block);
    });
    const desktop = window.matchMedia(DESKTOP2);
    const items = blocks.map((block) => {
      const pad = block.querySelector(".padding-global");
      const box = pad && pad.querySelector(".container-large");
      const card = box && box.firstElementChild;
      return pad ? { block, pad, box, card, pad0: 0, max0: 0, card0: 0, edge0: 0 } : null;
    }).filter(Boolean);
    const byBlock = new Map(items.map((item) => [item.block, item]));
    const clear = () => items.forEach(({ pad, box, card }) => {
      pad.style.paddingLeft = pad.style.paddingRight = "";
      if (box) box.style.maxWidth = "";
      if (card) card.style.paddingLeft = card.style.paddingRight = "";
    });
    const measure = () => {
      clear();
      items.forEach((item) => {
        item.pad0 = parseFloat(getComputedStyle(item.pad).paddingLeft) || 0;
        const max = item.box && parseFloat(getComputedStyle(item.box).maxWidth);
        item.max0 = Number.isFinite(max) ? max : 0;
        item.card0 = item.card ? parseFloat(getComputedStyle(item.card).paddingLeft) || 0 : 0;
        const width = item.pad.clientWidth;
        const inner = item.max0 ? Math.min(item.max0, width - item.pad0 * 2) : width - item.pad0 * 2;
        item.edge0 = (width - inner) / 2;
      });
    };
    const apply = (item, p) => {
      const edge = item.edge0 + (TARGET - item.edge0) * p;
      item.pad.style.paddingLeft = item.pad.style.paddingRight = `${edge}px`;
      if (item.box) item.box.style.maxWidth = "none";
      if (item.card) item.card.style.paddingLeft = item.card.style.paddingRight = `${item.card0 + item.edge0 - edge}px`;
    };
    const update = () => {
      if (!desktop.matches) return;
      const vh = window.innerHeight;
      const y = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - vh;
      const progress = [...groups.values()].map((members) => {
        const top = members[0].getBoundingClientRect().top + y;
        const start = top - vh / 2;
        const end = Math.max(Math.min(top, maxScroll), start + 1);
        return [members, Math.min(Math.max((y - start) / (end - start), 0), 1)];
      });
      progress.forEach(([members, p]) => members.forEach((block) => byBlock.has(block) && apply(byBlock.get(block), p)));
    };
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => (frame = 0, update()));
    };
    const reset = () => {
      measure();
      if (desktop.matches) update();
    };
    reset();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", reset, { passive: true });
    desktop.addEventListener("change", reset);
    window.addEventListener("load", reset);
  }

  // src/animations/expand.js
  var START = 1;
  var END = 0.15;
  var DEFAULT_RADIUS = 24;
  var MAX_WIDTH = 1280;
  var easeInOut = (t2) => t2 < 0.5 ? 2 * t2 * t2 : 1 - Math.pow(-2 * t2 + 2, 2) / 2;
  function initExpand(root = document) {
    const blocks = [...root.querySelectorAll("[data-expand]")];
    if (!blocks.length || prefersReducedMotion()) return;
    const sitePadding = () => {
      const ref = document.querySelector(".padding-global");
      return ref ? parseFloat(getComputedStyle(ref).paddingLeft) || 0 : 0;
    };
    let padding = sitePadding();
    let frame = 0;
    const update = () => {
      frame = 0;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const edge0 = Math.max(padding, (vw - MAX_WIDTH) / 2);
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const states = blocks.map((el) => {
        const top = el.getBoundingClientRect().top;
        const raw = mobile ? 1 : (vh * START - top) / (vh * (START - END));
        return [el, easeInOut(Math.min(Math.max(raw, 0), 1))];
      });
      states.forEach(([el, p]) => {
        const radius = parseFloat(el.getAttribute("data-expand-radius")) || DEFAULT_RADIUS;
        const width = el.offsetWidth || vw;
        const start = Math.min((width - edge0 * 2) / width, 1);
        const scale = start + (1 - start) * p;
        if (p >= 1) {
          el.style.transform = "";
          el.style.borderRadius = "";
        } else {
          el.style.transform = `scale(${scale})`;
          el.style.borderRadius = `${radius * (1 - p) / scale}px`;
        }
        el.classList.toggle("is-expanded", p >= 1);
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener(
      "resize",
      () => {
        padding = sitePadding();
        schedule();
      },
      { passive: true }
    );
    blocks.forEach((el) => {
      var _a;
      el.classList.add("has-expand");
      if ((_a = el.parentElement) == null ? void 0 : _a.classList.contains("expand-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "expand-wrap";
      const bg = el.getAttribute("data-expand-bg");
      if (bg) wrap.style.backgroundColor = bg;
      el.before(wrap);
      wrap.appendChild(el);
    });
    update();
  }

  // src/components/hero-video.js
  var ICON_PLAY = '<svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" aria-hidden="true"><path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor"/></svg>';
  function initHeroVideo(root = document) {
    const hero = root.querySelector("[data-hero-video]");
    const video = hero == null ? void 0 : hero.querySelector("video");
    if (!video) return;
    hero.classList.add("has-video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    const toggle = hero.querySelector("[data-hero-video-toggle]");
    const icon2 = toggle == null ? void 0 : toggle.querySelector("span");
    const pauseIcon = (icon2 == null ? void 0 : icon2.innerHTML) || "";
    const render = () => {
      if (!toggle) return;
      const paused = video.paused;
      toggle.setAttribute("aria-label", paused ? t("hero.play") : t("hero.pause"));
      toggle.setAttribute("aria-pressed", paused ? "true" : "false");
      if (icon2) icon2.innerHTML = paused ? ICON_PLAY : pauseIcon;
      hero.classList.toggle("is-video-paused", paused);
    };
    const play = () => {
      const p = video.play();
      if (p && p.catch) p.catch(() => render());
    };
    if (prefersReducedMotion()) video.pause();
    else if (video.paused) play();
    video.addEventListener("play", render);
    video.addEventListener("pause", render);
    if (toggle) {
      if (toggle.tagName === "A") {
        toggle.removeAttribute("href");
        toggle.setAttribute("role", "button");
        toggle.setAttribute("tabindex", "0");
      }
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        if (video.paused) play();
        else video.pause();
      });
      toggle.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        toggle.click();
      });
    }
    render();
  }

  // src/animations/hero-intro.js
  var DURATION3 = 1400;
  var DELAY = 150;
  var RADIUS = 32;
  var easeOutCubic2 = (t2) => 1 - (1 - t2) ** 3;
  var easeInOutQuart = (t2) => t2 < 0.5 ? 8 * t2 ** 4 : 1 - (-2 * t2 + 2) ** 4 / 2;
  function initHeroIntro(root = document) {
    const hero = root.querySelector("[data-hero-video]");
    const img = hero && (hero.querySelector(".hero-video_media > .w-background-video, .hero-video_media > video") || hero.querySelector("img"));
    const media = img && img.parentElement;
    img == null ? void 0 : img.setAttribute("data-hero-bg", "");
    if (!media) return;
    const frame = () => {
      const rect = media.getBoundingClientRect();
      hero.style.setProperty("--hero-vw", `${document.documentElement.clientWidth}px`);
      hero.style.setProperty("--hero-vh", `${window.innerHeight}px`);
      hero.style.setProperty("--hero-x", `${rect.left + window.scrollX}px`);
      hero.style.setProperty("--hero-y", `${rect.top + window.scrollY}px`);
    };
    frame();
    hero.classList.add("is-framed");
    window.addEventListener("resize", frame, { passive: true });
    const done = () => {
      hero.classList.remove("is-intro-pending", "is-intro-running");
      hero.classList.add("is-intro-done");
    };
    if (prefersReducedMotion() || window.scrollY > 40) {
      document.documentElement.classList.add("is-hero-intro-skipped");
      return done();
    }
    hero.classList.add("is-intro-running");
    hero.classList.remove("is-intro-pending");
    const nav = document.querySelector("[data-nav]");
    document.documentElement.classList.add("is-hero-intro-running");
    media.style.transformOrigin = "50% 50%";
    const contents = [...media.children].filter(
      (el) => el !== img && el.tagName !== "IMG" && (el.children.length || el.textContent.trim())
    );
    const CONTENT_START = 0.5;
    const CONTENT_RISE = 16;
    const measure = () => {
      media.style.transform = "none";
      img.style.transform = "none";
      contents.forEach((el) => el.style.transform = "none");
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const r = media.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      img.style.transformOrigin = `${r.left + r.width / 2 - ir.left}px ${r.top + r.height / 2 - ir.top}px`;
      contents.forEach((el) => {
        const er = el.getBoundingClientRect();
        el.style.transformOrigin = `${r.left + r.width / 2 - er.left}px ${r.top + r.height / 2 - er.top}px`;
      });
      return {
        sx0: vw / r.width,
        sy0: vh / r.height,
        tx0: vw / 2 - (r.left + r.width / 2),
        ty0: vh / 2 - (r.top + r.height / 2)
      };
    };
    const apply = (p) => {
      const { sx0, sy0, tx0, ty0 } = measure();
      const k = 1 - easeInOutQuart(p);
      const sx = 1 + (sx0 - 1) * k;
      const sy = 1 + (sy0 - 1) * k;
      const tx = tx0 * k;
      const ty = ty0 * k;
      media.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
      img.style.transform = `translate(${-tx / sx}px, ${-ty / sy}px) scale(${1 / sx}, ${1 / sy})`;
      const radius = RADIUS * (1 - k);
      media.style.borderRadius = `${radius / sx}px / ${radius / sy}px`;
      if (nav) nav.style.transform = `translateY(${-100 * k}%)`;
      const c = easeOutCubic2(Math.min(Math.max((p - CONTENT_START) / (1 - CONTENT_START), 0), 1));
      contents.forEach((el) => {
        el.style.opacity = String(c);
        el.style.transform = `translate(${-tx / sx}px, ${-ty / sy}px) scale(${1 / sx}, ${1 / sy}) translateY(${CONTENT_RISE * (1 - c)}px)`;
      });
    };
    apply(0);
    const start = performance.now() + DELAY;
    const tick = (now) => {
      const p = Math.min(Math.max((now - start) / DURATION3, 0), 1);
      apply(p);
      if (p < 1) {
        requestAnimationFrame(tick);
        return;
      }
      media.style.transform = "";
      media.style.borderRadius = "";
      img.style.transform = "";
      if (nav) nav.style.transform = "";
      contents.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.transformOrigin = "";
      });
      document.documentElement.classList.remove("is-hero-intro-running");
      document.documentElement.classList.add("is-hero-intro-done");
      done();
    };
    requestAnimationFrame(tick);
  }

  // src/utils/load-asset.js
  var cache = /* @__PURE__ */ new Map();
  function loadScript(src) {
    if (!cache.has(src)) {
      cache.set(
        src,
        new Promise((resolve, reject) => {
          const el = document.createElement("script");
          el.src = src;
          el.async = true;
          el.onload = resolve;
          el.onerror = () => reject(new Error(`\xC9chec du chargement : ${src}`));
          document.head.appendChild(el);
        })
      );
    }
    return cache.get(src);
  }
  function loadStyle(href) {
    if (!cache.has(href)) {
      cache.set(
        href,
        new Promise((resolve, reject) => {
          const el = document.createElement("link");
          el.rel = "stylesheet";
          el.href = href;
          el.onload = resolve;
          el.onerror = () => reject(new Error(`\xC9chec du chargement : ${href}`));
          document.head.appendChild(el);
        })
      );
    }
    return cache.get(href);
  }
  var currentSrc = document.currentScript && document.currentScript.src;
  var ASSET_BASE = currentSrc ? currentSrc.replace(/[^/]*$/, "") : "";

  // src/utils/map-base.js
  var MAPLIBRE_VERSION = "4.7.1";
  var MAPLIBRE_JS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
  var MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  var STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
  async function loadMapLibre() {
    await Promise.all([loadStyle(MAPLIBRE_CSS), loadScript(MAPLIBRE_JS)]);
    return window.maplibregl || null;
  }
  var THEME = {
    background: "#fbf3d5",
    // terre (beige)
    water: "#d6e2d3",
    park: "#ecebc4",
    building: "#f3e8c2",
    roadMajor: "#ffffff",
    roadMinor: "#fdf9ea",
    label: "#4a4d2c",
    labelHalo: "#fbf3d5"
  };
  var PIN_LOGO = "M57.124 0C57.5655 0 57.9237 0.355883 57.9238 0.794922C57.9238 1.20466 57.6074 1.54533 57.2002 1.60742C48.2446 2.97316 45.6529 13.2223 45.6221 17.6855C45.5878 22.2667 48.1198 25.5007 52.7588 25.7705C57.3967 26.0403 59.0722 22.2331 62.4941 13.1719C65.9135 4.10938 68.5442 1.8861 74.0381 1.21289C76.0902 0.961397 77.6286 1.12776 78.75 1.43555C79.6133 1.6725 79.2753 2.34755 78.3877 2.46582C73.4269 3.1268 73.3957 12.0463 70.1562 22.1992C66.3759 34.0557 53.7789 32.9104 49.1396 29.542C46.0903 27.3268 44.6476 23.7929 43.9648 20.9189C43.7348 19.9521 41.9479 19.7078 41.5781 20.6309L37.3301 31.2324C37.1931 31.5742 36.8602 31.7987 36.4902 31.7988H35.7139C35.3404 31.7988 35.0057 31.5702 34.8711 31.2236L26.4492 9.54102C26.1534 8.77981 25.0733 8.77294 24.7676 9.53027L16.0498 31.1348C15.9123 31.4756 15.5802 31.6992 15.2109 31.6992H14.707C14.329 31.699 13.9944 31.4728 13.8633 31.1201C12.7929 28.243 7.99807 15.3504 5.49316 8.52441C3.50982 3.11277 1.60634 1.7294 0.646484 1.38574C0.321876 1.26956 0 0.966166 0 0.623047C0.000155884 0.317057 0.250951 0.0697539 0.558594 0.0722656L15.0215 0.197266C15.319 0.200032 15.5586 0.441345 15.5586 0.737305C15.5585 1.02305 15.3308 1.25572 15.0469 1.2998C10.9822 1.92953 12.96 7.04102 12.96 7.04102L17.5625 19.6387C17.8478 20.4197 18.9578 20.4343 19.2637 19.6611C20.3338 16.9544 22.2407 12.1901 24.1768 7.64648C26.5679 2.02988 23.1607 1.25118 21.8359 1.1543C21.5717 1.13499 21.3477 0.921777 21.3477 0.658203C21.3479 0.40641 21.5535 0.202148 21.8066 0.202148H36.1865C36.5105 0.202148 36.7734 0.463893 36.7734 0.786133C36.7733 1.09905 36.5204 1.35204 36.209 1.39648C31.9025 2.00992 34.209 7.51172 34.209 7.51172L38.7607 19.583C39.0493 20.3481 40.1304 20.3677 40.4414 19.6113C41.7087 16.5302 44.0804 10.7502 45.6543 6.83789C47.3761 2.55973 45.1008 1.51508 43.9629 1.26074C43.6452 1.18976 43.385 0.92049 43.3848 0.59668C43.3848 0.267373 43.6532 0 43.9844 0H57.124Z";
  var PIN_SVG = `<svg viewBox="0 0 48 32" aria-hidden="true" class="map-pin_shape"><path class="map-pin_house" d="M22.6 1.5a3 3 0 0 1 2.8 0l18.9 9.2a3.5 3.5 0 0 1 2 3.1V27.5a3 3 0 0 1-3 3H4.7a3 3 0 0 1-3-3V13.8a3.5 3.5 0 0 1 2-3.1Z"/><path class="map-pin_logo" transform="translate(11 13.4) scale(0.328)" d="${PIN_LOGO}"/></svg>`;
  function applyTheme(map) {
    const style = map.getStyle();
    if (!style || !style.layers) return;
    style.layers.forEach((layer) => {
      const id = layer.id;
      const paint2 = (prop, value) => {
        try {
          map.setPaintProperty(id, prop, value);
        } catch (e) {
        }
      };
      if (layer.type === "background") paint2("background-color", THEME.background);
      else if (layer.type === "fill" && /water/.test(id)) paint2("fill-color", THEME.water);
      else if (layer.type === "fill" && /park|landcover|landuse|wood|grass/.test(id)) paint2("fill-color", THEME.park);
      else if (layer.type === "fill" && /building/.test(id)) paint2("fill-color", THEME.building);
      else if (layer.type === "line" && /water|river/.test(id)) paint2("line-color", THEME.water);
      else if (layer.type === "line" && /motorway|trunk|primary|major/.test(id)) paint2("line-color", THEME.roadMajor);
      else if (layer.type === "line" && /road|street|minor|secondary|tertiary|path/.test(id)) paint2("line-color", THEME.roadMinor);
      else if (layer.type === "symbol") {
        paint2("text-color", THEME.label);
        paint2("text-halo-color", THEME.labelHalo);
      }
    });
  }
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // src/utils/geo.js
  function distanceKm(a, b) {
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function formatDistance(km) {
    const tag = getLocale().tag;
    if (km < 1) return `${Math.round(km * 1e3 / 10) * 10} m`;
    return `${new Intl.NumberFormat(tag, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
  }
  function normalize(text = "") {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-'’]/g, " ").replace(/\s+/g, " ").trim();
  }
  function isInIdf(postcode = "") {
    return /^(75|77|78|91|92|93|94|95)/.test(postcode);
  }

  // src/utils/spaces-data.js
  var isTrue = (v) => v === "true" || v === "1";
  function spaceUrl(el, slug) {
    const href = el.getAttribute("href") || "";
    if (href.split(/[?#]/)[0].replace(/\/$/, "").endsWith(`/${slug}`)) return href;
    const prefix = (LOCALES[getLang()] || {}).prefix || "";
    const url = `${prefix}/espaces/${slug}`;
    if (el.tagName === "A") el.setAttribute("href", url);
    return url;
  }
  function hasOffer(el, name) {
    const attr = el.getAttribute(`data-${name}`);
    if (attr != null) return isTrue(attr);
    const flag = el.querySelector(`[data-offer="${name}"]`);
    return !!flag && !flag.classList.contains("w-condition-invisible");
  }
  function bestSrc(img) {
    const set = img.getAttribute("srcset");
    if (set) {
      const best = set.split(",").map((part) => part.trim().split(/\s+/)).map(([url, w]) => ({ url, w: parseFloat(w) || 0 })).sort((a, b) => b.w - a.w)[0];
      if (best && best.url) return best.url;
    }
    return img.getAttribute("src") || "";
  }
  function readPhotos(el, mainImg) {
    const item = el.closest(".w-dyn-item") || el.parentElement;
    const gallery = [...(item == null ? void 0 : item.querySelectorAll("[data-space-gallery] img")) || []].filter((img) => !img.closest(".w-condition-invisible, .w-dyn-empty")).map(bestSrc).filter((src) => src && !/placeholder/i.test(src));
    const main = mainImg ? bestSrc(mainImg) : "";
    return [...new Set([main, ...gallery].filter(Boolean))];
  }
  function readSpaces(root = document) {
    const bySlug = /* @__PURE__ */ new Map();
    root.querySelectorAll("[data-space][data-lat][data-lng]").forEach((el) => {
      const slug = el.getAttribute("data-space");
      const lat = parseFloat(el.getAttribute("data-lat"));
      const lng = parseFloat(el.getAttribute("data-lng"));
      if (!slug || !Number.isFinite(lat) || !Number.isFinite(lng) || bySlug.has(slug)) return;
      const img = el.querySelector("img:not([data-space-gallery] img)");
      bySlug.set(slug, {
        slug,
        lat,
        lng,
        el,
        name: el.getAttribute("data-name") || slug,
        city: el.getAttribute("data-city") || "",
        dept: el.getAttribute("data-dept") || "",
        building: el.getAttribute("data-building") || "",
        address: el.getAttribute("data-address") || "",
        postcode: el.getAttribute("data-postcode") || "",
        station: el.getAttribute("data-station") || "",
        coworking: hasOffer(el, "coworking"),
        offices: hasOffer(el, "offices"),
        rooms: hasOffer(el, "rooms"),
        url: spaceUrl(el, slug),
        photo: img ? bestSrc(img) : "",
        photos: readPhotos(el, img),
        photoAlt: img ? img.alt : ""
      });
    });
    return [...bySlug.values()];
  }

  // src/utils/stations.js
  var WALK_SPEED = 80;
  var DETOUR = 1.3;
  var MODE_ORDER = { M: 0, RER: 1, T: 2, TRAM: 3, BUS: 4, VAL: 5, CABLE: 6 };
  var promise = null;
  function loadStations() {
    if (!promise) {
      promise = fetch(`${ASSET_BASE}stations.json`).then((r) => r.ok ? r.json() : []).then(
        (rows) => rows.map(([name, lat, lng, lines]) => ({
          name,
          lat,
          lng,
          key: normalize(name),
          lines: lines ? lines.split("|").map((l) => l.split(":")).sort((a, b) => {
            var _a, _b;
            return ((_a = MODE_ORDER[a[0]]) != null ? _a : 9) - ((_b = MODE_ORDER[b[0]]) != null ? _b : 9) || a[1].localeCompare(b[1], "fr", { numeric: true });
          }) : []
        }))
      ).catch(() => []);
    }
    return promise;
  }
  function walkMinutes(km) {
    return Math.max(1, Math.ceil(km * 1e3 * DETOUR / WALK_SPEED));
  }
  function nearestStations(stations, point, { radiusKm = 1.2, max = 2, prefer = "" } = {}) {
    const withDist = stations.map((s) => ({ ...s, km: distanceKm(point, s) })).filter((s) => s.km <= radiusKm).sort((a, b) => a.km - b.km);
    const wanted = normalize(prefer);
    if (wanted) {
      const i = withDist.findIndex((s) => s.key === wanted || s.key.includes(wanted) || wanted.includes(s.key));
      if (i > 0) withDist.unshift(withDist.splice(i, 1)[0]);
    }
    return withDist.slice(0, max).map((s) => ({ ...s, walk: walkMinutes(s.km) }));
  }
  function renderLines(stations, { maxLines = 4 } = {}) {
    const lines = [];
    stations.forEach((s) => lines.push(...s.lines));
    return renderLineList(lines, { maxLines });
  }
  function sortLines(lines) {
    return [...lines].sort(
      (a, b) => {
        var _a, _b;
        return ((_a = MODE_ORDER[a[0]]) != null ? _a : 9) - ((_b = MODE_ORDER[b[0]]) != null ? _b : 9) || a[1].localeCompare(b[1], "fr", { numeric: true });
      }
    );
  }
  var MODE_LABEL = { M: "M\xE9tro", RER: "RER", T: "Train", TRAM: "Tramway", BUS: "Bus", VAL: "Navette", CABLE: "C\xE2ble" };
  function lineLabel([mode, line]) {
    return mode === "TRAM" ? `Tram T${line}` : `${MODE_LABEL[mode] || mode} ${line}`;
  }
  var MODE_CMS = { M: "M\xE9tro", RER: "RER", T: "Train", TRAM: "Tram", BUS: "Bus", VAL: "Navette", CABLE: "C\xE2ble" };
  function lineSlug([mode, line]) {
    const id = String(line).toLowerCase();
    return { M: `metro-${id}`, RER: `rer-${id}`, T: `train-${id}`, TRAM: `tram-t${id}`, BUS: `bus-${id}` }[mode] || `${mode.toLowerCase()}-${id}`;
  }
  function renderLineList(list, { maxLines = 4, sort = false } = {}) {
    const box = document.createElement("span");
    box.className = "transport-lines";
    box.setAttribute("data-space-lines", "");
    const seen = /* @__PURE__ */ new Set();
    const lines = [];
    (sort ? sortLines(list) : list).forEach(([mode, line]) => {
      const key2 = `${mode}-${line}`;
      if (!seen.has(key2)) {
        seen.add(key2);
        lines.push([mode, line]);
      }
    });
    lines.slice(0, maxLines).forEach(([mode, line]) => {
      const badge = document.createElement("span");
      badge.className = mode === "T" || mode === "RER" ? "transport-line is-square" : "transport-line";
      badge.setAttribute("data-line", lineSlug([mode, line]));
      badge.setAttribute("data-line-mode", MODE_CMS[mode] || mode);
      badge.title = lineLabel([mode, line]);
      badge.textContent = mode === "TRAM" ? `T${line}` : line;
      box.appendChild(badge);
    });
    box.setAttribute("aria-hidden", "true");
    return lines.length ? box : null;
  }

  // src/utils/scroll-zone.js
  var ATTR = "data-lenis-prevent";
  var GESTURE_GAP = 200;
  var STOPPED_VELOCITY = 1.5;
  var zones = [];
  var lastWheel = 0;
  var started = false;
  function initScrollZone(zone) {
    if (!zone) return;
    zone.setAttribute(ATTR, "");
    const lenis = getLenis();
    if (!lenis) return;
    const state = { zone, pointerMoved: true };
    zones.push(state);
    zone.addEventListener(
      "pointermove",
      (e) => {
        if (e.movementX || e.movementY) state.pointerMoved = true;
      },
      { passive: true }
    );
    if (started) return;
    started = true;
    window.addEventListener(
      "wheel",
      (e) => {
        const now = performance.now();
        const newGesture = now - lastWheel > GESTURE_GAP;
        lastWheel = now;
        if (!newGesture) return;
        const pageStopped = Math.abs(lenis.velocity || 0) < STOPPED_VELOCITY;
        zones.forEach((s) => {
          const owns = s.zone.contains(e.target) && (pageStopped || s.pointerMoved);
          if (owns) s.zone.setAttribute(ATTR, "");
          else s.zone.removeAttribute(ATTR);
        });
      },
      { passive: true, capture: true }
    );
    lenis.on("scroll", () => zones.forEach((s) => s.pointerMoved = false));
  }

  // src/components/place-carousel.js
  var SWIPE2 = 40;
  function createPlaceCarousel(card) {
    const img = card == null ? void 0 : card.querySelector("[data-place-photo]");
    if (!img) return { set() {
    } };
    const prev = card.querySelector("[data-place-prev]");
    const next = card.querySelector("[data-place-next]");
    const dots = card.querySelector("[data-place-dots]");
    const media = img.parentElement;
    let photos = [];
    let index = 0;
    let name = "";
    let token = 0;
    const label = () => t("map.photo", { name, n: index + 1, total: photos.length });
    function show(i, { instant = false } = {}) {
      if (!photos.length) return;
      index = (i + photos.length) % photos.length;
      const src = photos[index];
      const current = ++token;
      const apply = () => {
        if (current !== token) return;
        img.src = src;
        img.removeAttribute("srcset");
        img.alt = label();
        img.classList.remove("is-changing");
      };
      if (instant || prefersReducedMotion()) apply();
      else {
        img.classList.add("is-changing");
        const loader = new Image();
        loader.onload = loader.onerror = apply;
        loader.src = src;
      }
      dots == null ? void 0 : dots.querySelectorAll(".slider_dot").forEach((dot, k) => {
        dot.classList.toggle("is-active", k === index);
        dot.setAttribute("aria-current", k === index ? "true" : "false");
      });
      if (photos.length > 1) new Image().src = photos[(index + 1) % photos.length];
    }
    function renderDots() {
      if (!dots) return;
      dots.innerHTML = "";
      photos.forEach((_, k) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "slider_dot";
        dot.setAttribute("aria-label", t("map.photoGo", { n: k + 1 }));
        dot.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          show(k);
        });
        dots.appendChild(dot);
      });
    }
    const go = (step) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      show(index + step);
    };
    prev == null ? void 0 : prev.addEventListener("click", go(-1));
    next == null ? void 0 : next.addEventListener("click", go(1));
    let startX = null;
    media.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      startX = e.clientX;
    });
    media.addEventListener("pointerup", (e) => {
      if (startX == null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > SWIPE2 && photos.length > 1) show(index + (dx < 0 ? 1 : -1));
    });
    media.addEventListener("pointercancel", () => startX = null);
    img.draggable = false;
    card.addEventListener("keydown", (e) => {
      if (photos.length < 2 || e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.target.closest("input, textarea")) return;
      e.preventDefault();
      show(index + (e.key === "ArrowRight" ? 1 : -1));
    });
    return {
      // Nouvel espace : ses photos, en commençant par la première
      set(list, spaceName) {
        photos = list.filter(Boolean);
        name = spaceName || "";
        const several = photos.length > 1;
        [prev, next, dots].forEach((el) => el && (el.hidden = !several));
        renderDots();
        show(0, { instant: true });
      }
    };
  }

  // src/components/map-sheet.js
  var MOBILE2 = window.matchMedia("(max-width: 767px)");
  var EDGE = 24;
  var MAX_DOTS = 6;
  function createMapSheet(module, { select, isActive, resizeMap }) {
    const column = module.querySelector("[data-map-list]");
    const list = module.querySelector("[data-space-list]");
    const search2 = module.querySelector("[data-search]");
    const toggle = module.querySelector("[data-map-list-toggle]");
    if (!column || !list) return null;
    const head = column.querySelector(".map-module_head");
    const listWrap = list.closest(".w-dyn-list") || list;
    const searchHome = search2 ? { parent: search2.parentElement, next: search2.nextSibling } : null;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "map-sheet_handle";
    handle.setAttribute("aria-label", t("map.showList"));
    handle.setAttribute("aria-expanded", "false");
    handle.innerHTML = '<span class="map-sheet_grip" aria-hidden="true"></span>';
    const top = document.createElement("div");
    top.className = "map-sheet_top";
    const title = document.createElement("p");
    title.className = "map-module_group map-sheet_title";
    const dots = document.createElement("div");
    dots.className = "map-sheet_dots";
    dots.setAttribute("aria-hidden", "true");
    const back = document.createElement("button");
    back.type = "button";
    back.className = "button map-sheet_back";
    back.innerHTML = '<span class="button_label"></span>';
    back.firstChild.textContent = t("map.showMap");
    let enabled = false;
    let open2 = false;
    const items = () => [...list.querySelectorAll("[data-space]")].filter((a) => !a.closest("[hidden]"));
    function enable() {
      if (enabled) return;
      enabled = true;
      module.classList.add("is-sheet");
      column.prepend(handle);
      module.appendChild(top);
      module.appendChild(back);
      listWrap.before(title);
      listWrap.after(dots);
      placeSearch();
      setToggleLabel();
      refresh();
      resizeMap();
    }
    function disable() {
      if (!enabled) return;
      enabled = false;
      setOpen(false, { instant: true });
      module.classList.remove("is-sheet", "is-sheet-open");
      [handle, top, back, title, dots].forEach((el) => el.remove());
      if (search2 && searchHome) searchHome.parent.insertBefore(search2, searchHome.next);
      column.style.removeProperty("--sheet-peek");
      if (toggle) {
        const label = toggle.querySelectorAll("span");
        if (label.length) label[label.length - 1].textContent = t("map.hideList");
      }
      resizeMap();
    }
    function placeSearch() {
      if (!search2 || !searchHome) return;
      if (open2) searchHome.parent.insertBefore(search2, searchHome.next);
      else top.appendChild(search2);
    }
    function setToggleLabel() {
      if (!toggle) return;
      const label = toggle.querySelectorAll("span");
      if (label.length) label[label.length - 1].textContent = t("map.seeList");
    }
    function measure() {
      if (!enabled || open2) return;
      const peek = Math.ceil(dots.offsetTop + dots.offsetHeight + 16);
      column.style.setProperty("--sheet-peek", `${peek}px`);
    }
    function setOpen(value, { instant = false } = {}) {
      if (value === open2) return;
      open2 = value;
      module.classList.toggle("is-sheet-open", open2);
      handle.setAttribute("aria-expanded", String(open2));
      handle.setAttribute("aria-label", open2 ? t("map.showMap") : t("map.showList"));
      placeSearch();
      if (open2) {
        column.scrollTop = 0;
        const lenis = getLenis();
        const y = module.getBoundingClientRect().top + window.scrollY;
        if (lenis) lenis.scrollTo(y, { duration: instant || prefersReducedMotion() ? 0 : 0.6, force: true });
        else window.scrollTo({ top: y, behavior: instant || prefersReducedMotion() ? "auto" : "smooth" });
      } else {
        requestAnimationFrame(() => {
          measure();
          reveal2();
        });
      }
    }
    function renderDots() {
      const n = Math.min(items().length, MAX_DOTS);
      dots.innerHTML = "";
      for (let i = 0; i < n; i++) dots.appendChild(document.createElement("span"));
      updateDots();
    }
    function updateDots() {
      const spans = [...dots.children];
      if (!spans.length) return;
      const max = list.scrollWidth - list.clientWidth;
      const progress = max > 0 ? list.scrollLeft / max : 0;
      const active = Math.round(progress * (spans.length - 1));
      spans.forEach((s, i) => s.classList.toggle("is-active", i === active));
    }
    function snapped() {
      const left = list.getBoundingClientRect().left + EDGE;
      let best = null;
      let dist = Infinity;
      items().forEach((a) => {
        const d = Math.abs(a.getBoundingClientRect().left - left);
        if (d < dist) {
          dist = d;
          best = a;
        }
      });
      return best;
    }
    let scrollTimer = 0;
    let programmatic = false;
    list.addEventListener(
      "scroll",
      () => {
        if (!enabled || open2) return;
        updateDots();
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          if (programmatic) {
            programmatic = false;
            return;
          }
          const a = snapped();
          const slug = a == null ? void 0 : a.getAttribute("data-space");
          if (slug && !isActive(slug)) select(slug, { fromSheet: true });
        }, 140);
      },
      { passive: true }
    );
    function reveal2(el = list.querySelector("[data-space].is-active")) {
      if (!enabled || open2 || !el) return;
      const delta = el.getBoundingClientRect().left - list.getBoundingClientRect().left - EDGE;
      if (Math.abs(delta) < 2) return;
      programmatic = true;
      list.scrollBy({ left: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
    function refresh(firstGroupTitle = ((_a) => (_a = list.querySelector("[data-map-group]")) == null ? void 0 : _a.textContent)() || "", hasOrigin = false) {
      if (!enabled) return;
      title.textContent = hasOrigin ? firstGroupTitle : "";
      title.hidden = !hasOrigin;
      list.scrollLeft = 0;
      renderDots();
      requestAnimationFrame(measure);
    }
    function onItemClick(slug) {
      if (!enabled) return false;
      if (isActive(slug) && !open2) return false;
      if (open2) setOpen(false);
      select(slug, { fromSheet: true });
      return true;
    }
    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
      if (!enabled) return;
      const range = column.offsetHeight - (parseFloat(getComputedStyle(column).getPropertyValue("--sheet-peek")) || 280);
      drag = { y: e.clientY, t: performance.now(), start: open2 ? 0 : range, range, moved: false, last: open2 ? 0 : range };
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dy) < 6) return;
      drag.moved = true;
      module.classList.add("is-sheet-dragging");
      drag.last = Math.min(Math.max(drag.start + dy, 0), drag.range);
      column.style.transform = `translateY(${drag.last}px)`;
    });
    const endDrag = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      module.classList.remove("is-sheet-dragging");
      column.style.transform = "";
      if (!d.moved) return setOpen(!open2);
      const speed = (e.clientY - d.y) / Math.max(performance.now() - d.t, 1);
      if (speed < -0.4) setOpen(true);
      else if (speed > 0.4) setOpen(false);
      else setOpen(d.last < d.range / 2);
    };
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    back.addEventListener("click", () => setOpen(false));
    module.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open2) setOpen(false);
    });
    function onToggle() {
      if (!enabled) return false;
      setOpen(!open2);
      return true;
    }
    window.addEventListener("resize", () => enabled && measure(), { passive: true });
    const sync = () => MOBILE2.matches ? enable() : disable();
    MOBILE2.addEventListener("change", sync);
    sync();
    return {
      get active() {
        return enabled;
      },
      get open() {
        return open2;
      },
      refresh,
      reveal: reveal2,
      onItemClick,
      onToggle
    };
  }

  // src/components/spaces-map.js
  var PIN_STAGGER = 70;
  var DESKTOP3 = window.matchMedia("(min-width: 992px)");
  var NEAREST_COUNT = 3;
  var LIST_MARGIN = 16;
  function initSpacesMap(root = document) {
    root.querySelectorAll("[data-map-module]").forEach(initModule);
  }
  var CONTROLS = "[data-map-list-toggle], [data-place-close], [data-place-prev], [data-place-next], [data-map-zoom-in], [data-map-zoom-out], [data-map-reset]";
  function asButton2(el) {
    if (el.tagName !== "A") return;
    el.setAttribute("role", "button");
    el.addEventListener("keydown", (e) => {
      if (e.key !== " ") return;
      e.preventDefault();
      el.click();
    });
  }
  function initModule(module) {
    var _a;
    module.querySelectorAll(CONTROLS).forEach(asButton2);
    const column = module.querySelector("[data-map-list]");
    initScrollZone(column);
    if (column) initStickyHead(column);
    const list = module.querySelector("[data-space-list]");
    const mapEl = module.querySelector("[data-map]");
    const spaces = readSpaces(module);
    if (!spaces.length) return;
    const startType = module.getAttribute("data-map-tab") === "salles" ? "salles" : "bureaux";
    const state = { origin: null, active: null, type: startType, map: null, markers: /* @__PURE__ */ new Map(), originMarker: null };
    const card = module.querySelector("[data-place-card]");
    let sheet = null;
    const carousel = createPlaceCarousel(card);
    function visibleSpaces() {
      return state.type === "salles" ? spaces.filter((s) => s.rooms) : spaces;
    }
    function renderList() {
      var _a2;
      if (!list) return;
      const shown = visibleSpaces();
      spaces.forEach((s) => {
        var _a3;
        s.distance = state.origin ? distanceKm(state.origin, s) : null;
        const time = s.el.querySelector("[data-space-time]");
        const label = s.el.querySelector("[data-space-time-label]");
        if (time) time.textContent = s.distance != null ? formatDistance(s.distance) : "";
        if (label) label.textContent = s.distance != null ? t("map.distance") : "";
        (_a3 = s.el.closest("[role='listitem'], .w-dyn-item")) == null ? void 0 : _a3.toggleAttribute("hidden", !shown.includes(s));
      });
      const ordered = state.origin ? [...shown].sort((a, b) => a.distance - b.distance) : shown;
      list.querySelectorAll("[data-map-group]").forEach((g) => g.remove());
      const groups = [];
      let rest = ordered;
      if (state.origin) {
        const place = state.origin.label;
        const of = /^[aeiouyhàâäéèêëîïôöûü]/i.test(place) ? `d\u2019${place}` : `de ${place}`;
        const title = state.origin.isUser ? t("map.nearestMe") : t("map.nearest", { place, of });
        groups.push({ title, items: ordered.slice(0, NEAREST_COUNT) });
        rest = ordered.slice(NEAREST_COUNT);
      }
      const byDept = /* @__PURE__ */ new Map();
      rest.forEach((s) => {
        const key2 = s.dept || "";
        if (!byDept.has(key2)) byDept.set(key2, []);
        byDept.get(key2).push(s);
      });
      byDept.forEach((items, dept) => {
        groups.push({ title: state.origin && dept ? t("map.others", { dept }) : dept, items });
      });
      groups.forEach(({ title, items }) => {
        if (title) {
          const h = document.createElement("p");
          h.className = "map-module_group";
          h.setAttribute("data-map-group", "");
          h.textContent = title;
          list.appendChild(h);
        }
        items.forEach((s) => list.appendChild(s.el.closest(".w-dyn-item") || s.el));
      });
      sheet == null ? void 0 : sheet.refresh(((_a2 = groups[0]) == null ? void 0 : _a2.title) || "", Boolean(state.origin));
      const count = module.querySelector("[data-map-count]");
      if (count) count.textContent = shown.length === 1 ? t("map.countOne") : t("map.count", { n: shown.length });
      state.markers.forEach((marker, slug) => {
        marker.getElement().hidden = !shown.some((s) => s.slug === slug);
      });
    }
    function accessText(space) {
      const first = space.access && space.access[0];
      return first ? t("map.walk", { station: first.name, min: first.walk }) : space.station;
    }
    function paintAccess(container, textEl, space) {
      if (!container) return;
      container.querySelectorAll("[data-space-lines]").forEach((el) => el.remove());
      const lines = space.access ? renderLines(space.access) : null;
      if (lines) container.insertBefore(lines, textEl || container.firstChild);
      if (textEl) textEl.textContent = accessText(space);
    }
    function accessParts(root) {
      const box = root.querySelector("[data-space-access]") || root.querySelector(".space-item_access");
      const text = box && (box.querySelector("[data-space-station]") || box.lastElementChild);
      return { box, text };
    }
    loadStations().then((stations) => {
      if (!stations.length) return;
      spaces.forEach((s) => {
        s.access = nearestStations(stations, s, { prefer: s.station });
        const { box, text } = accessParts(s.el);
        paintAccess(box, text, s);
      });
      if (state.active) fillCard(state.active);
    });
    function select(slug, { fly = true } = {}) {
      const space = spaces.find((s) => s.slug === slug);
      state.active = space || null;
      spaces.forEach((s) => s.el.classList.toggle("is-active", s === space));
      state.markers.forEach((m, key2) => m.getElement().classList.toggle("is-active", key2 === slug));
      if (!space) return closeCard();
      fillCard(space);
      if (fly && state.map) {
        const opts = { center: [space.lng, space.lat], zoom: Math.max(state.map.getZoom(), 12.5) };
        prefersReducedMotion() ? state.map.jumpTo(opts) : state.map.easeTo({ ...opts, duration: 700 });
      }
      if ((sheet == null ? void 0 : sheet.active) && !sheet.open) return sheet.reveal(space.el);
      const scroller = module.querySelector("[data-map-list]");
      if (scroller && scroller.scrollHeight > scroller.clientHeight) {
        const head = scroller.querySelector(".map-module_head");
        const box = scroller.getBoundingClientRect();
        const item = space.el.getBoundingClientRect();
        const visibleTop = box.top + (head ? head.offsetHeight : 0) + LIST_MARGIN;
        const visibleBottom = box.bottom - LIST_MARGIN;
        let delta = 0;
        if (item.top < visibleTop) delta = item.top - visibleTop;
        else if (item.bottom > visibleBottom) delta = Math.min(item.top - visibleTop, item.bottom - visibleBottom);
        if (delta) scroller.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
    }
    function fillCard(space) {
      if (!card) return;
      const set = (sel, fn) => card.querySelectorAll(sel).forEach(fn);
      carousel.set(space.photos.length ? space.photos : [space.photo], space.name);
      set("[data-place-name]", (el) => el.textContent = space.name);
      set("[data-place-building]", (el) => {
        el.textContent = space.building ? t("map.building", { name: space.building }) : "";
        el.hidden = !space.building;
      });
      set("[data-place-address]", (el) => {
        el.textContent = [space.address, [space.postcode, space.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      });
      set("[data-place-station]", (el) => {
        paintAccess(el.parentElement, el, space);
        el.hidden = !el.textContent;
      });
      set("[data-place-link]", (a) => a.setAttribute("href", space.url));
      set("[data-place-visit]", (a) => a.setAttribute("href", `/nous-contacter/?motif=visite&espace=${space.slug}`));
      card.setAttribute("aria-label", space.name);
      card.classList.add("is-open");
    }
    function closeCard() {
      card == null ? void 0 : card.classList.remove("is-open");
    }
    (_a = card == null ? void 0 : card.querySelector("[data-place-close]")) == null ? void 0 : _a.addEventListener("click", (e) => {
      e.preventDefault();
      select(null);
    });
    spaces.forEach((s) => {
      s.el.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (sheet == null ? void 0 : sheet.active) {
          if (sheet.onItemClick(s.slug)) e.preventDefault();
          return;
        }
        if (!DESKTOP3.matches) return;
        e.preventDefault();
        if (state.active === s) {
          select(null);
          resetView();
        } else {
          select(s.slug);
        }
      });
      s.el.addEventListener("mouseenter", () => {
        var _a2;
        return (_a2 = state.markers.get(s.slug)) == null ? void 0 : _a2.getElement().classList.add("is-hover");
      });
      s.el.addEventListener("mouseleave", () => {
        var _a2;
        return (_a2 = state.markers.get(s.slug)) == null ? void 0 : _a2.getElement().classList.remove("is-hover");
      });
    });
    const toggle = module.querySelector("[data-map-list-toggle]");
    const listEl = module.querySelector("[data-map-list]");
    let reopen = null;
    if (toggle && mapEl) {
      reopen = document.createElement("button");
      reopen.type = "button";
      reopen.className = "map-list-open";
      reopen.innerHTML = '<span class="map-list-open_icon" aria-hidden="true"></span><span></span>';
      reopen.lastChild.textContent = t("map.showList");
      if (listEl) {
        listEl.id = listEl.id || `map-list-${Math.random().toString(36).slice(2, 8)}`;
        reopen.setAttribute("aria-controls", listEl.id);
        toggle.setAttribute("aria-controls", listEl.id);
      }
      reopen.setAttribute("aria-expanded", "false");
      mapEl.appendChild(reopen);
    }
    function setListHidden(hidden) {
      if (listEl) module.style.setProperty("--list-width", `${listEl.offsetWidth}px`);
      module.classList.toggle("is-list-hidden", hidden);
      toggle == null ? void 0 : toggle.setAttribute("aria-expanded", String(!hidden));
      const label = toggle ? toggle.querySelectorAll("span") : [];
      if (label.length) label[label.length - 1].textContent = hidden ? t("map.showList") : t("map.hideList");
      resizeDuring(550);
      if (hidden) reopen == null ? void 0 : reopen.focus();
      else toggle == null ? void 0 : toggle.focus();
    }
    function resizeDuring(ms) {
      if (!state.map) return;
      const end = performance.now() + ms;
      const step = () => {
        state.map.resize();
        if (performance.now() < end) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    toggle == null ? void 0 : toggle.addEventListener("click", (e) => {
      e.preventDefault();
      if (sheet == null ? void 0 : sheet.onToggle()) return;
      setListHidden(!module.classList.contains("is-list-hidden"));
    });
    reopen == null ? void 0 : reopen.addEventListener("click", () => setListHidden(false));
    sheet = createMapSheet(module, {
      select: (slug) => select(slug),
      isActive: (slug) => {
        var _a2;
        return ((_a2 = state.active) == null ? void 0 : _a2.slug) === slug;
      },
      resizeMap: () => {
        var _a2;
        return (_a2 = state.map) == null ? void 0 : _a2.resize();
      }
    });
    module.addEventListener("spaces:origin", (e) => setOrigin(e.detail));
    module.addEventListener("spaces:select", (e) => select(e.detail.slug));
    module.addEventListener("spaces:type", (e) => {
      state.type = e.detail.type === "salles" ? "salles" : "bureaux";
      renderList();
      if (state.active && !visibleSpaces().includes(state.active)) select(null);
      fitToSpaces();
    });
    function setOrigin(origin) {
      state.origin = origin && Number.isFinite(origin.lat) ? origin : null;
      renderList();
      updateOriginMarker();
      if (state.origin) {
        const nearest = [...visibleSpaces()].sort((a, b) => a.distance - b.distance)[0];
        if (nearest) select(nearest.slug, { fly: false });
        fitToOrigin();
      } else {
        fitToSpaces();
      }
    }
    function fitToSpaces() {
      if (!state.map) return;
      const pts = visibleSpaces();
      if (!pts.length) return;
      const bounds2 = new window.maplibregl.LngLatBounds();
      pts.forEach((s) => bounds2.extend([s.lng, s.lat]));
      state.map.fitBounds(bounds2, { padding: 60, maxZoom: 13, duration: prefersReducedMotion() ? 0 : 600 });
    }
    function fitToOrigin() {
      if (!state.map || !state.origin) return;
      const bounds2 = new window.maplibregl.LngLatBounds();
      bounds2.extend([state.origin.lng, state.origin.lat]);
      [...visibleSpaces()].sort((a, b) => a.distance - b.distance).slice(0, NEAREST_COUNT).forEach((s) => bounds2.extend([s.lng, s.lat]));
      state.map.fitBounds(bounds2, { padding: 80, maxZoom: 13.5, duration: prefersReducedMotion() ? 0 : 700 });
    }
    function centerModule() {
      const nav = document.querySelector("[data-nav]");
      const navHeight = nav ? nav.getBoundingClientRect().height : 0;
      const rect = module.getBoundingClientRect();
      const space = window.innerHeight - navHeight;
      const offset = navHeight + Math.max((space - rect.height) / 2, 0);
      const target = Math.max(rect.top + window.scrollY - offset, 0);
      if (Math.abs(target - window.scrollY) < 4) return;
      const instant = prefersReducedMotion();
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { duration: instant ? 0 : 0.8, immediate: instant, force: true });
      else window.scrollTo({ top: target, behavior: instant ? "auto" : "smooth" });
    }
    function resetView() {
      if (state.origin) fitToOrigin();
      else fitToSpaces();
    }
    function updateOriginMarker() {
      var _a2;
      if (!state.map) return;
      (_a2 = state.originMarker) == null ? void 0 : _a2.remove();
      state.originMarker = null;
      if (!state.origin) return;
      const el = document.createElement("div");
      el.className = "map-origin";
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", t("map.origin", { place: state.origin.label || t("search.nearMe") }));
      state.originMarker = new window.maplibregl.Marker({ element: el }).setLngLat([state.origin.lng, state.origin.lat]).addTo(state.map);
    }
    async function createMap3() {
      const maplibregl = await loadMapLibre();
      if (!maplibregl) return;
      const canvas = document.createElement("div");
      canvas.className = "map-module_canvas";
      mapEl.prepend(canvas);
      const map = new maplibregl.Map({
        container: canvas,
        style: STYLE_URL,
        center: [2.3, 48.88],
        zoom: 10.5,
        attributionControl: false,
        // crédits affichés dans [data-map-attribution]
        scrollZoom: false,
        // la molette fait défiler la page, pas zoomer la carte (boutons + / − pour zoomer)
        cooperativeGestures: !DESKTOP3.matches,
        // mobile : deux doigts pour bouger la carte
        dragRotate: false,
        pitchWithRotate: false
      });
      map.touchZoomRotate.disableRotation();
      state.map = map;
      map.on("style.load", () => applyTheme(map));
      map.once("load", () => {
        module.classList.add("is-map-ready");
        fitToSpaces();
        updateOriginMarker();
        if (state.origin) fitToOrigin();
        if (state.active) select(state.active.slug);
        revealPinsWhenVisible();
      });
      spaces.forEach((s) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "map-pin";
        if (!prefersReducedMotion()) el.classList.add("is-pending");
        el.setAttribute("aria-label", t("map.pin", { name: s.name }));
        el.innerHTML = `${PIN_SVG}<span class="map-pin_label">${escapeHtml(s.name)}</span>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          centerModule();
          if (state.active && state.active.slug === s.slug) {
            select(null);
            resetView();
          } else {
            select(s.slug);
          }
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([s.lng, s.lat]).addTo(map);
        state.markers.set(s.slug, marker);
      });
      renderList();
      if (state.active) select(state.active.slug, { fly: false });
      function revealPinsWhenVisible() {
        const pending = [...state.markers.values()].map((m) => m.getElement()).filter((el) => el.classList.contains("is-pending"));
        if (!pending.length) return;
        for (let i = pending.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pending[i], pending[j]] = [pending[j], pending[i]];
        }
        const io = new IntersectionObserver(
          (entries) => {
            if (!entries.some((e) => e.isIntersecting)) return;
            io.disconnect();
            pending.forEach((el, i) => {
              var _a2;
              el.style.setProperty("--pin-delay", `${i * PIN_STAGGER}ms`);
              el.classList.replace("is-pending", "is-popping");
              (_a2 = el.querySelector(".map-pin_shape")) == null ? void 0 : _a2.addEventListener(
                "animationend",
                () => el.classList.remove("is-popping"),
                { once: true }
              );
            });
          },
          { threshold: 0.3 }
        );
        io.observe(mapEl);
      }
      const on = (sel, fn) => {
        var _a2;
        return (_a2 = module.querySelector(sel)) == null ? void 0 : _a2.addEventListener("click", (e) => {
          e.preventDefault();
          fn();
        });
      };
      on("[data-map-zoom-in]", () => map.zoomIn());
      on("[data-map-zoom-out]", () => map.zoomOut());
      on("[data-map-reset]", () => {
        select(null);
        fitToSpaces();
      });
      const attribution = module.querySelector("[data-map-attribution]");
      if (attribution) attribution.textContent = t("map.attribution");
    }
    if (mapEl) {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          createMap3().catch((err) => console.warn("[Work'n'Share] carte indisponible :", err));
        },
        { rootMargin: "400px" }
      );
      io.observe(mapEl);
    }
    closeCard();
    const params = new URLSearchParams(location.search);
    if (params.get("type") === "salles") state.type = "salles";
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setOrigin({ lat, lng, label: params.get("q") || "", isUser: params.get("me") === "1" });
    } else {
      renderList();
    }
    if (params.get("espace")) select(params.get("espace"), { fly: false });
    module._spacesMap = { spaces, state };
  }
  function initStickyHead(column) {
    var _a, _b;
    const listWrap = ((_a = column.querySelector("[data-space-list]")) == null ? void 0 : _a.closest(".w-dyn-list")) || ((_b = column.querySelector(".space-item")) == null ? void 0 : _b.parentElement);
    const children = [...column.children];
    const stop = listWrap ? children.indexOf(listWrap.closest(`[data-map-list] > *`) || listWrap) : -1;
    const headItems = children.slice(0, stop > 0 ? stop : 0).filter((el) => !el.matches(".map-module_group, [data-map-group]"));
    if (!headItems.length) return;
    const head = document.createElement("div");
    head.className = "map-module_head";
    column.insertBefore(head, headItems[0]);
    headItems.forEach((el) => head.appendChild(el));
    const apply = () => {
      const cs = getComputedStyle(column);
      const gap = parseFloat(cs.rowGap) || 0;
      head.style.margin = `-${cs.paddingTop} -${cs.paddingRight} 0 -${cs.paddingLeft}`;
      head.style.top = `-${cs.paddingTop}`;
      head.style.padding = `${cs.paddingTop} ${cs.paddingRight} ${gap}px ${cs.paddingLeft}`;
      head.style.rowGap = `${gap}px`;
      head.style.backgroundColor = cs.backgroundColor;
    };
    apply();
    window.addEventListener("resize", apply, { passive: true });
    createScrollIndicator(column, head);
    column.addEventListener(
      "scroll",
      () => head.classList.toggle("is-stuck", column.scrollTop > 4),
      { passive: true }
    );
  }

  // src/components/space-map.js
  var DESKTOP4 = window.matchMedia("(min-width: 992px)");
  var DEFAULT_ZOOM = 14.5;
  var ICON_PLUS = "M10 4v12M4 10h12";
  var ICON_MINUS = "M4 10h12";
  var ICON_RECENTER = "M7 3H5a2 2 0 0 0-2 2v2M13 3h2a2 2 0 0 1 2 2v2M13 17h2a2 2 0 0 0 2-2v-2M7 17H5a2 2 0 0 1-2-2v-2M12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z";
  function initSpaceMaps(root = document) {
    const maps = [...root.querySelectorAll("[data-map][data-lat][data-lng]")].filter(
      (el) => !el.closest("[data-map-module]")
    );
    if (!maps.length) return;
    if (!("IntersectionObserver" in window)) return maps.forEach(createMap);
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        createMap(entry.target);
      }),
      { rootMargin: "600px 0px" }
    );
    maps.forEach((el) => observer.observe(el));
  }
  function iconButton(path, label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-control";
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="icon-20"><svg viewBox="0 0 20 20" width="100%" height="100%" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    button.addEventListener("click", (e) => {
      e.preventDefault();
      onClick();
    });
    return button;
  }
  async function createMap(el) {
    const lat = parseFloat(el.getAttribute("data-lat"));
    const lng = parseFloat(el.getAttribute("data-lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const name = el.getAttribute("data-map-label") || "";
    const zoom = parseFloat(el.getAttribute("data-map-zoom")) || DEFAULT_ZOOM;
    const maplibregl = await loadMapLibre();
    if (!maplibregl) return;
    const canvas = document.createElement("div");
    canvas.className = "map-module_canvas";
    el.prepend(canvas);
    const center = [lng, lat];
    const map = new maplibregl.Map({
      container: canvas,
      style: STYLE_URL,
      center,
      zoom,
      attributionControl: false,
      // crédits affichés dans le coin (texte du site)
      scrollZoom: false,
      // la molette fait défiler la page
      cooperativeGestures: !DESKTOP4.matches,
      // mobile : deux doigts pour bouger la carte
      dragRotate: false,
      pitchWithRotate: false
    });
    map.touchZoomRotate.disableRotation();
    map.on("style.load", () => applyTheme(map));
    map.once("load", () => el.classList.add("is-map-ready"));
    const pin = document.createElement("div");
    pin.className = "map-pin is-active";
    pin.setAttribute("role", "img");
    pin.setAttribute("aria-label", t("map.pin", { name }));
    pin.innerHTML = `${PIN_SVG}${name ? `<span class="map-pin_label">${escapeHtml(name)}</span>` : ""}`;
    new maplibregl.Marker({ element: pin, anchor: "bottom" }).setLngLat(center).addTo(map);
    const animate2 = !prefersReducedMotion();
    const controls = document.createElement("div");
    controls.className = "map-controls";
    controls.append(
      iconButton(ICON_PLUS, t("map.zoomIn"), () => map.zoomIn({ animate: animate2 })),
      iconButton(ICON_MINUS, t("map.zoomOut"), () => map.zoomOut({ animate: animate2 })),
      iconButton(ICON_RECENTER, t("map.recenter"), () => map.easeTo({ center, zoom, duration: animate2 ? 600 : 0 }))
    );
    el.appendChild(controls);
    const credit = el.querySelector(".space-map_credit, [data-map-attribution]");
    if (credit) credit.textContent = t("map.attribution");
  }

  // src/components/lightbox.js
  var SWIPE3 = 40;
  var icon = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  var ICON_CLOSE2 = "M18 6 6 18M6 6l12 12";
  var ICON_PREV = "M14.5 7.5S10 10.8 10 12c0 1.2 4.5 4.5 4.5 4.5";
  var ICON_NEXT = "M9.5 7.5S14 10.8 14 12c0 1.2-4.5 4.5-4.5 4.5";
  var instance = null;
  function createLightbox() {
    if (instance) return instance;
    const root = document.createElement("div");
    root.className = "lightbox";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", t("lightbox.label"));
    root.setAttribute("data-lenis-prevent", "");
    root.innerHTML = `
    <div class="lightbox_bar">
      <p class="lightbox_count" aria-live="polite"></p>
      <p class="lightbox_caption"></p>
      <button type="button" class="lightbox_button lightbox_close" aria-label="${t("lightbox.close")}">${icon(ICON_CLOSE2)}</button>
    </div>
    <div class="lightbox_stage">
      <button type="button" class="lightbox_button lightbox_prev" aria-label="${t("lightbox.prev")}">${icon(ICON_PREV)}</button>
      <figure class="lightbox_figure"><img class="lightbox_image" alt="" draggable="false"></figure>
      <button type="button" class="lightbox_button lightbox_next" aria-label="${t("lightbox.next")}">${icon(ICON_NEXT)}</button>
    </div>
    <div class="lightbox_thumbs" role="group" aria-label="${t("lightbox.thumbs")}"></div>`;
    document.body.appendChild(root);
    const $ = (sel) => root.querySelector(sel);
    const count = $(".lightbox_count");
    const caption = $(".lightbox_caption");
    const image = $(".lightbox_image");
    const figure = $(".lightbox_figure");
    const thumbs = $(".lightbox_thumbs");
    const prev = $(".lightbox_prev");
    const next = $(".lightbox_next");
    let photos = [];
    let index = 0;
    let opener = null;
    let token = 0;
    function show(i) {
      index = (i + photos.length) % photos.length;
      const photo = photos[index];
      count.textContent = `${index + 1} / ${photos.length}`;
      caption.textContent = photo.alt || "";
      const current = ++token;
      figure.classList.add("is-loading");
      const loader = new Image();
      loader.onload = loader.onerror = () => {
        if (current !== token) return;
        image.src = photo.src;
        image.alt = photo.alt || "";
        figure.classList.remove("is-loading");
      };
      loader.src = photo.src;
      [...thumbs.children].forEach((thumb, k) => {
        const on = k === index;
        thumb.classList.toggle("is-active", on);
        thumb.setAttribute("aria-current", on ? "true" : "false");
        if (on) thumb.scrollIntoView({ block: "nearest", inline: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      });
      [index - 1, index + 1].forEach((k) => new Image().src = photos[(k + photos.length) % photos.length].src);
    }
    function renderThumbs() {
      thumbs.innerHTML = "";
      photos.forEach((photo, k) => {
        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "lightbox_thumb";
        thumb.setAttribute("aria-label", t("lightbox.goto", { n: k + 1 }));
        thumb.innerHTML = `<img src="${photo.thumb || photo.src}" alt="" loading="lazy" draggable="false">`;
        thumb.addEventListener("click", () => show(k));
        thumbs.appendChild(thumb);
      });
    }
    function open2(list, start = 0, trigger = null) {
      var _a;
      photos = list.filter((p) => p && p.src);
      if (!photos.length) return;
      opener = trigger || document.activeElement;
      const several = photos.length > 1;
      prev.hidden = next.hidden = thumbs.hidden = !several;
      renderThumbs();
      root.hidden = false;
      document.documentElement.classList.add("is-lightbox-open");
      (_a = getLenis()) == null ? void 0 : _a.stop();
      requestAnimationFrame(() => root.classList.add("is-open"));
      show(start);
      $(".lightbox_close").focus();
    }
    function close() {
      var _a, _b;
      if (root.hidden) return;
      root.classList.remove("is-open");
      document.documentElement.classList.remove("is-lightbox-open");
      (_a = getLenis()) == null ? void 0 : _a.start();
      const hide = () => root.hidden = true;
      if (prefersReducedMotion()) hide();
      else setTimeout(hide, 250);
      (_b = opener == null ? void 0 : opener.focus) == null ? void 0 : _b.call(opener);
    }
    $(".lightbox_close").addEventListener("click", close);
    prev.addEventListener("click", () => show(index - 1));
    next.addEventListener("click", () => show(index + 1));
    root.addEventListener("click", (e) => {
      if (e.target === root || e.target.classList.contains("lightbox_stage")) close();
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return close();
      if (e.key === "ArrowLeft" && photos.length > 1) return show(index - 1);
      if (e.key === "ArrowRight" && photos.length > 1) return show(index + 1);
      if (e.key === "Tab") {
        const items = [...root.querySelectorAll("button:not([hidden])")].filter((b) => b.offsetParent);
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    let startX = null;
    figure.addEventListener("pointerdown", (e) => startX = e.clientX);
    figure.addEventListener("pointerup", (e) => {
      if (startX == null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > SWIPE3 && photos.length > 1) show(index + (dx < 0 ? 1 : -1));
    });
    figure.addEventListener("pointercancel", () => startX = null);
    instance = { open: open2, close };
    return instance;
  }

  // src/components/space-gallery.js
  function bestSrc2(img) {
    const set = img.getAttribute("srcset");
    if (set) {
      const best = set.split(",").map((part) => part.trim().split(/\s+/)).map(([url, w]) => ({ url, w: parseFloat(w) || 0 })).sort((a, b) => b.w - a.w)[0];
      if (best == null ? void 0 : best.url) return best.url;
    }
    return img.currentSrc || img.getAttribute("src") || "";
  }
  var key = (src) => src.replace(/-p-\d+(\.\w+)$/, "$1").split("?")[0];
  function initSpaceGalleries(root = document) {
    root.querySelectorAll("[data-gallery]").forEach(initGallery);
  }
  function initGallery(gallery) {
    const imgs = [
      ...gallery.querySelectorAll("img"),
      ...document.querySelectorAll("[data-gallery-photo] img, img[data-gallery-photo]")
    ].filter((img) => !img.closest(".w-condition-invisible, .w-dyn-empty"));
    const seen = /* @__PURE__ */ new Set();
    const photos = [];
    imgs.forEach((img) => {
      const src = bestSrc2(img);
      if (!src || /placeholder/i.test(src) || seen.has(key(src))) return;
      seen.add(key(src));
      photos.push({ src, thumb: img.currentSrc || img.getAttribute("src"), alt: img.getAttribute("alt") || "" });
    });
    if (!photos.length) return;
    const shown = gallery.querySelectorAll("img").length;
    const counter = gallery.querySelector("[data-gallery-count]");
    if (counter) {
      const rest = photos.length - shown;
      counter.textContent = rest > 0 ? `+${rest}` : "";
      counter.hidden = rest <= 0;
    }
    const lightbox = createLightbox();
    const tourTab = gallery.querySelector("[data-tour-360]");
    const switcher = (tourTab == null ? void 0 : tourTab.parentElement) || null;
    [...gallery.querySelectorAll("[data-gallery-open]")].filter((el) => !(switcher == null ? void 0 : switcher.contains(el))).forEach((trigger) => {
      if (trigger.tagName === "A") {
        trigger.removeAttribute("href");
        trigger.setAttribute("role", "button");
        trigger.setAttribute("tabindex", "0");
      }
      const at = Math.min(parseInt(trigger.getAttribute("data-gallery-open"), 10) || 0, photos.length - 1);
      const open2 = (e) => {
        e.preventDefault();
        e.stopPropagation();
        lightbox.open(photos, at, trigger);
      };
      trigger.addEventListener("click", open2);
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") open2(e);
      });
    });
    if (switcher) initSwitch(gallery, switcher, tourTab);
    const main = gallery.querySelector(".space-gallery_main img, [data-gallery-main]");
    if (main && !main.closest("[data-gallery-open]")) {
      main.style.cursor = "zoom-in";
      main.addEventListener("click", () => lightbox.open(photos, 0, main));
    }
  }
  var TOUR_OPTIONS = { brand: "0", help: "0" };
  function tourUrl(value) {
    const raw = (value || "").trim();
    const src = /<iframe/i.test(raw) ? (raw.match(/src=["']([^"']+)["']/i) || [])[1] || "" : raw;
    const clean2 = src.replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(clean2)) return "";
    try {
      const url = new URL(clean2);
      if (/matterport\.com$/i.test(url.hostname)) {
        const options = { ...TOUR_OPTIONS, lang: getLang() };
        Object.entries(options).forEach(([key2, val]) => {
          if (!url.searchParams.has(key2)) url.searchParams.set(key2, val);
        });
      }
      return url.toString();
    } catch (e) {
      return clean2;
    }
  }
  function initSwitch(gallery, switcher, tourTab) {
    const tabs = [...switcher.children].filter((el) => el.matches("a, button"));
    const photosTab = tabs.find((tab) => tab !== tourTab);
    const main = gallery.querySelector(".space-gallery_main, [data-gallery-main]") || switcher.parentElement;
    const url = tourUrl(tourTab.getAttribute("data-tour-url"));
    let panel = null;
    let active = photosTab;
    const indicator = createTabIndicator(switcher, { getActive: () => active, className: "space-gallery_indicator" });
    const tourPanel = () => {
      if (panel) return panel;
      panel = document.createElement("div");
      panel.className = "space-gallery_tour";
      if (url) {
        const frame = document.createElement("iframe");
        frame.src = url;
        frame.title = t("gallery.tour");
        frame.loading = "lazy";
        frame.allow = "fullscreen; xr-spatial-tracking; gyroscope; accelerometer";
        frame.allowFullscreen = true;
        panel.appendChild(frame);
      } else {
        panel.classList.add("is-empty");
        panel.innerHTML = `<p>${t("gallery.tourSoon")}</p>`;
      }
      main.appendChild(panel);
      return panel;
    };
    const select = (tab) => {
      active = tab;
      tabs.forEach((el) => {
        el.classList.toggle("is-active", el === tab);
        el.setAttribute("aria-pressed", el === tab ? "true" : "false");
      });
      const tour = tab === tourTab;
      if (tour) tourPanel();
      if (tour) {
        const total = gallery.offsetHeight;
        main.style.height = `${main.offsetHeight}px`;
        gallery.style.height = `${total}px`;
        main.getBoundingClientRect();
        main.style.height = `${total}px`;
      } else {
        main.style.height = `${baseHeight()}px`;
        const done = () => {
          main.style.height = "";
          gallery.style.height = "";
        };
        main.addEventListener("transitionend", done, { once: true });
        setTimeout(done, 600);
      }
      gallery.classList.toggle("is-tour", tour);
      indicator.move();
    };
    const baseHeight = () => {
      const saved = main.style.height;
      main.style.height = "";
      gallery.classList.remove("is-tour");
      const h = main.offsetHeight;
      gallery.classList.add("is-tour");
      main.style.height = saved;
      main.getBoundingClientRect();
      return h;
    };
    tabs.forEach((tab) => {
      if (tab.tagName === "A") {
        tab.removeAttribute("href");
        tab.setAttribute("tabindex", "0");
      }
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tab !== active) select(tab);
      });
      tab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          tab.click();
        }
      });
    });
  }

  // src/components/visit-form.js
  function initVisitForms(root = document) {
    root.querySelectorAll("[data-visit-form]").forEach(initVisitForm);
  }
  function initVisitForm(block) {
    const get = (name2) => (block.getAttribute(`data-visit-${name2}`) || "").trim();
    const name = get("name");
    const building = get("building");
    const host = get("host");
    const phone = get("phone");
    const set = (sel, text) => block.querySelectorAll(sel).forEach((el) => el.textContent = text);
    if (name) set("[data-visit-title]", t("visit.title", { name }));
    set(
      "[data-visit-lead]",
      host && building ? t("visit.leadHostBuilding", { host, building }) : host ? t("visit.leadHost", { host }) : t("visit.lead")
    );
    set("[data-visit-note]", host && name ? t("visit.noteHost", { host, name }) : t("visit.note"));
    if (phone) {
      block.querySelectorAll("[data-visit-call]").forEach((link) => {
        link.setAttribute("href", `tel:${phone.replace(/[^\d+]/g, "")}`);
        link.setAttribute("aria-label", t("visit.call", { phone }));
      });
    }
    const select = block.querySelector("[data-visit-space]");
    if (select && name) {
      const option = [...select.options].find((o) => o.value === name || o.text === name);
      if (option) select.value = option.value;
    }
  }

  // src/components/space-search.js
  var MAP_PAGE = "/espaces";
  var GEOCODER = "https://data.geopf.fr/geocodage/completion/";
  var DEBOUNCE = 220;
  var MAX = { spaces: 4, stations: 4, addresses: 4 };
  var uid2 = 0;
  var MIN_PANEL_HEIGHT = 160;
  var MAX_PANEL_HEIGHT = 420;
  var DEPT_CODES = {
    paris: "75",
    "seine et marne": "77",
    yvelines: "78",
    essonne: "91",
    "hauts de seine": "92",
    "seine saint denis": "93",
    "val de marne": "94",
    "val d oise": "95"
  };
  function deptTitle(dept) {
    if (!dept) return "";
    const code = DEPT_CODES[normalize(dept)];
    return code ? `${dept} \xB7 ${code}` : dept;
  }
  function initSpaceSearch(root = document) {
    root.querySelectorAll("[data-search]").forEach(initSearch);
  }
  function initSearch(block) {
    var _a;
    const input = block.querySelector("[data-search-input]");
    const form = block.querySelector("[data-search-form]");
    if (!input) return;
    const module = block.closest("[data-map-module]");
    const spaces = readSpaces(document);
    const id = `search-suggest-${++uid2}`;
    let type = ((_a = block.querySelector("[data-search-tab].is-active")) == null ? void 0 : _a.getAttribute("data-search-tab")) || "bureaux";
    let options = [];
    let activeIndex = -1;
    let timer2 = null;
    let requestId = 0;
    const panel = document.createElement("div");
    panel.className = "search_suggest";
    panel.id = id;
    panel.setAttribute("role", "listbox");
    panel.hidden = true;
    panel.setAttribute("data-lenis-prevent", "");
    document.body.appendChild(panel);
    const scrollbar = createScrollIndicator(panel);
    const anchor = form || input;
    function place() {
      if (panel.hidden) return;
      const rect = anchor.getBoundingClientRect();
      panel.style.top = `${rect.bottom + window.scrollY + 12}px`;
      panel.style.left = `${rect.left + window.scrollX}px`;
      panel.style.width = `${rect.width}px`;
      const available = window.innerHeight - (rect.bottom + 12) - 16;
      panel.style.maxHeight = `${Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, available))}px`;
      scrollbar == null ? void 0 : scrollbar.update();
    }
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
    document.addEventListener("scroll", schedulePlace, { passive: true, capture: true });
    const live = document.createElement("div");
    live.className = "search_status";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    block.appendChild(live);
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", id);
    input.setAttribute("autocomplete", "off");
    const tabs = [...block.querySelectorAll("[data-search-tab]")];
    tabs.forEach((tab) => {
      const label = [...tab.querySelectorAll("span")].find((s) => !s.children.length && s.textContent.trim());
      if (!label || label.classList.contains("search_tab-full")) return;
      label.classList.add("search_tab-full");
      const short = document.createElement("span");
      short.className = "search_tab-short";
      short.textContent = t(`search.tabShort.${tab.getAttribute("data-search-tab")}`);
      label.after(short);
    });
    let currentTab = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
    const indicator = tabs.length ? createTabIndicator(tabs[0].parentElement, { getActive: () => currentTab, className: "search_indicator" }) : null;
    function selectTab(tab, { focus = false } = {}) {
      currentTab = tab;
      type = tab.getAttribute("data-search-tab");
      tabs.forEach((other) => {
        const on = other === tab;
        other.classList.toggle("is-active", on);
        other.setAttribute("aria-selected", String(on));
        other.setAttribute("tabindex", on ? "0" : "-1");
      });
      indicator == null ? void 0 : indicator.move();
      if (focus) tab.focus();
      module == null ? void 0 : module.dispatchEvent(new CustomEvent("spaces:type", { detail: { type } }));
    }
    tabs.forEach((tab, index) => {
      tab.setAttribute("tabindex", tab === currentTab ? "0" : "-1");
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tab !== currentTab) selectTab(tab);
      });
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = tabs[(index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        selectTab(next, { focus: true });
      });
    });
    input.addEventListener("focus", () => {
      loadStations();
      openHero();
      update();
    });
    const hero = module ? null : block.closest("[data-hero-video]");
    const heading = hero ? block.previousElementSibling : null;
    const content = heading ? heading.parentElement : null;
    heading == null ? void 0 : heading.setAttribute("data-hero-heading", "");
    content == null ? void 0 : content.setAttribute("data-hero-content", "");
    const HERO_TOP_OFFSET = 56;
    const HEADING_SCALE = 0.5;
    function openHero() {
      if (!hero || hero.classList.contains("is-searching")) return;
      const heroTop = hero.getBoundingClientRect().top;
      const h = heading.getBoundingClientRect();
      const visibleTop = h.top + h.height * (1 - HEADING_SCALE);
      const shift = Math.max(0, visibleTop - heroTop - HERO_TOP_OFFSET);
      hero.style.setProperty("--search-shift", `${-shift}px`);
      hero.style.setProperty("--heading-scale", HEADING_SCALE);
      hero.classList.add("is-searching");
      followPanel();
      centerHero();
    }
    function centerHero() {
      const nav = document.querySelector("[data-nav]");
      const navHeight = nav ? nav.getBoundingClientRect().height : 0;
      const target = Math.max(0, hero.getBoundingClientRect().top + window.scrollY - navHeight);
      if (Math.abs(window.scrollY - target) < 2) return;
      const instant = prefersReducedMotion();
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { duration: instant ? 0 : 0.8, immediate: instant, force: true });
      else window.scrollTo({ top: target, behavior: instant ? "auto" : "smooth" });
    }
    function closeHero() {
      if (!hero || !hero.classList.contains("is-searching")) return;
      hero.classList.remove("is-searching");
    }
    function followPanel() {
      const end = performance.now() + 700;
      const step = () => {
        place();
        if (performance.now() < end) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    input.addEventListener("input", () => {
      clearTimeout(timer2);
      timer2 = setTimeout(update, DEBOUNCE);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (panel.hidden) update();
        e.preventDefault();
        move(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = options[activeIndex] || options.find((o) => o.kind !== "nearme");
        if (opt) choose(opt);
      } else if (e.key === "Escape") {
        close();
      }
    });
    const submit = form == null ? void 0 : form.querySelector('input[type="submit"]');
    if (submit) {
      const button = document.createElement("button");
      button.type = "submit";
      button.className = `${submit.className} search_submit`;
      button.innerHTML = '<span class="button_label"></span><span class="button_icon" aria-hidden="true"><span class="ico-arrow-right"></span></span>';
      button.querySelector(".button_label").textContent = submit.value;
      submit.replaceWith(button);
    }
    form == null ? void 0 : form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!input.value.trim()) {
        if (!module) location.href = type === "salles" ? `${MAP_PAGE}?type=salles` : MAP_PAGE;
        return;
      }
      const opt = options.find((o) => o.kind !== "nearme");
      if (opt) choose(opt);
      else if (!module) location.href = `${MAP_PAGE}?${new URLSearchParams({ q: input.value.trim() })}`;
    });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (panel.hidden && !(hero == null ? void 0 : hero.classList.contains("is-searching"))) return;
        if (!block.contains(e.target) && !panel.contains(e.target)) close();
      },
      true
    );
    async function update() {
      const query2 = input.value.trim();
      const q = normalize(query2);
      const current = ++requestId;
      const groups = [];
      groups.push({ items: [{ kind: "nearme", label: t("search.nearMe"), hint: t("search.nearMeHint") }] });
      const toItem = (s) => ({ kind: "space", label: s.name, hint: s.building, space: s });
      const pool = spaces.filter((s) => type === "salles" ? s.rooms : true);
      if (!q) {
        const byDept = /* @__PURE__ */ new Map();
        pool.forEach((s) => {
          const key2 = s.dept || "";
          if (!byDept.has(key2)) byDept.set(key2, []);
          byDept.get(key2).push(toItem(s));
        });
        byDept.forEach((items, dept) => groups.push({ title: deptTitle(dept) || t("search.spaces"), items }));
      } else {
        const spaceMatches = pool.filter((s) => normalize(`${s.name} ${s.city} ${s.building}`).includes(q)).slice(0, MAX.spaces).map(toItem);
        if (spaceMatches.length) groups.push({ title: t("search.spaces"), items: spaceMatches });
      }
      if (q.length >= 2) {
        const stations = await loadStations();
        if (current !== requestId) return;
        const starts = stations.filter((s) => s.key.startsWith(q));
        const contains = stations.filter((s) => !s.key.startsWith(q) && s.key.includes(q));
        const stationItems = [...starts, ...contains].slice(0, MAX.stations).map((s) => ({ kind: "station", label: s.name, lines: s.lines, lat: s.lat, lng: s.lng }));
        if (stationItems.length) groups.push({ title: t("search.stations"), items: stationItems });
        if (q.length >= 3) {
          const addresses = await geocode(query2);
          if (current !== requestId) return;
          if (addresses.length) groups.push({ title: t("search.addresses"), items: addresses });
        }
      }
      render(groups, query2);
    }
    async function geocode(text) {
      const url = `${GEOCODER}?text=${encodeURIComponent(text)}&type=StreetAddress&maximumResponses=10&lonlat=2.35,48.86`;
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const results = (data.results || []).filter((r) => Number.isFinite(r.y) && Number.isFinite(r.x) && r.metropole !== false);
        const idf = results.filter((r) => isInIdf(r.zipcode));
        return [...idf, ...results.filter((r) => !isInIdf(r.zipcode))].slice(0, MAX.addresses).map((r) => {
          const city = r.city || "";
          const label = r.fulltext || [r.street, r.zipcode, city].filter(Boolean).join(" ");
          return {
            kind: "address",
            label,
            short: r.kind === "municipality" || !r.street ? city || label : label,
            hint: isInIdf(r.zipcode) ? "" : t("search.outsideIdf"),
            lat: r.y,
            lng: r.x
          };
        });
      } catch (e) {
        return [];
      }
    }
    function render(groups, query2) {
      panel.innerHTML = "";
      options = [];
      activeIndex = -1;
      groups.forEach((group) => {
        if (group.title) {
          const title = document.createElement("p");
          title.className = "search_suggest-title";
          title.setAttribute("role", "presentation");
          title.textContent = group.title;
          panel.appendChild(title);
        }
        group.items.forEach((item) => {
          const index = options.length;
          const el = document.createElement("div");
          el.className = `search_suggest-item is-${item.kind}${item.kind === "nearme" || item.kind === "space" ? " is-inline" : ""}`;
          el.id = `${id}-${index}`;
          el.setAttribute("role", "option");
          el.setAttribute("aria-selected", "false");
          el.innerHTML = `<span class="search_suggest-icon" aria-hidden="true"></span><span class="search_suggest-text"><span class="search_suggest-label"></span>${item.hint ? '<span class="search_suggest-hint"></span>' : ""}</span>`;
          el.querySelector(".search_suggest-label").textContent = item.label;
          if (item.hint) el.querySelector(".search_suggest-hint").textContent = item.hint;
          if (item.lines) {
            const box = renderLines([{ lines: item.lines }], { maxLines: 5 });
            if (box) {
              box.classList.add("search_suggest-lines");
              el.appendChild(box);
            }
          }
          el.addEventListener("mousedown", (e) => e.preventDefault());
          el.addEventListener("click", () => choose(item));
          el.addEventListener("mousemove", () => highlight(index));
          panel.appendChild(el);
          options.push(item);
        });
      });
      if (query2 && options.length <= 1) {
        const empty = document.createElement("p");
        empty.className = "search_suggest-empty";
        empty.textContent = t("search.noResult");
        panel.appendChild(empty);
      }
      panel.hidden = false;
      panel.scrollTop = 0;
      scrollbar == null ? void 0 : scrollbar.attach();
      place();
      input.setAttribute("aria-expanded", "true");
      live.textContent = t("search.results", { n: options.length });
    }
    function highlight(index) {
      activeIndex = index;
      panel.querySelectorAll("[role='option']").forEach((el, i) => {
        const on = i === index;
        el.classList.toggle("is-focused", on);
        el.setAttribute("aria-selected", String(on));
        if (on) {
          input.setAttribute("aria-activedescendant", el.id);
          el.scrollIntoView({ block: "nearest" });
        }
      });
    }
    function move(step) {
      if (!options.length) return;
      highlight((activeIndex + step + options.length) % options.length);
    }
    function close() {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      closeHero();
    }
    function choose(item) {
      close();
      if (item.kind === "nearme") return locate();
      if (item.kind === "space") {
        input.value = item.label;
        if (module) module.dispatchEvent(new CustomEvent("spaces:select", { detail: { slug: item.space.slug } }));
        else location.href = item.space.url;
        return;
      }
      const label = item.short || item.label;
      input.value = label;
      goTo({ lat: item.lat, lng: item.lng, label, isUser: false });
    }
    function locate() {
      if (!navigator.geolocation) {
        live.textContent = t("search.geoError");
        return;
      }
      input.value = t("search.locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          input.value = t("search.nearMe");
          goTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: t("search.nearMe"), isUser: true });
        },
        () => {
          input.value = "";
          live.textContent = t("search.geoError");
        },
        { enableHighAccuracy: false, timeout: 1e4, maximumAge: 3e5 }
      );
    }
    function goTo(origin) {
      if (module) {
        module.dispatchEvent(new CustomEvent("spaces:origin", { detail: origin }));
        return;
      }
      const params = new URLSearchParams({ lat: origin.lat.toFixed(5), lng: origin.lng.toFixed(5), q: origin.label });
      if (origin.isUser) params.set("me", "1");
      if (type === "salles") params.set("type", "salles");
      location.href = `${MAP_PAGE}?${params}`;
    }
  }

  // src/components/toc.js
  var ACTIVE_LINE = 0.3;
  function initTocs(root = document) {
    root.querySelectorAll("[data-toc]").forEach(initToc);
  }
  function slugify(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^\s*\d+\s*[.)-]?\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }
  function initToc(nav) {
    const source = document.querySelector("[data-toc-source]");
    if (!source) return;
    const levels = nav.getAttribute("data-toc-levels") || "h2";
    const headings = [...source.querySelectorAll(levels)].filter((h) => h.textContent.trim());
    document.querySelectorAll("[data-toc-include]").forEach((block) => {
      const empty = block.querySelector(".w-dyn-empty") || block.closest(".w-condition-invisible, [hidden]");
      const title = block.querySelector("h2");
      if (empty || !(title == null ? void 0 : title.textContent.trim())) return;
      if (!title.id && block.id && !block.querySelector(`#${CSS.escape(block.id)}`)) title.dataset.tocTarget = block.id;
      headings.push(title);
    });
    if (!headings.length) {
      nav.hidden = true;
      return;
    }
    const used = /* @__PURE__ */ new Set();
    headings.forEach((h) => {
      if (!h.id) {
        let id = slugify(h.textContent) || "partie";
        let n = 2;
        while (used.has(id) || document.getElementById(id)) id = `${slugify(h.textContent)}-${n++}`;
        h.id = id;
      }
      used.add(h.id);
    });
    const anchor = (h) => h.dataset.tocTarget || h.id;
    let list = nav.querySelector("[data-toc-list]");
    let links = [...nav.querySelectorAll('a[href^="#"]')];
    const valid = links.length && links.every((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
    if (!valid) {
      links.forEach((a) => a.remove());
      if (!list) {
        list = document.createElement("div");
        list.className = "post-toc_list";
        nav.appendChild(list);
      }
      links = headings.map((h) => {
        const a = document.createElement("a");
        a.className = "post-toc_link";
        a.href = `#${anchor(h)}`;
        a.textContent = h.textContent.trim();
        list.appendChild(a);
        return a;
      });
    }
    const collapse = nav.closest("[data-collapse]");
    if (collapse) {
      window.addEventListener(
        "click",
        (e) => {
          var _a, _b, _c;
          const link = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, 'a[href^="#"]');
          if (!link || !nav.contains(link) || !collapse.classList.contains("is-open")) return;
          const content = collapse.querySelector("[data-collapse-content]");
          if (content) content.style.transition = "none";
          (_c = collapse.querySelector("[data-collapse-trigger]")) == null ? void 0 : _c.click();
          if (content) {
            void content.offsetHeight;
            requestAnimationFrame(() => content.style.transition = "");
          }
        },
        true
      );
    }
    const pairs = links.map((link) => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))) })).filter((p) => p.heading);
    if (!pairs.length) return;
    let current = null;
    const setActive = (pair) => {
      if (pair === current) return;
      current = pair;
      pairs.forEach(({ link }) => {
        const on = pair && link === pair.link;
        link.classList.toggle("is-active", on);
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.innerHeight * ACTIVE_LINE;
      let active = null;
      pairs.forEach((p) => {
        if (p.heading.getBoundingClientRect().top <= line) active = p;
      });
      setActive(active || pairs[0]);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  // src/components/card-link.js
  function initCardLinks(root = document) {
    root.querySelectorAll("[data-card-link]").forEach(initCardLink);
  }
  function resolveHref(card) {
    const own = card.getAttribute("data-card-link");
    if (own) return own;
    const scope = card.closest("section") || document;
    const source = scope.querySelector("[data-card-link-source][href]");
    const href = source == null ? void 0 : source.getAttribute("href");
    return href && href !== "#" ? href : "";
  }
  function initCardLink(card) {
    const href = resolveHref(card);
    if (!href) return;
    card.classList.add("is-card-link");
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    if (!card.hasAttribute("aria-label")) {
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      const parts = [];
      while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
      const label = parts.join(" ").replace(/\s+/g, " ").trim();
      if (label) card.setAttribute("aria-label", label);
    }
    const go = (newTab) => {
      if (newTab) window.open(href, "_blank", "noopener");
      else window.location.href = href;
    };
    card.addEventListener("click", (e) => {
      if (e.target.closest("a, button") && e.target.closest("a, button") !== card) return;
      go(e.metaKey || e.ctrlKey);
    });
    card.addEventListener("auxclick", (e) => {
      if (e.button === 1) go(true);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go(false);
    });
  }

  // src/components/comparateur.js
  function initComparateur(root = document) {
    const el = root.querySelector("[data-comparateur]");
    if (!el || el.dataset.comparateurInit) return;
    el.dataset.comparateurInit = "1";
    const show = () => el.classList.add("is-ready");
    loadStyle(`${ASSET_BASE}comparateur.css`).then(show, show).then(() => loadScript(`${ASSET_BASE}comparateur.js`)).catch((err) => console.warn("[Work'n'Share] comparateur :", err.message));
  }

  // src/comparateur/communes.json
  var communes_default = [["Paris 1er", "75001"], ["Paris 2e", "75002"], ["Paris 3e", "75003"], ["Paris 4e", "75004"], ["Paris 5e", "75005"], ["Paris 6e", "75006"], ["Paris 7e", "75007"], ["Paris 8e", "75008"], ["Paris 9e", "75009"], ["Paris 10e", "75010"], ["Paris 11e", "75011"], ["Paris 12e", "75012"], ["Paris 13e", "75013"], ["Paris 14e", "75014"], ["Paris 15e", "75015"], ["Paris 16e", "75016"], ["Paris 17e", "75017"], ["Paris 18e", "75018"], ["Paris 19e", "75019"], ["Paris 20e", "75020"], ["La D\xE9fense", "92400"], ["Neuilly-sur-Seine", "92200"], ["Levallois-Perret", "92300"], ["Boulogne-Billancourt", "92100"], ["Issy-les-Moulineaux", "92130"], ["Saint-Cloud", "92210"], ["Puteaux", "92800"], ["Courbevoie", "92400"], ["Suresnes", "92150"], ["Meudon", "92190"], ["Nanterre", "92000"], ["Rueil-Malmaison", "92500"], ["Bois-Colombes", "92270"], ["La Garenne-Colombes", "92250"], ["S\xE8vres", "92310"], ["Asni\xE8res-sur-Seine", "92600"], ["Colombes", "92700"], ["Gennevilliers", "92230"], ["Villeneuve-la-Garenne", "92390"], ["Montrouge", "92120"], ["Clichy", "92110"], ["Malakoff", "92240"], ["Vanves", "92170"], ["Ch\xE2tillon", "92320"], ["Bagneux", "92220"], ["Clamart", "92140"], ["Le Plessis-Robinson", "92350"], ["Antony", "92160"], ["Bourg-la-Reine", "92340"], ["Sceaux", "92330"], ["Fontenay-aux-Roses", "92260"], ["Ch\xE2tenay-Malabry", "92290"], ["Saint-Ouen-sur-Seine", "93400"], ["Pantin", "93500"], ["Saint-Denis", "93200"], ["Montreuil", "93100"], ["Bagnolet", "93170"], ["Aubervilliers", "93300"], ["Le Pr\xE9-Saint-Gervais", "93310"], ["Les Lilas", "93260"], ["Romainville", "93230"], ["Bobigny", "93000"], ["Noisy-le-Sec", "93130"], ["Rosny-sous-Bois", "93110"], ["Noisy-le-Grand", "93160"], ["La Courneuve", "93120"], ["\xC9pinay-sur-Seine", "93800"], ["Le Bourget", "93350"], ["Bondy", "93140"], ["Drancy", "93700"], ["Stains", "93240"], ["Le Blanc-Mesnil", "93150"], ["Livry-Gargan", "93190"], ["Aulnay-sous-Bois", "93600"], ["Tremblay-en-France", "93290"], ["Villepinte", "93420"], ["Vincennes", "94300"], ["Saint-Mand\xE9", "94160"], ["Charenton-le-Pont", "94220"], ["Nogent-sur-Marne", "94130"], ["Le Kremlin-Bic\xEAtre", "94270"], ["Arcueil", "94110"], ["Gentilly", "94250"], ["Fontenay-sous-Bois", "94120"], ["Saint-Maurice", "94410"], ["Ivry-sur-Seine", "94200"], ["Joinville-le-Pont", "94340"], ["Maisons-Alfort", "94700"], ["Cachan", "94230"], ["Villejuif", "94800"], ["Alfortville", "94140"], ["Cr\xE9teil", "94000"], ["Vitry-sur-Seine", "94400"], ["L\u2019Ha\xFF-les-Roses", "94240"], ["Rungis", "94150"], ["Thiais", "94320"], ["Choisy-le-Roi", "94600"], ["Orly", "94310"], ["Fresnes", "94260"], ["Massy", "91300"], ["Palaiseau", "91120"], ["Orsay", "91400"], ["Les Ulis", "91940"], ["\xC9vry-Courcouronnes", "91000"], ["Corbeil-Essonnes", "91100"], ["V\xE9lizy-Villacoublay", "78140"], ["Versailles", "78000"], ["Saint-Germain-en-Laye", "78100"], ["Poissy", "78300"], ["Montigny-le-Bretonneux", "78180"], ["Guyancourt", "78280"], ["\xC9lancourt", "78990"], ["Trappes", "78190"], ["Argenteuil", "95100"], ["Franconville", "95130"], ["Cergy", "95000"], ["Pontoise", "95300"], ["Gonesse", "95500"], ["Sarcelles", "95200"], ["Roissy-en-France", "95700"], ["Chelles", "77500"], ["Champs-sur-Marne", "77420"], ["Bussy-Saint-Georges", "77600"], ["Serris", "77700"], ["Chaville", "92370"], ["Garches", "92380"], ["Marnes-la-Coquette", "92430"], ["Vaucresson", "92420"], ["Ville-d'Avray", "92410"], ["Clichy-sous-Bois", "93390"], ["Coubron", "93470"], ["Dugny", "93440"], ["Gagny", "93220"], ["Gournay-sur-Marne", "93460"], ["L'\xCEle-Saint-Denis", "93450"], ["Montfermeil", "93370"], ["Neuilly-Plaisance", "93360"], ["Neuilly-sur-Marne", "93330"], ["Les Pavillons-sous-Bois", "93320"], ["Le Raincy", "93340"], ["Sevran", "93270"], ["Vaujours", "93410"], ["Villemomble", "93250"], ["Villetaneuse", "93430"], ["Ablon-sur-Seine", "94480"], ["Boissy-Saint-L\xE9ger", "94470"], ["Bonneuil-sur-Marne", "94380"], ["Bry-sur-Marne", "94360"], ["Champigny-sur-Marne", "94500"], ["Chennevi\xE8res-sur-Marne", "94430"], ["Chevilly-Larue", "94550"], ["Limeil-Br\xE9vannes", "94450"], ["Mandres-les-Roses", "94520"], ["Marolles-en-Brie", "94440"], ["Noiseau", "94880"], ["Ormesson-sur-Marne", "94490"], ["P\xE9rigny", "94520"], ["Le Perreux-sur-Marne", "94170"], ["Le Plessis-Tr\xE9vise", "94420"], ["La Queue-en-Brie", "94510"], ["Saint-Maur-des-Foss\xE9s", "94100"], ["Santeny", "94440"], ["Sucy-en-Brie", "94370"], ["Valenton", "94460"], ["Villecresnes", "94440"], ["Villeneuve-le-Roi", "94290"], ["Villeneuve-Saint-Georges", "94190"], ["Villiers-sur-Marne", "94350"], ["Arnouville", "95400"], ["Beauchamp", "95250"], ["Beaumont-sur-Oise", "95260"], ["Bessancourt", "95550"], ["Bezons", "95870"], ["Cormeilles-en-Parisis", "95240"], ["Courdimanche", "95800"], ["Deuil-la-Barre", "95170"], ["Domont", "95330"], ["Eaubonne", "95600"], ["Enghien-les-Bains", "95880"], ["\xC9ragny-sur-Oise", "95610"], ["Ermont", "95120"], ["\xC9zanville", "95460"], ["Fosses", "95470"], ["Garges-l\xE8s-Gonesse", "95140"], ["Goussainville", "95190"], ["Groslay", "95410"], ["Herblay-sur-Seine", "95220"], ["L'Isle-Adam", "95290"], ["Jouy-le-Moutier", "95280"], ["Louvres", "95380"], ["M\xE9ry-sur-Oise", "95540"], ["Montigny-l\xE8s-Cormeilles", "95370"], ["Montmagny", "95360"], ["Montmorency", "95160"], ["Osny", "95520"], ["Pierrelaye", "95220"], ["Le Plessis-Bouchard", "95130"], ["Saint-Brice-sous-For\xEAt", "95350"], ["Saint-Gratien", "95210"], ["Saint-Leu-la-For\xEAt", "95320"], ["Saint-Ouen-l'Aum\xF4ne", "95310"], ["Saint-Prix", "95390"], ["Sannois", "95110"], ["Soisy-sous-Montmorency", "95230"], ["Taverny", "95150"], ["Vaur\xE9al", "95490"], ["Villiers-le-Bel", "95400"], ["Ach\xE8res", "78260"], ["Andr\xE9sy", "78570"], ["Bois-d'Arcy", "78390"], ["Bougival", "78380"], ["Buc", "78530"], ["Carri\xE8res-sous-Poissy", "78955"], ["Carri\xE8res-sur-Seine", "78420"], ["La Celle-Saint-Cloud", "78170"], ["Chanteloup-les-Vignes", "78570"], ["Chatou", "78400"], ["Le Chesnay-Rocquencourt", "78150"], ["Les Clayes-sous-Bois", "78340"], ["Coigni\xE8res", "78310"], ["Conflans-Sainte-Honorine", "78700"], ["Croissy-sur-Seine", "78290"], ["Fontenay-le-Fleury", "78330"], ["Houilles", "78800"], ["Jouy-en-Josas", "78350"], ["Louveciennes", "78430"], ["Magny-les-Hameaux", "78114"], ["Maisons-Laffitte", "78600"], ["Marly-le-Roi", "78160"], ["Maurepas", "78310"], ["Le Mesnil-le-Roi", "78600"], ["Les Mureaux", "78130"], ["Noisy-le-Roi", "78590"], ["Le Pecq", "78230"], ["Plaisir", "78370"], ["Le Port-Marly", "78560"], ["Saint-Cyr-l'\xC9cole", "78210"], ["Sartrouville", "78500"], ["Triel-sur-Seine", "78510"], ["Verneuil-sur-Seine", "78480"], ["La Verri\xE8re", "78320"], ["Le V\xE9sinet", "78110"], ["Villepreux", "78450"], ["Viroflay", "78220"], ["Voisins-le-Bretonneux", "78960"], ["Arpajon", "91290"], ["Athis-Mons", "91200"], ["Ballainvilliers", "91160"], ["Bi\xE8vres", "91570"], ["Bondoufle", "91070"], ["Boussy-Saint-Antoine", "91800"], ["Br\xE9tigny-sur-Orge", "91220"], ["Brunoy", "91800"], ["Bures-sur-Yvette", "91440"], ["Chilly-Mazarin", "91380"], ["Crosne", "91560"], ["Draveil", "91210"], ["\xC9pinay-sous-S\xE9nart", "91860"], ["\xC9pinay-sur-Orge", "91360"], ["Fleury-M\xE9rogis", "91700"], ["Gif-sur-Yvette", "91190"], ["Grigny", "91350"], ["Igny", "91430"], ["Juvisy-sur-Orge", "91260"], ["Lisses", "91090"], ["Longjumeau", "91160"], ["Marcoussis", "91460"], ["Montgeron", "91230"], ["Montlh\xE9ry", "91310"], ["Morangis", "91420"], ["Morsang-sur-Orge", "91390"], ["Quincy-sous-S\xE9nart", "91480"], ["Ris-Orangis", "91130"], ["Saclay", "91400"], ["Sainte-Genevi\xE8ve-des-Bois", "91700"], ["Saint-Germain-l\xE8s-Arpajon", "91180"], ["Saint-Michel-sur-Orge", "91240"], ["Savigny-sur-Orge", "91600"], ["Verri\xE8res-le-Buisson", "91370"], ["Vigneux-sur-Seine", "91270"], ["Villebon-sur-Yvette", "91140"], ["Viry-Ch\xE2tillon", "91170"], ["Wissous", "91320"], ["Yerres", "91330"], ["Bailly-Romainvilliers", "77700"], ["Chessy", "77700"], ["Claye-Souilly", "77410"], ["Coll\xE9gien", "77090"], ["Combs-la-Ville", "77380"], ["Croissy-Beaubourg", "77183"], ["\xC9merainville", "77184"], ["Lagny-sur-Marne", "77400"], ["Lieusaint", "77127"], ["Lognes", "77185"], ["Magny-le-Hongre", "77700"], ["Mitry-Mory", "77290"], ["Mont\xE9vrain", "77144"], ["Noisiel", "77186"], ["Ozoir-la-Ferri\xE8re", "77330"], ["Pontault-Combault", "77340"], ["Roissy-en-Brie", "77680"], ["Saint-Thibault-des-Vignes", "77400"], ["Thorigny-sur-Marne", "77400"], ["Torcy", "77200"], ["Vaires-sur-Marne", "77360"], ["Villeparisis", "77270"]];

  // src/components/comparator-banner.js
  var MIN = 1;
  var MAX2 = 900;
  var MAX_RESULTS = 8;
  var norm2 = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  var INDEX = communes_default.map(([name, cp]) => ({ name, cp, key: norm2(name) }));
  function search(query2) {
    const q = norm2(query2);
    if (!q) return [];
    const starts = [];
    const words = [];
    INDEX.forEach((c) => {
      if (c.key.startsWith(q) || c.cp.startsWith(q)) starts.push(c);
      else if (c.key.includes(` ${q}`)) words.push(c);
    });
    return starts.concat(words).slice(0, MAX_RESULTS);
  }
  function initComparatorBanners(root = document) {
    root.querySelectorAll("[data-comparator]").forEach(initBanner);
  }
  var uid3 = 0;
  function initBanner(banner) {
    if (banner.dataset.comparatorInit) return;
    banner.dataset.comparatorInit = "1";
    const cityBox = banner.querySelector("[data-comparator-city]");
    const valueEl = banner.querySelector("[data-comparator-value]");
    const minus = banner.querySelector("[data-comparator-minus]");
    const plus = banner.querySelector("[data-comparator-plus]");
    const submit = banner.querySelector("[data-comparator-submit]");
    if (!submit) return;
    const baseUrl = banner.getAttribute("data-comparator-url") || "/comparateur";
    let city = null;
    let heads = clamp2(parseInt(valueEl == null ? void 0 : valueEl.textContent, 10) || 10);
    const updateLink = () => {
      const params = new URLSearchParams();
      if (city) params.set("ville", city.name);
      params.set("postes", String(heads));
      submit.setAttribute("href", `${baseUrl}?${params}`);
    };
    const setHeads = (n) => {
      heads = clamp2(n);
      if (valueEl) valueEl.textContent = String(heads);
      minus == null ? void 0 : minus.setAttribute("aria-disabled", String(heads <= MIN));
      plus == null ? void 0 : plus.setAttribute("aria-disabled", String(heads >= MAX2));
      updateLink();
    };
    valueEl == null ? void 0 : valueEl.setAttribute("aria-live", "polite");
    const step = (delta) => (e) => {
      e.preventDefault();
      setHeads(heads + delta);
    };
    minus == null ? void 0 : minus.addEventListener("click", step(-1));
    plus == null ? void 0 : plus.addEventListener("click", step(1));
    [minus, plus].forEach(
      (btn) => btn == null ? void 0 : btn.addEventListener("keydown", (e) => {
        if (e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      })
    );
    if (cityBox) initCity();
    function initCity() {
      const placeholderEl = [...cityBox.children].find((el) => !el.querySelector("[class^='ico-']") && el.textContent.trim());
      const placeholder = (placeholderEl == null ? void 0 : placeholderEl.textContent.trim()) || t("comparator.city");
      const id = `comparator-${++uid3}`;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "offices-calc_field-input";
      input.placeholder = placeholder;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-label", t("comparator.city"));
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("aria-controls", `${id}-list`);
      const list = document.createElement("div");
      list.className = "offices-calc_list";
      list.id = `${id}-list`;
      list.setAttribute("role", "listbox");
      list.setAttribute("aria-label", t("comparator.cities"));
      list.setAttribute("data-lenis-prevent", "");
      list.hidden = true;
      if (placeholderEl) placeholderEl.replaceWith(input);
      else cityBox.append(input);
      cityBox.append(list);
      cityBox.classList.add("has-input");
      cityBox.addEventListener("click", (e) => {
        if (!list.contains(e.target)) input.focus();
      });
      let results = [];
      let active = -1;
      const close = () => {
        list.hidden = true;
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        active = -1;
      };
      const highlight = (i) => {
        active = i;
        list.querySelectorAll("[role='option']").forEach((opt, n) => {
          const on = n === i;
          opt.classList.toggle("is-active", on);
          opt.setAttribute("aria-selected", String(on));
          if (on) {
            input.setAttribute("aria-activedescendant", opt.id);
            opt.scrollIntoView({ block: "nearest" });
          }
        });
      };
      const choose = (c) => {
        city = c;
        input.value = c.name;
        input.removeAttribute("aria-invalid");
        close();
        updateLink();
      };
      const render = () => {
        results = search(input.value);
        list.textContent = "";
        if (!input.value.trim()) return close();
        if (!results.length) {
          const empty = document.createElement("div");
          empty.className = "offices-calc_empty";
          empty.textContent = t("comparator.noCity");
          list.append(empty);
        }
        results.forEach((c, i) => {
          const opt = document.createElement("div");
          opt.id = `${id}-opt-${i}`;
          opt.className = "offices-calc_option";
          opt.setAttribute("role", "option");
          opt.setAttribute("aria-selected", "false");
          const name = document.createElement("span");
          name.textContent = c.name;
          const cp = document.createElement("span");
          cp.className = "offices-calc_cp";
          cp.textContent = c.cp;
          opt.append(name, cp);
          opt.addEventListener("mousedown", (e) => {
            e.preventDefault();
            choose(c);
          });
          list.append(opt);
        });
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
        highlight(results.length ? 0 : -1);
      };
      input.addEventListener("input", () => {
        city = null;
        updateLink();
        render();
      });
      input.addEventListener("focus", () => {
        if (input.value && !city) render();
      });
      input.addEventListener("keydown", (e) => {
        const open2 = !list.hidden && results.length;
        if (e.key === "ArrowDown" && open2) {
          e.preventDefault();
          highlight((active + 1) % results.length);
        } else if (e.key === "ArrowUp" && open2) {
          e.preventDefault();
          highlight((active - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (open2 && active > -1) choose(results[active]);
          else if (city) submit.click();
        } else if (e.key === "Escape" && !list.hidden) {
          e.preventDefault();
          close();
        }
      });
      input.addEventListener("blur", () => {
        if (!city && input.value.trim()) {
          const exact = INDEX.find((c) => c.key === norm2(input.value));
          if (exact) choose(exact);
          else input.setAttribute("aria-invalid", "true");
        }
        close();
      });
    }
    setHeads(heads);
  }
  function clamp2(n) {
    return Math.min(MAX2, Math.max(MIN, Math.round(n) || MIN));
  }

  // src/components/blog-filter.js
  var PARAM = "rubrique";
  function initBlogFilters(root = document) {
    const group = root.querySelector("[data-blog-filters]");
    const list = root.querySelector("[data-blog-list]");
    if (!group || !list || group.dataset.blogFilterInit) return;
    group.dataset.blogFilterInit = "1";
    const buttons = [...group.querySelectorAll("[data-filter]")];
    const items = [...list.querySelectorAll("[data-category]")].map((card) => ({
      el: card.closest(".w-dyn-item") || card,
      category: card.getAttribute("data-category")
    }));
    if (!buttons.length || !items.length) return;
    const status = document.createElement("p");
    status.className = "blog-filters_status";
    status.setAttribute("role", "status");
    group.after(status);
    const known = new Set(buttons.map((b) => b.getAttribute("data-filter")));
    const apply = (filter, { announce = true, updateUrl = true } = {}) => {
      if (!known.has(filter)) filter = "all";
      buttons.forEach((btn) => {
        const on = btn.getAttribute("data-filter") === filter;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", String(on));
      });
      let count = 0;
      items.forEach(({ el, category }) => {
        const show = filter === "all" || category === filter;
        el.hidden = !show;
        if (show) count++;
      });
      if (announce) status.textContent = count === 1 ? t("blog.countOne") : t("blog.count", { n: count });
      if (updateUrl) {
        const url = new URL(window.location.href);
        if (filter === "all") url.searchParams.delete(PARAM);
        else url.searchParams.set(PARAM, filter);
        history.replaceState(history.state, "", url);
      }
      requestScrollRefresh();
    };
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        apply(btn.getAttribute("data-filter"));
      });
      btn.addEventListener("keydown", (e) => {
        if (e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
    });
    const initial = new URLSearchParams(window.location.search).get(PARAM);
    if (initial && known.has(initial)) apply(initial, { announce: false, updateUrl: false });
  }

  // src/components/contact-form.js
  function initContactForms(root = document) {
    root.querySelectorAll("form[data-contact-form]").forEach(initContactForm);
  }
  function initContactForm(form) {
    if (form.dataset.contactInit) return;
    form.dataset.contactInit = "1";
    const radios = [...form.querySelectorAll('input[type="radio"][name="motif"]')];
    const conditional = [...form.querySelectorAll("[data-contact-motif]")];
    const update = () => {
      var _a;
      const motif2 = ((_a = radios.find((r) => r.checked)) == null ? void 0 : _a.value) || "";
      radios.forEach((r) => {
        var _a2;
        return (_a2 = r.closest(".contact-motif_option")) == null ? void 0 : _a2.classList.toggle("is-active", r.checked);
      });
      conditional.forEach((block) => {
        const motifs = block.getAttribute("data-contact-motif").split(",").map((m) => m.trim());
        const show = motifs.includes(motif2);
        block.hidden = !show;
        block.querySelectorAll("input, select, textarea").forEach((field) => field.disabled = !show);
      });
    };
    radios.forEach((r) => r.addEventListener("change", update));
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
    form.addEventListener("submit", () => fillRecap(form));
    watchSuccess(form);
  }
  function fieldText(form, name) {
    var _a;
    const fields = [...form.querySelectorAll(`[name="${name}"]`)].filter((f) => !f.disabled);
    const field = fields.find((f) => f.type !== "radio") || fields.find((f) => f.checked);
    if (!field) return "";
    if (field.type === "radio") return ((_a = field.closest("label")) == null ? void 0 : _a.textContent.trim()) || field.value;
    if (field.tagName === "SELECT") return field.value ? field.options[field.selectedIndex].text.trim() : "";
    return field.value.trim();
  }
  function fillRecap(form) {
    var _a;
    const success = (_a = form.parentElement) == null ? void 0 : _a.querySelector("[data-contact-success]");
    if (!success) return;
    const values = {
      "nom-complet": [fieldText(form, "prenom"), fieldText(form, "nom")].filter(Boolean).join(" ")
    };
    success.querySelectorAll("[data-contact-recap-value]").forEach((el) => {
      const key2 = el.getAttribute("data-contact-recap-value");
      if (el.querySelector("[data-contact-recap-value]")) return;
      const text = key2 in values ? values[key2] : fieldText(form, key2);
      el.textContent = text;
      el.hidden = !text;
    });
    success.querySelectorAll("[data-contact-recap-row]").forEach((row) => {
      row.hidden = ![...row.querySelectorAll("[data-contact-recap-value]")].some((v) => !v.hidden && v.textContent.trim());
    });
  }
  function watchSuccess(form) {
    var _a;
    const done = (_a = form.parentElement) == null ? void 0 : _a.querySelector(".w-form-done");
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

  // src/components/devis-form.js
  function initDevisForms(root = document) {
    root.querySelectorAll('form[data-form="devis"]').forEach(initDevisForm);
  }
  function initDevisForm(form) {
    var _a;
    if (form.dataset.devisInit) return;
    form.dataset.devisInit = "1";
    const formats = radioGroup(
      form,
      "data-devis-format-option",
      "data-devis-format-input",
      (o) => o.textContent.trim()
    );
    radioGroup(
      form,
      "data-devis-restauration-option",
      "data-devis-restauration-input",
      (o) => o.getAttribute("data-devis-restauration-option")
    );
    const formatSelect = form.querySelector("[data-devis-format-select]");
    const pickFormat = (value) => {
      if (!value) return;
      formats == null ? void 0 : formats.selectValue(value);
      if (formatSelect && [...formatSelect.options].some((o) => o.value === value)) {
        formatSelect.value = value;
        formatSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };
    document.addEventListener(
      "click",
      (e) => {
        var _a2, _b;
        const card = (_b = (_a2 = e.target).closest) == null ? void 0 : _b.call(_a2, "a[data-devis-format]");
        if (card) pickFormat(card.getAttribute("data-devis-format"));
      },
      true
    );
    const espace = form.querySelector("[data-venue-espace-input]");
    const espaceName = (_a = espace == null ? void 0 : espace.getAttribute("data-espace-name")) == null ? void 0 : _a.trim();
    if (espace && espaceName && !espace.value) espace.value = espaceName;
    const params = new URLSearchParams(window.location.search);
    pickFormat(params.get("format"));
    const lieu = params.get("lieu");
    const lieuSelect = form.querySelector("[data-devis-lieu]");
    if (lieu && lieuSelect && [...lieuSelect.options].some((o) => o.value === lieu)) {
      lieuSelect.value = lieu;
      lieuSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  function radioGroup(form, optionAttr, inputAttr, valueOf) {
    const options = [...form.querySelectorAll(`[${optionAttr}]`)];
    if (!options.length) return null;
    const input = form.querySelector(`[${inputAttr}]`);
    let current = options.find((o) => o.getAttribute("aria-checked") === "true") || null;
    const indicator = current ? createSegmentedIndicator(options[0].parentElement, () => current) : null;
    const select = (option, focus = false) => {
      current = option;
      indicator == null ? void 0 : indicator.move();
      options.forEach((o) => {
        const on = o === option;
        o.classList.toggle("is-active", on);
        o.setAttribute("aria-checked", String(on));
        o.tabIndex = on ? 0 : -1;
      });
      if (input) input.value = option ? valueOf(option) : "";
      if (focus && option) option.focus();
    };
    options.forEach((option, i) => {
      option.addEventListener("click", (e) => {
        e.preventDefault();
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
    if (current) select(current);
    else options.forEach((o, i) => o.tabIndex = i === 0 ? 0 : -1);
    return {
      selectValue(value) {
        const match = options.find((o) => o.getAttribute(optionAttr) === value);
        if (match) select(match);
      }
    };
  }

  // src/utils/form-labels.js
  function linkLabels(form) {
    form.querySelectorAll("label").forEach((label) => {
      var _a;
      const inside = label.querySelector("input, select, textarea");
      if (inside) {
        if (label.getAttribute("for") === "") label.removeAttribute("for");
        return;
      }
      if (label.getAttribute("for")) return;
      const field = (_a = label.parentElement) == null ? void 0 : _a.querySelector("input, select, textarea");
      if (field == null ? void 0 : field.id) label.htmlFor = field.id;
      else label.removeAttribute("for");
    });
  }
  function initFormLabels(root = document) {
    root.querySelectorAll("form").forEach(linkLabels);
  }

  // src/components/house-shape.js
  var DEFAULT_RADIUS2 = 16;
  var ZOOM = 1.05;
  var REVEAL = 0.85;
  function initHouseShapes(root = document) {
    const shapes = [];
    root.querySelectorAll("body *").forEach((el) => {
      const clip = getComputedStyle(el).clipPath;
      if (clip && clip.startsWith("polygon(") && clip.split(",").length === 5) shapes.push(el);
    });
    if (!shapes.length) return;
    const update = (el) => {
      el.classList.remove("is-house");
      const clip = getComputedStyle(el).clipPath;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const points = parsePolygon(clip, w, h);
      if (!points || !w || !h) return;
      const style = getComputedStyle(el);
      const radius = parseFloat(style.getPropertyValue("--house-radius")) || parseFloat(style.borderBottomLeftRadius) || DEFAULT_RADIUS2;
      el.style.setProperty("--house-path", `path("${roundedPath(points, radius)}")`);
      const cx = w / 2;
      const cy = h / 2;
      const small = points.map(([x, y]) => [cx + (x - cx) / ZOOM, cy + (y - cy) / ZOOM]);
      el.style.setProperty("--house-path-zoom", `path("${roundedPath(small, radius / ZOOM)}")`);
      const reveal2 = points.map(([x, y]) => [cx + (x - cx) * REVEAL, cy + (y - cy) * REVEAL]);
      el.style.setProperty("--house-path-reveal", `path("${roundedPath(reveal2, radius * REVEAL)}")`);
      el.classList.add("is-house");
    };
    shapes.forEach(update);
    if (typeof ResizeObserver !== "undefined") {
      const pending = /* @__PURE__ */ new Set();
      let frame = 0;
      const ro = new ResizeObserver((entries) => {
        entries.forEach((e) => pending.add(e.target));
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          pending.forEach(update);
          pending.clear();
        });
      });
      shapes.forEach((el) => ro.observe(el, { box: "border-box" }));
    }
  }
  function parsePolygon(clip, w, h) {
    const inner = clip.slice(clip.indexOf("(") + 1, clip.lastIndexOf(")"));
    const toPx = (v, size) => {
      v = v.trim();
      if (v.endsWith("%")) return parseFloat(v) / 100 * size;
      return parseFloat(v) || 0;
    };
    const points = inner.split(",").map((pair) => {
      const [x, y] = pair.trim().split(/\s+/);
      return [toPx(x, w), toPx(y, h)];
    });
    return points.length === 5 && points.every((p) => p.every(Number.isFinite)) ? points : null;
  }
  function roundedPath(points, radius) {
    const n = points.length;
    const r = (v) => Math.round(v * 100) / 100;
    let d = "";
    points.forEach((v, i) => {
      const prev = points[(i - 1 + n) % n];
      const next = points[(i + 1) % n];
      const d1 = Math.hypot(prev[0] - v[0], prev[1] - v[1]);
      const d2 = Math.hypot(next[0] - v[0], next[1] - v[1]);
      const k = Math.min(radius, d1 / 2, d2 / 2);
      const a = [v[0] + (prev[0] - v[0]) * k / d1, v[1] + (prev[1] - v[1]) * k / d1];
      const b = [v[0] + (next[0] - v[0]) * k / d2, v[1] + (next[1] - v[1]) * k / d2];
      d += `${i === 0 ? "M" : "L"}${r(a[0])} ${r(a[1])}Q${r(v[0])} ${r(v[1])} ${r(b[0])} ${r(b[1])}`;
    });
    return `${d}Z`;
  }

  // src/components/custom-select.js
  var GAP3 = 8;
  var MAX_PANEL_HEIGHT2 = 320;
  var uid4 = 0;
  function initCustomSelects(root = document) {
    root.querySelectorAll("form select:not([multiple]):not([data-native-select]), select[data-enhance-select]").forEach(initSelect);
  }
  function initSelect(select) {
    var _a;
    if (select.dataset.customSelect) return;
    select.dataset.customSelect = "1";
    const id = `custom-select-${++uid4}`;
    const wrap = document.createElement("div");
    wrap.className = "custom-select";
    select.before(wrap);
    wrap.appendChild(select);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${select.className} custom-select_button`;
    button.id = `${id}-button`;
    button.setAttribute("role", "combobox");
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", `${id}-list`);
    const value = document.createElement("span");
    value.className = "custom-select_value";
    button.appendChild(value);
    wrap.insertBefore(button, select);
    select.classList.add("custom-select_native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    const labels = select.id ? [...document.querySelectorAll(`label[for="${CSS.escape(select.id)}"]`)] : [];
    if (labels.length) {
      labels.forEach((label, i) => {
        if (!label.id) label.id = `${id}-label-${i}`;
        label.addEventListener("click", (e) => {
          e.preventDefault();
          button.focus();
        });
      });
      button.setAttribute("aria-labelledby", `${labels.map((l) => l.id).join(" ")} ${button.id}`);
    } else if (select.getAttribute("aria-label")) {
      button.setAttribute("aria-label", select.getAttribute("aria-label"));
    }
    const panel = document.createElement("div");
    panel.className = "search_suggest custom-select_panel";
    panel.id = `${id}-list`;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("data-lenis-prevent", "");
    panel.hidden = true;
    if (labels[0]) panel.setAttribute("aria-labelledby", labels[0].id);
    document.body.appendChild(panel);
    const scrollbar = createScrollIndicator(panel);
    let items = [];
    let active = -1;
    function build() {
      panel.innerHTML = "";
      items = [];
      [...select.children].forEach((child) => {
        if (child.tagName === "OPTGROUP") {
          const title = document.createElement("p");
          title.className = "search_suggest-title";
          title.setAttribute("role", "presentation");
          title.textContent = child.label;
          panel.appendChild(title);
          [...child.children].forEach(addOption);
        } else addOption(child);
      });
      scrollbar == null ? void 0 : scrollbar.attach();
    }
    function addOption(option) {
      if (!option.value) return;
      const index = items.length;
      const el = document.createElement("div");
      el.className = "search_suggest-item custom-select_option";
      el.id = `${id}-opt-${index}`;
      el.setAttribute("role", "option");
      el.innerHTML = '<span class="search_suggest-text"><span class="search_suggest-label"></span></span>';
      el.querySelector(".search_suggest-label").textContent = option.text;
      if (option.disabled) el.setAttribute("aria-disabled", "true");
      el.addEventListener("mousedown", (e) => e.preventDefault());
      el.addEventListener("click", () => choose(index));
      el.addEventListener("mousemove", () => highlight(index, false));
      panel.appendChild(el);
      items.push({ el, option });
    }
    function refresh() {
      const option = select.options[select.selectedIndex];
      value.textContent = option ? option.text : "";
      button.classList.toggle("is-placeholder", !option || !option.value);
      button.disabled = select.disabled;
      items.forEach(({ el, option: o }) => {
        const on = o.selected && !!o.value;
        el.classList.toggle("is-selected", on);
        el.setAttribute("aria-selected", String(on));
      });
    }
    function place() {
      if (panel.hidden) return;
      const rect = button.getBoundingClientRect();
      panel.style.top = `${rect.bottom + window.scrollY + GAP3}px`;
      panel.style.left = `${rect.left + window.scrollX}px`;
      panel.style.width = `${rect.width}px`;
      const below = window.innerHeight - rect.bottom - GAP3 - 16;
      panel.style.maxHeight = `${Math.min(MAX_PANEL_HEIGHT2, Math.max(160, below))}px`;
      scrollbar == null ? void 0 : scrollbar.update();
    }
    function highlight(index, scroll = true) {
      active = index;
      items.forEach(({ el }, i) => el.classList.toggle("is-focused", i === index));
      const item = items[index];
      if (item) {
        button.setAttribute("aria-activedescendant", item.el.id);
        if (scroll) item.el.scrollIntoView({ block: "nearest" });
      } else button.removeAttribute("aria-activedescendant");
    }
    function open2() {
      if (!panel.hidden || select.disabled) return;
      build();
      refresh();
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      wrap.classList.add("is-open");
      place();
      const selected = items.findIndex(({ option }) => option.selected);
      highlight(selected >= 0 ? selected : 0);
    }
    function close() {
      if (panel.hidden) return;
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.removeAttribute("aria-activedescendant");
      wrap.classList.remove("is-open");
    }
    function choose(index) {
      const item = items[index];
      if (!item || item.option.disabled) return;
      select.value = item.option.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      close();
      button.focus();
    }
    function step(dir) {
      if (!items.length) return;
      let i = active;
      for (let n = 0; n < items.length; n++) {
        i = (i + dir + items.length) % items.length;
        if (!items[i].option.disabled) return highlight(i);
      }
    }
    button.addEventListener("click", () => panel.hidden ? open2() : close());
    let typed = "";
    let typedTimer = 0;
    button.addEventListener("keydown", (e) => {
      const isOpen = !panel.hidden;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) open2();
        else step(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Home" || e.key === "End") {
        if (!isOpen) return;
        e.preventDefault();
        highlight(e.key === "Home" ? 0 : items.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isOpen && active >= 0) choose(active);
        else open2();
      } else if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          close();
        }
      } else if (e.key === "Tab") {
        close();
      } else if (e.key.length === 1 && /\S/.test(e.key)) {
        typed += e.key.toLowerCase();
        clearTimeout(typedTimer);
        typedTimer = setTimeout(() => typed = "", 600);
        if (!isOpen) open2();
        const i = items.findIndex(({ option }) => option.text.trim().toLowerCase().startsWith(typed));
        if (i >= 0) highlight(i);
      }
    });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!panel.hidden && !wrap.contains(e.target) && !panel.contains(e.target)) close();
      },
      true
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
    document.addEventListener("scroll", schedulePlace, { passive: true, capture: true });
    select.addEventListener("change", refresh);
    new MutationObserver(refresh).observe(select, { attributes: true, attributeFilter: ["disabled"] });
    select.addEventListener("invalid", () => button.focus());
    (_a = select.form) == null ? void 0 : _a.addEventListener("reset", () => setTimeout(refresh));
    build();
    refresh();
  }

  // src/components/mini-map.js
  var PADDING = { top: 40, bottom: 16, left: 24, right: 24 };
  function initMiniMaps(root = document) {
    const images = [...root.querySelectorAll("img[data-mini-map]")];
    if (!images.length || !("IntersectionObserver" in window)) return;
    const seen = /* @__PURE__ */ new Set();
    const pins = [];
    root.querySelectorAll("[data-pin-lat][data-pin-lng]").forEach((el) => {
      const lat = parseFloat(el.getAttribute("data-pin-lat"));
      const lng = parseFloat(el.getAttribute("data-pin-lng"));
      const key2 = `${lat},${lng}`;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || seen.has(key2)) return;
      seen.add(key2);
      pins.push([lng, lat]);
    });
    if (!pins.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        createMap2(entry.target, pins);
      })
    );
    images.forEach((img) => observer.observe(img));
  }
  async function createMap2(img, pins) {
    const maplibregl = await loadMapLibre();
    if (!maplibregl) return;
    const box = document.createElement("div");
    box.className = `${img.className} mini-map`;
    if (img.alt) {
      box.setAttribute("role", "img");
      box.setAttribute("aria-label", img.alt);
    } else box.setAttribute("aria-hidden", "true");
    img.after(box);
    img.style.display = "none";
    const canvas = document.createElement("div");
    canvas.className = "mini-map_canvas";
    box.appendChild(canvas);
    const bounds2 = new maplibregl.LngLatBounds();
    pins.forEach((p) => bounds2.extend(p));
    const map = new maplibregl.Map({
      container: canvas,
      style: STYLE_URL,
      bounds: bounds2,
      fitBoundsOptions: { padding: PADDING },
      interactive: false,
      // ni glisser, ni zoom, ni molette
      attributionControl: false
    });
    map.on("style.load", () => applyTheme(map));
    pins.forEach((lngLat) => {
      const el = document.createElement("div");
      el.className = "map-pin mini-map_pin";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = PIN_SVG;
      new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(lngLat).addTo(map);
    });
    map.once("load", () => {
      map.resize();
      map.fitBounds(bounds2, { padding: PADDING, duration: 0 });
      box.classList.add("is-ready");
    });
  }

  // src/components/line-pills.js
  var PREFIX = { M\u00E9tro: "metro-", RER: "rer-", Train: "train-", Tram: "tram-", Bus: "bus-" };
  function initLinePills(root = document) {
    root.querySelectorAll(".ligne[data-line-mode]").forEach((pill) => {
      var _a;
      const prefix = PREFIX[pill.getAttribute("data-line-mode")];
      const indice = (_a = pill.querySelector(".ligne_indice")) == null ? void 0 : _a.textContent.trim().toLowerCase();
      if (!prefix || !indice) return;
      pill.setAttribute("data-line", `${prefix}${indice}`);
    });
  }

  // src/schema/page-schema.js
  var clean = (text) => (text || "").replace(/\s+/g, " ").trim();
  function initPageSchema(root = document) {
    const existing = existingTypes();
    const blocks = [];
    if (!existing.has("BreadcrumbList")) {
      const breadcrumb = buildBreadcrumb(root.querySelector("nav.breadcrumb"));
      if (breadcrumb) blocks.push(breadcrumb);
    }
    if (!existing.has("FAQPage")) {
      const faq = buildFaq(root);
      if (faq) blocks.push(faq);
    }
    blocks.forEach((data) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify({ "@context": "https://schema.org", ...data });
      document.head.appendChild(script);
    });
  }
  function existingTypes() {
    const types = /* @__PURE__ */ new Set();
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const data = JSON.parse(s.textContent);
        [data, ...data["@graph"] || []].forEach((d) => d && d["@type"] && types.add(d["@type"]));
      } catch (e) {
      }
    });
    return types;
  }
  function buildBreadcrumb(nav) {
    if (!nav) return null;
    const items = [];
    nav.querySelectorAll("a.breadcrumb_link, .breadcrumb_current").forEach((el) => {
      const name = clean(el.textContent);
      if (!name) return;
      const href = el.matches("a") ? el.getAttribute("href") : location.pathname;
      const url = new URL(href, location.origin);
      url.pathname = url.pathname.replace(/(.)\/$/, "$1");
      items.push({ name, url: url.href });
    });
    if (items.length < 2) return null;
    return {
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url
      }))
    };
  }
  function buildFaq(root) {
    const entities = [];
    root.querySelectorAll(".faq_item").forEach((item) => {
      var _a, _b;
      if (item.closest(".w-condition-invisible, .w-dyn-empty, [hidden]")) return;
      const question = clean((_a = item.querySelector(".faq_question")) == null ? void 0 : _a.textContent);
      const answer = clean((_b = item.querySelector(".faq_answer")) == null ? void 0 : _b.textContent);
      if (!question || !answer) return;
      entities.push({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer }
      });
    });
    if (!entities.length) return null;
    return { "@type": "FAQPage", mainEntity: entities };
  }

  // src/utils/cms-links.js
  function initCmsLinks(root = document) {
    const prefix = (LOCALES[getLang()] || {}).prefix || "";
    root.querySelectorAll("a[data-cms-link][data-cms-slug]").forEach((link) => {
      const slug = link.getAttribute("data-cms-slug").trim();
      if (!slug) return;
      const base = link.getAttribute("data-cms-link").replace(/\/$/, "");
      link.setAttribute("href", `${prefix}${base}/${slug}`);
    });
  }

  // src/index.js
  onReady(() => {
    initCore();
    initNav();
    initHeroIntro();
    initHeroVideo();
    initFooter();
    initCollapses();
    initTocs();
    initCmsLinks();
    initCardLinks();
    initLinePills();
    initPageSchema();
    initComparateur();
    initComparatorBanners();
    initBlogFilters();
    initFormLabels();
    initContactForms();
    initDevisForms();
    initHouseShapes();
    initFormulas();
    initSliders();
    initPhotoSliders();
    initRoomsFilters();
    initRoomDetails();
    initCounters();
    initReveal();
    initCardsStack();
    initStackReveal();
    initBentoReveal();
    initStars();
    initWiden();
    initExpand();
    initSpacesMap();
    initSpaceMaps();
    initSpaceGalleries();
    initVisitForms();
    initSpaceSearch();
    initMiniMaps();
    initCustomSelects();
  });
  console.log(`%c[Work'n'Share] main.js \u2014 build ${"2026-11-04 15:02"}`, "color:#7dd3fc");
})();
//# sourceMappingURL=main.js.map
