// src/utils/scroll-indicator.js — barre de défilement maison pour une zone qui
// défile (liste de la carte), à la place de la barre native.
//
// Un trait fin à droite, accroché sous l'en-tête collant de la zone : il
// commence sous l'en-tête (pas derrière) et descend jusqu'en bas de la zone.
// La poignée suit le défilement ; on peut la glisser ou cliquer sur le trait.
// Masquée quand tout le contenu tient. Décorative pour les lecteurs d'écran :
// la zone reste défilable au clavier et à la molette.
//
// createScrollIndicator(zone, anchor) : anchor = élément collant en haut de la
// zone (l'indicateur est placé juste en dessous et le suit). Sans anchor (menu
// de suggestions, tiroir…) : un support collant de hauteur nulle est ajouté en
// tête de la zone, le trait y est accroché et reste visible en haut à droite.
// Si la zone est vidée puis remplie (rendu en innerHTML), appeler attach().

const GAP = 12; // px laissés en haut et en bas du trait
const MIN_THUMB = 32; // px, hauteur minimale de la poignée

export function createScrollIndicator(zone, anchor = null) {
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

  // Zone vidée puis remplie : on remet le support en tête
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
    // Hauteur visible (sous l'en-tête s'il y en a un)
    if (sticky) {
      // Même marge en bas qu'en haut (le support se cale sous la marge intérieure)
      const offset = track.getBoundingClientRect().top - zone.getBoundingClientRect().top - zone.clientTop;
      trackHeight = Math.max(zone.clientHeight - offset * 2, 0);
    } else {
      trackHeight = Math.max(zone.clientHeight - anchor.offsetHeight - GAP * 2, 0);
    }
    thumbHeight = Math.max(MIN_THUMB, (trackHeight * zone.clientHeight) / zone.scrollHeight);
    track.style.height = `${trackHeight}px`;
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${((trackHeight - thumbHeight) * zone.scrollTop) / max}px)`;
  };

  // Un calcul par image au plus
  let frame = 0;
  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
  }

  // Poignée visible plus fort pendant le défilement
  let idle = null;
  zone.addEventListener(
    "scroll",
    () => {
      schedule();
      track.classList.add("is-active");
      clearTimeout(idle);
      idle = setTimeout(() => track.classList.remove("is-active"), 800);
    },
    { passive: true },
  );
  window.addEventListener("resize", schedule, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(schedule);
    observer.observe(zone);
    observer.observe(anchor);
    [...zone.children].forEach((child) => observer.observe(child)); // liste filtrée, chargée…
  }

  // Glisser la poignée
  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startScroll = zone.scrollTop;
    const ratio = (zone.scrollHeight - zone.clientHeight) / Math.max(trackHeight - thumbHeight, 1);
    thumb.setPointerCapture(e.pointerId);
    track.classList.add("is-dragging");
    const move = (ev) => (zone.scrollTop = startScroll + (ev.clientY - startY) * ratio);
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

  // Clic sur le trait : la poignée vient se centrer sous le clic
  track.addEventListener("pointerdown", (e) => {
    if (e.target !== track) return;
    const y = e.clientY - track.getBoundingClientRect().top - thumbHeight / 2;
    const max = zone.scrollHeight - zone.clientHeight;
    zone.scrollTo({ top: (y / Math.max(trackHeight - thumbHeight, 1)) * max, behavior: "smooth" });
  });

  update();
  return { update, attach };
}
