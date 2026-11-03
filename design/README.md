# Work'n'Share — design system (source Figma)

Extraits de la maquette Figma `js2sDpScX8RudthohIkz3u`, page « Design (V2. 27/10) »,
le 2 novembre 2026. Lecture seule, rien n'a été modifié dans Figma.

- `tokens.json` : couleurs (13 primitives, 10 sémantiques, thèmes par offre),
  espacements, rayons, bordures, layout desktop 1440 / mobile 393.
- `typography.json` : polices, 17 styles `WS/…` desktop + mobile, balises → styles,
  texte riche du blog.
- `components.md` : 26 composants (variantes, états, tokens, classe Webflow proposée).

Chaque valeur indique si elle vient d'une variable Figma ou si elle est déduite.

## Prochaine étape : page « UI Kit » dans Webflow

À faire dans une session où le connecteur Webflow est actif, Designer ouvert
sur le site `work-share.webflow.io`.

1. **Variables Webflow** (collection « Work'n'Share ») : toutes les couleurs
   primitives, puis les sémantiques en alias ; espacements `space-*` ; rayons
   `radius-*` ; tailles de typo desktop et mobile.
2. **Polices** : Boldonse (400) et Google Sans Flex (400 à 700) depuis Google Fonts.
3. **Styles de base** (balises) : body (Texte/M, texte/principal, fond surface/page),
   h1 → h4 en Boldonse **poids 400** (Webflow met les titres en gras par défaut),
   majuscules, interlettrage en em (`-1` Figma = `-0.01em`), version mobile au
   palier ≤ 767 px ; liens soulignés ; texte riche du blog.
4. **Classes utilitaires** de typo, une par style `WS/…` (ex. `text-display-xl`),
   pour les titres visuels qui ne sont pas des Hn.
5. **Composants** de `components.md`, en commençant par les atomes : bouton,
   pastille, fil d'Ariane, champ de formulaire, option de sélecteur, FAQ,
   flèche et points de slider, pagination, filtre rubrique, puis les cartes,
   header et footer.
6. **Page `/ui-kit`** (non indexée, exclue du sitemap) avec une section par
   famille : couleurs, typographie, espacements, rayons, boutons, formulaires,
   navigation, cartes.

Conteneur : 1280 px, marges 80 px en desktop et 24 px en mobile. Paliers : 991 px
(tablette Webflow, non maquetté) et 767 px (mobile).

## Points à faire valider par le designer

- Aucun état hover, focus ou disabled n'est dessiné (bouton, champs…), et il
  n'existe pas de token d'erreur pour les formulaires.
- Pas de H1 visible sur l'accueil : le hero vidéo n'a pas de texte.
- Espacements hors échelle : 120 (sections de la home desktop), 56 (page espace
  mobile), 40 (deux en-têtes de section de la home).
- Beaucoup de valeurs en dur dans la carte article, la carte avis, le header
  et le filtre rubrique.
- Les composants utilisent surtout les couleurs primitives, pas les sémantiques.
- Les maquettes mobiles sont marquées « provisoire sur les valeurs ».
