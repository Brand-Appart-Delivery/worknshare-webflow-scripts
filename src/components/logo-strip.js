// src/components/logo-strip.js — bandeau de logos clients (composant « Bandeau logos »,
// accueil et Événementiel), rempli par la collection CMS Clients.
//
// Le défilement (CSS dans l'embed du composant) décale la piste de la moitié de
// sa largeur : il faut donc deux listes identiques. Webflow n'en a qu'une (une
// seule liste CMS à tenir) : on la copie ici, copie masquée aux lecteurs d'écran.
// Hauteur de chaque logo : _logo-strip.scss (attribut data-logo-h).
//
// STRUCTURE (Webflow) :
//   section.logo-strip[data-logo-strip]
//     .logo-strip_track
//       .logo-strip_list
//         Slot du composant, rempli sur chaque page par :
//         Collection List Clients : wrapper et élément en cms-contents,
//         liste en logo-strip_items (rangée flex, au cas où le slot ajoute une enveloppe)
//           img.logo-strip_logo[data-logo-h = champ « Hauteur du logo »]

export function initLogoStrips(root = document) {
  root.querySelectorAll("[data-logo-strip]").forEach((strip) => {
    const track = strip.querySelector(".logo-strip_track");
    const lists = track ? track.querySelectorAll(":scope > .logo-strip_list") : [];
    // Déjà deux listes (ancienne version statique) ou rien à copier
    if (lists.length !== 1 || !lists[0].querySelector("img")) return;

    const copy = lists[0].cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    copy.querySelectorAll("[role]").forEach((el) => el.removeAttribute("role"));
    copy.querySelectorAll("img").forEach((img) => img.setAttribute("alt", ""));
    track.append(copy);
  });
}
