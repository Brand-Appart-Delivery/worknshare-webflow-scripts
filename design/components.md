# Work'n'Share — Inventaire des composants UI (Figma → Webflow UI kit)

Source : fichier Figma `js2sDpScX8RudthohIkz3u`, page « Design (V2. 27/10) », sections
« Composants · Globaux » (4579:2), « Composants · Navigation » (4579:3) et, pour la pagination et le filtre, « Composants · Blog » (4579:9).
Relevé en lecture seule le 02/11/2026 (get_design_context, get_variable_defs et screenshots).

## Conventions

- **Tokens** : noms de variables Figma tels quels (`color/vert/700`, `space/16`, `radius/pill`…). Les valeurs de référence sont dans `tokens.json`, les styles texte (`WS/Label/M`…) dans `typography.json`.
- **Letter-spacing** : dans Figma, `-1` veut dire −1 %, soit `-0.01em` en CSS.
- **Valeur en dur** : valeur sans variable dans Figma, marquée ⚠︎. À tokeniser ou à garder en littéral dans Webflow.
- **Classes Webflow** : Client-First simple. Une classe de base `composant`, des combo classes `is-variante`, des enfants `composant_element`. Pour les états : `is-active`, `is-open`, `is-disabled`, plus les pseudo-états Webflow (hover, focus).
- **Tokens sémantiques présents dans le fichier** : `action/primaire`, `action/sur-primaire`, `bordure/discrete`, `surface/carte`, `surface/page`, `texte/principal`, `texte/marque`. Ils restent peu utilisés : la plupart des composants pointent directement sur les primitives `color/*`.
- **Icônes** : bibliothèque Hugeicons Free (MIT), composants `Icône/<Catégorie>/<nom>`. Pictos de marque : `WS/Picto/*`.
- **Polices** : Google Sans Flex (texte, labels), Boldonse (display, toujours en capitales).

---

## 1. Bouton — `WS/Bouton` (3786:698)

**Classe Webflow** : `button` + combo `is-secondary`, `is-lime`, `is-outline-light`, `is-bordeaux`, `is-blue`, `is-brown`, `is-outline-blue`, `is-outline-brown`, `is-outline-bordeaux`, `is-pink`, `is-outline-pink`, `is-blue-light`, `is-yellow`. Enfants : `button_icon` (gauche/droite) et `button_label`.

**Propriétés** : `Style` (14 valeurs), `Icône gauche` (booléen), `Icône droite` (booléen), `Libellé` (texte).

**Structure** :
- Flex en ligne, `gap: space/8`, `padding: space/12 space/24`, `radius/pill`.
- Hauteur rendue 43 px avec une icône de 18 px.
- Texte : `WS/Label/M` (Google Sans Flex Medium 16 / 1.2 / −1 %).
- Icônes 18×18 ⚠︎ (taille sans token). Par défaut `Icône/Navigation/arrow-right-02`, et `Icône/Contact/call` dans le header.
- Contour 1,5 px ⚠︎ pour les variantes « Contour » (épaisseur sans token).

| Style (variante) | Classe | Fond | Contour | Texte / icône |
|---|---|---|---|---|
| Primaire (défaut) | `button` | `color/vert/700` | — | `color/vert/100` |
| Secondaire | `button is-secondary` | transparent | 1,5 px `color/vert/700` | `color/vert/700` |
| Lime | `button is-lime` | `color/vert/100` | — | `color/vert/900` |
| Contour clair (sur fond foncé) | `button is-outline-light` | transparent | 1,5 px `color/vert/100` | `color/vert/100` |
| Bordeaux | `button is-bordeaux` | `color/bordeaux/900` | — | `color/rose/300` |
| Bleu | `button is-blue` | `color/bleu/900` | — | `color/bleu/300` |
| Marron | `button is-brown` | `color/marron/900` | — | `color/jaune/400` |
| Contour bleu | `button is-outline-blue` | transparent | 1,5 px `color/bleu/900` | `color/bleu/900` |
| Contour marron | `button is-outline-brown` | transparent | 1,5 px `color/marron/900` | `color/marron/900` |
| Contour bordeaux | `button is-outline-bordeaux` | transparent | 1,5 px `color/bordeaux/900` | `color/bordeaux/900` |
| Rose | `button is-pink` | `color/rose/300` | — | `color/bordeaux/900` |
| Contour rose | `button is-outline-pink` | transparent | 1,5 px `color/rose/300` | `color/rose/300` |
| Bleu clair | `button is-blue-light` | `color/bleu/300` | — | `color/bleu/900` |
| Jaune | `button is-yellow` | `color/jaune/400` | — | `color/marron/900` |

**États** : aucun état hover, focus, pressed ni disabled n'est dessiné. À définir côté Webflow, par exemple une opacité ou une inversion légère au hover et un `outline` visible au focus.

**Usage annoté** :
- Bleu clair : action sur fond `bleu/900` (bureau privatif).
- Jaune : action sur fond `marron/900` (bureaux opérés).
- Les couleurs suivent le code des offres : vert = coworking / défaut, bleu = bureau privatif, jaune/marron = bureaux opérés, rose/bordeaux = salles et événementiel.

---

## 2. Pastille (tag) — `WS/Pastille` (3786:730)

**Classe Webflow** : `tag` + combo `is-outline`, `is-outline-light`, `is-pink`, `is-blue`, `is-yellow`, `is-coworking`, `is-office`, `is-managed-office`, `is-rooms`, `is-availability`, et `is-compact` pour la taille. Enfants : `tag_icon` et `tag_label`.

**Propriétés** : `Style` (11 valeurs), `Taille` (Standard / Compacte), `Icône` (booléen, styles génériques seulement), `Libellé`.

**Structure** :
- Flex en ligne, `radius/pill`.
- `padding: 6px ⚠︎` en vertical, `space/12` en horizontal (Standard) ou `space/8` (Compacte).
- Hauteur 29 px.
- `gap: space/4`, ou `space/8` pour Disponibilité.
- Texte : `WS/Label/S` (Medium 14 / 1.2 / −1 %).
- Icône générique 14 px. Picto d'offre 16 px en Standard, 14 px en Compacte ⚠︎.

| Style | Taille | Fond | Contour | Texte | Icône / picto |
|---|---|---|---|---|---|
| Lime (défaut) | Standard | `color/vert/100` | — | `color/vert/700` | icône optionnelle |
| Contour clair | Standard | transparent | 1 px `color/vert/100-a24` | `color/vert/100` | optionnelle |
| Rose | Standard | `color/rose/300` | — | `color/bordeaux/900` | optionnelle (location-01) |
| Contour | Standard | transparent | 1 px `color/vert/700-a16` | `color/vert/700` | optionnelle |
| Bleu | Standard | `color/bleu/300` | — | `color/bleu/900` | optionnelle |
| Jaune | Standard | `color/jaune/400` | — | `color/marron/900` | optionnelle |
| Coworking | Std / Compacte | `color/vert/100` | — | `color/vert/700` | `WS/Picto/Coworking` |
| Bureaux | Std / Compacte | `color/bleu/300` | — | `color/bleu/900` | `WS/Picto/Bureaux 1 à 4` |
| Bureaux opérés | Std / Compacte | `color/jaune/400` | — | `color/marron/900` | `WS/Picto/Bureaux opérés` |
| Salles | Std / Compacte | `color/rose/300` | — | `color/bordeaux/900` | `WS/Picto/Salle de réunion` |
| Disponibilité | Std / Compacte | `color/blanc` | — | `color/vert/700` | point « en ligne » 10 px + halo ⚠︎ |

**États** : non interactif, sauf dans le megamenu, où il n'a pas de lien (ADR-014).

**Notes** :
- Disponibilité : point vert et halo flou sans token. La description précise qu'un vert signal plus vif reste à demander à la DA.
- La taille Compacte n'existe que pour les 5 styles d'offre.

---

## 3. Logo — `WS/Logo` (3786:669)

**Classe Webflow** : `logo` + combo `is-light`. Enfants : `logo_mark` (SVG) et `logo_wordmark`.

**Propriété** : `Couleur` = Vert | Lime.

**Structure** :
- Flex vertical centré, `gap: 4px ⚠︎`, 80×49.
- Monogramme « WS » en SVG 80×32.
- Wordmark « WORK & SHARE » : Boldonse 9 px / 1.4, capitales. ⚠︎ Aucun style texte associé.

| Couleur | Classe | Monogramme + wordmark |
|---|---|---|
| Vert (défaut, fonds clairs) | `logo` | `color/vert/700` |
| Lime (fonds foncés, footer) | `logo is-light` | `color/vert/100` |

**Recommandation** : exporter le logo complet en un seul SVG plutôt que de recomposer le wordmark en texte.

---

## 4. Fil d'Ariane — `WS/Fil d'Ariane` (3920:2922)

**Classe Webflow** : `breadcrumb`. Enfants : `breadcrumb_link`, `breadcrumb_separator` et `breadcrumb_current` (`aria-current="page"`).

**Propriétés** : `Niveau 1` (texte), `Niveau 2` (texte), `Niveau 2 visible` (booléen), `Page courante` (texte, champ CMS ville), `Niveau 3` (booléen), `Libellé niveau 3`.

**Structure** :
- Flex en ligne, `gap: space/8`, couleur `color/vert/700`.
- Liens : `WS/Label/S`.
- Séparateur : caractère « › » en `WS/Label/S`.
- Page courante (et niveau 3) : `WS/Label/S-fort` (SemiBold 14 / 1.2 / 0).

**États** : le hover des liens n'est pas dessiné (soulignement suggéré).

**Comportement** : fil à deux niveaux possible (Accueil › Événementiel) avec `Niveau 2 visible = false`.

---

## 5. Pictogrammes de marque — `WS/Picto/*`

- 3804:1718 Bureaux 1 à 4
- 3804:1721 Salle de réunion
- 3804:1730 Coworking
- 3806:1742 Bureaux opérés (proposition)

**Classe Webflow** : `picto` + combo de taille `is-16`, `is-14` (le défaut fait 96 px). Le SVG est inline et utilise `currentColor`.

| Élément | Valeur |
|---|---|
| Taille du master | 96×96 (réutilisé en 16 et 14 dans les pastilles, en 14 dans Lien ville) |
| Couleur | variable, `color/vert/100` par défaut. La couleur est portée par le parent (texte de la pastille, ou `color/vert/700` dans Lien ville) |
| Style | trait d'environ 11 sur une grille de 229, angles droits à l'extérieur, arrondis à l'intérieur |

⚠︎ **Bureaux opérés** est une *proposition* non validée par la DA. À remplacer si la DA livre une autre version.

---

## 6. Signalétique transport — `WS/Ligne · mode` (3966:3678)

**Classe Webflow** : `transport-mode` + combo `is-bus` et `is-dark`. Enfant : `transport-mode_label` (ou icône train).

**Propriétés** : `Mode` = Métro | Train | Bus | RER | Tram, `Fond` = Clair | Foncé.

**Structure** :
- 24×24 (`forme/taille`), contour `forme/trait` (1,5 px).
- Métro, Train, RER, Tram : cercle `forme/rayon-cercle` (12) avec « M », icône train 16 px (`Icône/Lieux/train-01`), « RER » ou « T ».
- Bus : rectangle h 24, `padding-x: space/4`, `forme/rayon-arrondi` (6), « BUS ».
- Texte : `Transport/Indice` (Bold 14 / 1) pour M et T, `Transport/Mode bus` (Bold 9 / 1) pour BUS et RER. Famille `font/texte`.

| Fond | Fond pastille | Contour | Texte |
|---|---|---|---|
| Clair | `ligne/texte-blanc` | `ligne/texte-noir` | `ligne/texte-noir` |
| Foncé | transparent | `ligne/texte-blanc` | `ligne/texte-blanc` |

Le style est une approximation de la signalétique IDFM/RATP, hors DA (ADR-018).

## 7. Indice de ligne — `WS/Ligne · indice` (3966:3679)

**Classe Webflow** : `transport-line` + combo `is-train`, `is-bus`. La couleur de fond vient d'un attribut, d'une variable CSS ou du CMS par ligne.

**Propriétés** : `Mode` = Métro | Train | Bus, `Ligne` (texte).

| Mode | Forme | Rayon | Fond par défaut | Texte |
|---|---|---|---|---|
| Métro | cercle 24 | `forme/rayon-cercle` (12) | `ligne/metro-13` | `ligne/texte-noir`, `Transport/Indice` |
| Train | carré 24 | `forme/rayon-arrondi` (6) | `ligne/train-l` | idem |
| Bus | h 24, `padding-x: space/8` | `forme/rayon-bus` (2) | `ligne/bus-54` | idem |

**Notes** :
- RER (A, B, C, D) et tram (T2) utilisent la forme Train, avec un fond surchargé par la variable de la ligne.
- Les couleurs viennent de la collection « Transport · IDFM ».
- Dans Webflow, prévoir un champ CMS couleur par ligne, ou une variable par ligne.

---

## 8. Fait chiffré — `WS/Fait` (3920:2934)

**Classe Webflow** : `fact`. Enfants : `fact_value` et `fact_label`.

**Propriétés** : `Valeur` (texte), `Libellé` (texte).

**Structure** :
- Flex vertical, `gap: space/4`.
- Valeur : `WS/Display/M` (Boldonse 28 / 1.3 / −1 %, capitales), `color/vert/700`.
- Libellé : `WS/Texte/S` (Regular 14 / 1.45), `color/vert/900`.

Composé dans `WS/Ligne de faits` (desktop et mobile). Ce composant n'a pas été détaillé ici.

---

## 9. Question FAQ — `WS/Question FAQ` (3921:3049)

**Classe Webflow** : `faq_item` + combo `is-rooms` (thème Salles) et `is-open` (état). Enfants : `faq_question` (H3 + bouton), `faq_toggle`, `faq_toggle-icon` et `faq_answer`.

**Propriétés** : `État` = Fermé | Ouvert, `Thème` = Défaut | Salles, `Question`, `Réponse`.

**Structure** :
- Carte : fond `surface/carte`, `radius/m` (16), `padding: space/24 space/32`, `gap: space/12`.
- Master à 840 px fixe ⚠︎ ; l'instance s'étire (fill).
- Ligne de question : flex, `gap: space/24`.
- Question : `WS/Titre/Carte` (SemiBold 20 / 1.3 / −1 %).
- Réponse : `WS/Texte/M` (Regular 16 / 1.5 / −1 %).
- Bouton de dépliage : rond 36×36 ⚠︎, `radius/pill`, icône 18 px `Icône/Navigation/arrow-down-01`, tournée de 180° à l'ouverture.

| Thème × État | Texte | Fond du bouton | Icône |
|---|---|---|---|
| Défaut, Fermé | `color/vert/900` | `color/vert/100` | chevron bas, couleur foncée |
| Défaut, Ouvert | `color/vert/900` | `color/vert/700` | chevron haut, couleur claire |
| Salles, Fermé | `color/bordeaux/900` | `color/rose/300` | chevron bas |
| Salles, Ouvert | `color/bordeaux/900` | `color/bordeaux/900` | chevron haut |

**Comportement** :
- Accordéon : un clic sur la ligne ou le bouton ouvre ou ferme l'item (`aria-expanded`).
- Champ CMS `faq` (référence multiple).
- Le hover et le focus du bouton ne sont pas dessinés.

## 10. Accordéon FAQ — `WS/Accordéon FAQ` (4419:36956)

**Classe Webflow** : `faq_list` + combo `is-rooms`.

**Propriété** : `Thème` = Défaut | Salles.

**Structure** : pile de 5 `WS/Question FAQ`, flex vertical, `gap: space/12`, largeur 700. La première question est ouverte, les autres fermées.

**Comportement annoté** : chaque question est un **H3**. Ajouter les données structurées **FAQPage**.

---

## 11. Option de sélecteur (segmented / chip) — `WS/Option de sélecteur` (4194:518)

**Classe Webflow** : `segmented_option` + combo de fond `is-on-light`, `is-neutral`, `is-neutral-bordered`, et `is-active` pour l'état. Pour les formulaires : radio stylé (`label` + `input` masqué).

**Propriétés** : `État` = Inactif | Actif, `Fond` = Foncé | Clair | Neutre | Neutre bordé, `Libellé`.

**Structure** :
- `padding: space/8 space/16`, `radius/pill`, hauteur 33.
- Texte inactif : `WS/Label/S`.
- Texte actif : `WS/Label/S-fort`.

| Fond | État | Fond option | Contour | Texte |
|---|---|---|---|---|
| Foncé (sur bordeaux) | Inactif | transparent | — | `color/beige/50` |
| Foncé | Actif | `color/rose/300` | — | `color/bordeaux/900` (S-fort) |
| Clair (sur carte crème) | Inactif | `color/blanc` | — | `color/bordeaux/900` |
| Clair | Actif | `color/rose/300` | — | `color/bordeaux/900` (S-fort) |
| Neutre | Inactif | `color/beige/50` | — | `color/vert/900` |
| Neutre | Actif | `color/vert/700` | — | `color/vert/100` (S-fort) |
| Neutre bordé | Inactif | `color/blanc` | 1 px `color/vert/700-a16` | `color/vert/900` |
| Neutre bordé | Actif | `color/vert/700` | — | `color/vert/100` (S-fort) |

**Usage** :
- « Combien serez-vous ? » et oui/non du formulaire de devis, dans le code couleur Salles.
- « Toutes les rubriques » du blog en Neutre bordé.
- Le hover et le focus ne sont pas dessinés.

---

## 12. Champ de formulaire — `WS/Champ de formulaire` (4194:539)

**Classe Webflow** : `form_field` (wrapper), `form_label`, `form_input` (et `form_input is-select` pour une liste) + combo de thème `is-rooms`.

**Propriétés** : `Type` = Saisie | Liste, `Contenu` = Indication | Rempli, `Thème` = Salles | Neutre, `Libellé`, `Valeur`.

**Structure** :
- Wrapper : flex vertical, `gap: space/8`. Master 300 px fixe, instance en fill.
- Libellé : `WS/Label/S`.
- Champ : fond `color/blanc`, `radius/s` (8), `padding: space/12 space/16`, `gap: space/8`, hauteur 48.
- Valeur : `WS/Texte/M`.
- Liste : chevron 20 px ⚠︎ `Icône/Navigation/arrow-down-01`.

| Thème | Libellé et valeur | Contour du champ | Placeholder (Indication) |
|---|---|---|---|
| Salles | `color/bordeaux/900` | aucun | même couleur, opacité 55 % ⚠︎ |
| Neutre | `color/vert/900` | 1 px `color/vert/700-a16` | même couleur, opacité 55 % ⚠︎ |

**États manquants** : focus, erreur, désactivé, aide ou message. Ils sont à concevoir. Proposition :
- Focus : contour `color/vert/700` (ou `bordeaux/900` en thème Salles).
- Erreur : couleur d'alerte. Il n'existe pas de token d'erreur dans le fichier.

---

## 13. Flèche de slider — `WS/Flèche slider` (4211:15996)

**Classe Webflow** : `slider_arrow` + combo `is-on-light`, plus `is-disabled`. Direction : `is-prev` ou `is-next`, ou la même icône retournée.

**Propriétés** : `Sens` = Précédent | Suivant, `Fond` = Photo | Clair, `État` = Actif | Désactivé.

**Structure** : rond 56×56 ⚠︎, `radius/pill`, icône 24 px. `Icône/Navigation/arrow-right-02` pour Suivant ; la même icône en miroir ou `arrow-left-02` pour Précédent.

| Fond × État | Fond | Contour | Icône |
|---|---|---|---|
| Photo, Actif | `color/beige/50` | — | `color/bordeaux/900` (annoté) |
| Clair, Actif | `action/primaire` | — | `action/sur-primaire` |
| Clair, Désactivé | transparent | 1 px `bordure/discrete` | `bordure/discrete` |

**Notes** :
- Fond=Photo n'a pas d'état Désactivé.
- Le hover n'est pas dessiné.
- Désactivé correspond au début ou à la fin du défilement.

## 14. Point de pagination (slider) — `WS/Point de pagination` (4211:15999)

**Classe Webflow** : `slider_dot` + `is-active`. Pour un slider Webflow natif, styler `w-slider-dot` et `w-active`.

| État | Taille | Fond | Rayon |
|---|---|---|---|
| Actif | 24×8 ⚠︎ | `color/rose/300` | `radius/pill` |
| Inactif | 8×8 ⚠︎ | `color/beige/50` | `radius/pill` |

Conçu pour un fond photo ou foncé. Il n'existe pas de variante sur fond clair.

---

## 15. Élément de liste (inclus / en plus) — `WS/Élément de liste` (3921:2938)

**Classe Webflow** : `list-item` + combo `is-extra`, plus `is-placeholder`. Enfants : `list-item_bullet`, `list-item_icon` et `list-item_text`.

**Propriétés** : `Marque` = Inclus | En plus, `Placeholder` (booléen), `Texte`.

**Structure** :
- Flex, `gap: space/8`, alignement en haut.
- Puce : rond 24 ⚠︎, `radius/pill`, icône 14 px.
- Texte : `WS/Texte/M`, `color/vert/900`.

| Marque | Fond de la puce | Icône |
|---|---|---|
| Inclus | `color/vert/100` | `Icône/Navigation/tick-02` |
| En plus | `color/jaune/400` | `Icône/Services/star` |

`Placeholder=true` : texte à 45 % d'opacité ⚠︎. C'est un état éditorial provisoire (libellé à recueillir), **à ne pas reproduire en production**.

---

## 16. Lien ville (navigation) — `WS/Lien ville` (4605:15161)

**Classe Webflow** : `nav_city-link` + combo `is-icon` (mobile). Il contient un `tag is-rooms is-compact`, qui **n'est pas un lien**.

**Propriétés** : `Style` = Pastille | Icône, `Salles` (booléen), `Ville`.

| Style | Contexte | Structure | Texte |
|---|---|---|---|
| Pastille | megamenu desktop | flex, `gap: space/8`. Ville + `WS/Pastille` Salles, Compacte (sans lien, ADR-014) | `WS/Label/M`, `color/vert/900` |
| Icône | menu mobile ouvert | cellule fixe 160,5 × 44 (zone de tap), `gap: space/4`. Ville + picto Salle de réunion 14 px `color/vert/700` | `WS/Label/S`, `color/vert/900` |

**Comportement** :
- Lien vers `/espaces/<ville>/`.
- Le picto mobile porte un `aria-label` « Salles de réunion et d'événement ».
- Le hover n'est pas dessiné.

---

## 17. Pagination (liste blog) — `WS/Pagination` (4355:37757)

**Classe Webflow** : `pagination`. Il contient `slider_arrow is-on-light` (préc./suiv.) et `pagination_number`.

**Structure** : flex, `gap: space/8`, dans l'ordre : flèche Précédent (Clair), numéros 1 à 3, flèche Suivant (Clair).

**Comportement annoté** :
- Pagination native Webflow (liens crawlables), sans chargement infini.
- 24 articles = 1 à la une + 9 par page, soit 3 pages.
- La flèche Précédent est désactivée sur la page 1.

## 18. Numéro de page — `WS/Numéro de page` (4355:37756)

**Classe Webflow** : `pagination_number` + `is-active` (`aria-current="page"`).

| État | Taille | Fond | Contour | Texte |
|---|---|---|---|---|
| Actif (page courante) | 56×56 ⚠︎, `radius/pill` | `color/vert/700` | — | `color/vert/100`, `WS/Label/M` |
| Inactif | 56×56 | transparent | 1 px `color/vert/700-a16` | `color/vert/700`, `WS/Label/M` |

Chaque numéro est un `<a href>` vers `?…_page=N`. Le hover n'est pas dessiné.

---

## 19. Filtre rubrique (blog) — `WS/Filtre rubrique` (4369:14628)

**Classe Webflow** : `filter-chip` + combo de couleur `is-yellow`, `is-pink`, `is-lime`, `is-blue`, `is-green-light`, plus `is-active`. Enfants : `filter-chip_icon` et `filter-chip_label`.

**Propriétés** : `Couleur` = Jaune | Rose | Lime | Bleu | Vert clair, `État` = Actif | Inactif, `Icône` (swap, par défaut `Icône/Lieux/location-01`), `Libellé`.

**Structure** :
- Contour 1 px, `radius/pill`.
- `padding: 8px 16px` ⚠︎ (en dur, alors que `space/8` et `space/16` existent).
- `gap: 6px` ⚠︎ (pas de `space/6`).
- Hauteur 35.
- Icône 14 px, texte `WS/Label/S`.

| Couleur | Actif : fond = contour | Actif : texte et icône | Inactif : texte et icône |
|---|---|---|---|
| Jaune (Bureaux flexibles) | `color/marron/900` | `color/jaune/400` | `color/marron/900` |
| Rose (Événementiel) | `color/bordeaux/900` | `color/rose/300` | `color/bordeaux/900` |
| Lime (Coulisses) | `color/vert/700` | `color/vert/100` | `color/vert/700` |
| Bleu | `color/bleu/900` | `color/bleu/300` | `color/bleu/900` |
| Vert clair | `color/vert/100` | `color/vert/700` | `color/vert/700` |

Inactif, toutes couleurs : fond `color/blanc`, contour `color/vert/700-a16`.

Annoté : la forme, les icônes et les couleurs sont identiques à la pastille de rubrique de `WS/Carte article · couleur`.

---

# Molécules (structure + tokens)

## 20. Header — `WS/Header` (4107:1606)

**Classe Webflow** : `navbar` (composant Webflow), avec `navbar_menu`, `navbar_link`, `navbar_dropdown`, `navbar_logo`, `navbar_actions` + combo `is-open`.

**Variantes** : `CTA` = Contact + numéro (seule valeur), `Menu` = Fermé | Nos espaces, `Écran` = Desktop | Mobile.

**Desktop** (1440×97) :
- Fond `color/beige/50`, ou `color/blanc` quand le menu « Nos espaces » est ouvert.
- `padding: space/24 80px ⚠︎`, `justify: space-between`.
- Navigation à gauche : largeur 540 ⚠︎, `gap: 32px ⚠︎`. Liens en `WS/Label/M`, `color/vert/700` : Bureaux flexibles, Événementiel, Nos espaces + `arrow-down-01` 16 px, Blog.
- Logo `WS/Logo` Vert au centre.
- Actions à droite (540 ⚠︎, `gap: 12px ⚠︎`) : `button is-secondary` (icône `Icône/Contact/call`, « 01 89 71 74 72 ») et `button` « Nous contacter ».

**État Nos espaces ouvert** :
- L'item « Nos espaces » devient une pastille `color/vert/100`, chevron vers le haut.
- Ouvre `WS/Megamenu` (4225:895), non détaillé ici.

**Mobile** (393×81) :
- Logo + burger (fond `color/beige/50`).
- Ouvert (393×845) : fond `color/blanc`, logo + croix.
- Liste de liens séparés par `color/vert/700-a16`, flèches `arrow-right-02`.
- « Nos espaces » en accordéon : titres de département en `WS/Display/XS` `color/vert/700`, villes en `WS/Lien ville`, « Voir la carte → ».
- Barre basse : `button is-secondary` « Appeler » et `button` « Contact ».

**Tokens** :
- Couleurs : `color/beige/50`, `color/blanc`, `color/vert/700`, `color/vert/900`, `color/vert/100`, `color/vert/700-a16`, `color/rose/300`, `color/bordeaux/900`.
- Espacements : `space/4`, `space/8`, `space/12`, `space/16`, `space/24`.
- Rayon : `radius/pill`.
- Styles texte : `WS/Label/M`, `WS/Label/S`, `WS/Label/S-fort`, `WS/Display/XS`.

## 21. Footer — `WS/Footer` (4208:16022)

**Classe Webflow** : `footer` + combo `is-event`. Enfants : `footer_top`, `footer_brand`, `footer_col`, `footer_col-title`, `footer_link`, `footer_bottom`.

**Variantes** : `Thème` = Défaut | Événementiel, `Écran` = Desktop | Mobile.

**Desktop** (1280×468) :
- `padding-top: space/96`, contenu de 1120 de large, marges latérales 80 ⚠︎.
- Haut : la colonne Marque (280 de large) contient le logo Lime, une baseline en `WS/Texte/S` et un bouton (Lime ou Rose).
- Haut, suite : 5 colonnes de liens de 104 de large, `gap: space/64`. Titres en `WS/Display/XS`, liens en `WS/Label/S`, espacement vertical de 29 (12 + 17) ⚠︎.
- Bas : `padding-top: space/48`, mentions en `WS/Label/XS`. « © 2026 Work & Share » à gauche, « Politique de confidentialité » à droite.

**Mobile** (393×975) : les colonnes s'empilent (Nos espaces sur 2 colonnes).

| Thème | Fond | Titres de colonne + logo | Liens et texte | Bouton |
|---|---|---|---|---|
| Défaut | `color/vert/900` | `color/vert/100` | `color/beige/50` | `button is-lime` |
| Événementiel | `color/bordeaux/900` | `color/rose/300` | `color/beige/50` | `button is-pink` |

Séparateur du bas : `color/vert/100-a24`.

## 22. Carte espace — `WS/Carte espace` (4012:1559)

**Classe Webflow** : `space-card` + combo `is-equal-height`. Enfants : `space-card_image`, `space-card_city`, `space-card_trip`, `space-card_desc`, `space-card_access`, `space-card_tags`.

**Variantes et propriétés** : `Hauteur` = Libre | Égale, booléens `Pictos ligne`, `Accès en bas`, `Trajet`.

**Structure** (296 de large) :
- Flex vertical, `gap: space/12`.
- Photo 296×320 découpée en **forme de maison** (masque SVG, ⚠︎ à reproduire en SVG ou `clip-path`).
- Ville : `WS/Display/S` (Boldonse 18, capitales), `color/vert/700`.
- Trajet (optionnel) : `WS/Label/S`, `texte/marque`.
- Description : `WS/Texte/S`, `color/vert/900`.
- Accès : `gap: 6px ⚠︎`, icône `Icône/Lieux/train-01` 16 px, ou bien `transport-mode` + `transport-line`. Texte en `WS/Label/XS`, `color/vert/700`.
- Offres : rangée de `tag is-outline`, `gap: 6px ⚠︎`.

**Égale** : un ressort pousse l'accès en bas, pour des cartes de même hauteur dans une grille.

**Hover** : non dessiné (carte cliquable vers `/espaces/<ville>/`).

## 23. Carte bento — `WS/Carte bento` (4005:1599)

**Classe Webflow** : `bento-card` + combo `is-large`, `is-medium` (la Petite sert de défaut). Enfants : `bento-card_image`, `bento-card_overlay`, `bento-card_figure`, `bento-card_caption`.

**Variantes** : `Taille` = Grande (620×350) | Moyenne (318×248) | Petite (318×163).

**Propriétés** : `Chiffre`, `Légende`, `Pastille` (booléen).

**Structure** :
- `padding: space/32`, `radius/l` (24), photo en fond (cover).
- Voile en dégradé `bordeaux/900` de 0 % (à 35 %) à 92 % ⚠︎ (littéral, sans variable de dégradé).
- `justify: space-between` : pastille `tag is-pink` (icône location-01) en haut, texte en bas avec `gap: space/12`.
- Chiffre : `WS/Display/L` (Boldonse 44, Grande) ou `WS/Display/S` (Petite).
- Légende : `WS/Texte/S`, couleur `color/beige/50`.

## 24. Carte article · couleur — `WS/Carte article · couleur` (3820:2227)

**Classe Webflow** : `article-card` + combos de couleur `is-yellow`, `is-pink`, `is-lime`, `is-blue`, `is-green-light`, `is-neutral`, de fond `is-white`, et de format `is-banner`. Enfants : `article-card_image`, `article-card_meta`, `article-card_category`, `article-card_time`, `article-card_title`, `article-card_excerpt`, `article-card_link`.

**Variantes** :
- `Couleur` = Jaune | Rose | Lime | Bleu | Neutre | Vert clair.
- `Format` = Carte (400×472) | Bandeau (1280×240).
- `Fond` = Couleur | Blanc.

**Propriétés** : `Afficher icône rubrique`, `Picto temps`, `Temps à droite`, `Extrait visible`.

**Structure (Carte, Jaune / Couleur)** :
- Fond `color/jaune/400`, `radius 24 ⚠︎` (en dur alors que `radius/l` existe), `padding: 16 16 24 ⚠︎`, `gap: 16 ⚠︎`.
- Photo h 240, `radius 16 ⚠︎`.
- Contenu : `padding-x 8 ⚠︎`, `gap 12 ⚠︎`.
- Méta : pastille rubrique sur fond `color/marron/900`, texte `color/jaune/400` en `WS/Label/S`, `padding 6/12 ⚠︎`, `radius 999 ⚠︎`. ⚠︎ C'est un cadre recréé à la main, **pas une instance** de `WS/Pastille` ni de `WS/Filtre rubrique`. On y trouve aussi le temps de lecture en `WS/Label/XS`, avec l'icône `Icône/Offres/clock-01` en option.
- Titre : `WS/Titre/Carte`.
- Extrait : `WS/Texte/S`, 2 lignes avec ellipse.
- Lien « Lire l'article » : `WS/Label/S-fort` + `arrow-right-02` 18. Texte en `color/marron/900`.

**Couleurs par rubrique** : Jaune = Bureaux flexibles (`jaune/400` / `marron/900`), Rose = Événementiel (`rose/300` / `bordeaux/900`), Lime = Coulisses (`vert/100` / `vert/700`), Bleu (`bleu/300` / `bleu/900`).

**Hover** : non dessiné.

## 25. Carte avis — `WS/Carte avis` (4166:556)

**Classe Webflow** : `review-card` + combo d'offre `is-office`, `is-managed-office`, `is-rooms` (Coworking par défaut). Enfants : `review-card_stars`, `review-card_quote`, `review-card_avatar`, `review-card_author`, `review-card_role`.

**Variantes** : `Offre` = Coworking | Bureau privatif | Bureaux opérés | Salles (couleur de l'offre du résident).

**Propriétés** : `Citation`, `Auteur`, `Profil`, `Initiales`, `Logo` (booléen).

**Structure** (302×340) :
- `padding 32 ⚠︎`, `radius 24 ⚠︎`, `justify: space-between`.
- 5 étoiles `Icône/Services/star` 18 px, `gap 4 ⚠︎`.
- Citation : `WS/Texte/M`.
- Bulle 44 px, `radius 22 ⚠︎`, initiales en `WS/Label/S-fort`.
- Auteur : `WS/Label/S-fort`. Profil : `WS/Texte/S`.
- Gaps internes 16, 12 et 2 ⚠︎.

| Offre | Fond | Texte | Bulle (fond / texte) |
|---|---|---|---|
| Coworking | `color/vert/100` | `color/vert/700` | `color/vert/700` / `color/vert/100` |
| Bureau privatif | `color/bleu/300` | `color/bleu/900` | `bleu/900` / `bleu/300` |
| Bureaux opérés | `color/jaune/400` | `color/marron/900` | `marron/900` / `jaune/400` |
| Salles | `color/rose/300` | `color/bordeaux/900` | `bordeaux/900` / `rose/300` |

Annoté (ADR-009) : citation attribuée, **jamais d'`AggregateRating`**.

## 26. Bandeau logos — `WS/Bandeau logos` (4525:318)

**Classe Webflow** : `logo-strip`. Enfants : `logo-strip_heading`, `logo-strip_track` et `logo-strip_logo` (collection CMS « Clients »).

**Variantes** : `Écran` = Desktop (1440×153) | Mobile (393×148). Propriétés `Phrase`, `Phrase visible`.

**Structure** :
- Flex vertical centré, `gap: space/24`, `padding: space/32` en haut et `space/48` en bas.
- Phrase : `WS/Label/M`, `texte/principal`.
- Piste : `gap: space/64`, logos monochromes `color/vert/900` de 18 à 30 px de haut.

**Comportement annoté** :
- Défilement continu lent en CSS, **pause au survol**.
- Ligne fixe si `prefers-reduced-motion`.
- Logos non cliquables.
- Données : collection CMS « Clients » (nom, logo SVG, ordre).

---

# Hors périmètre ou non détaillés

- **Composants de section ou de page** : `WS/Megamenu`, `WS/Ligne de faits`, `WS/Avis réseau`, `WS/Carte histoire résident`, `WS/Bloc hôte`, `WS/Module carte · liste`, `WS/Recherche de proximité`, `WS/Carte espace · liste`, `WS/Fiche lieu · carte`, `WS/Marqueur espace`, `WS/Repère recherche`, `WS/Contrôles carte`, `WS/Galerie espace`, `WS/Service jour J`, `WS/Restauration et services`, `WS/Bandeau renvoi`, `WS/Bandeau comparateur`, `WS/Bandeau carte`, et les composants des sections Home, Espace, Bureaux flexibles, Événementiel, Salles et Blog, sauf la pagination et le filtre. Ce sont des organismes, non demandés dans ce lot.
- **`Logo client/*`** : assets SVG pour le bandeau logos.
- **`WS/Entrée de sommaire`** (4355:37778) : petite molécule à états Active / Repos, utile pour une passe ultérieure.
