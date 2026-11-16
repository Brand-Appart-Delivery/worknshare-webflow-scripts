// src/utils/cms-unwrap.js — retire les enveloppes d'une Collection List CMS
// pour que les cartes deviennent des enfants directs du bloc parent.
//
// Utile quand des cartes CMS se mêlent à des cartes fixes dans une même grille,
// un slider ([data-slider-track] : enfants directs = slides) ou un bento
// ([data-bento-reveal=":scope > *"]). Ex. : avis de l'accueil et de
// l'événementiel (note Google fixe + cartes de la collection Avis).
//
// STRUCTURE (attribut à poser dans Webflow) :
//   Collection List Wrapper [data-cms-unwrap]
//     Collection List > Collection Item > carte(s)
//   → les cartes remplacent le wrapper, dans l'ordre ; wrapper, liste et
//     éléments de liste sont retirés.
//
// Dans le Designer, poser la classe « cms-contents » (display: contents) sur le
// wrapper, la liste et l'élément de liste : la grille s'affiche comme en ligne.
// À appeler avant les sliders, le bento et les cartes cliquables.

export function initCmsUnwrap(root = document) {
  root.querySelectorAll("[data-cms-unwrap]").forEach((wrapper) => {
    const parent = wrapper.parentNode;
    if (!parent) return;
    // Éléments de cette liste seulement (pas ceux d'une liste imbriquée)
    const items = [...wrapper.querySelectorAll(".w-dyn-item")].filter(
      (item) => item.parentElement.closest(".w-dyn-list") === wrapper,
    );
    items.forEach((item) => {
      [...item.children].forEach((card) => parent.insertBefore(card, wrapper));
    });
    wrapper.remove();
  });
}
