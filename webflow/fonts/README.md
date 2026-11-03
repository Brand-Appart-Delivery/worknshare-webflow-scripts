# Polices du site (à ajouter dans Webflow → Site settings → Fonts)

Générées le 2 novembre 2026 depuis les fichiers Google Fonts (licence OFL),
avec fontTools : alphabets latin + latin étendu, format woff2.

| Fichier | Famille Webflow | Contenu | Poids |
|---|---|---|---|
| `Boldonse-Regular.woff2` | Boldonse | graisse 400 (la seule existante) | 27 Ko |
| `GoogleSansFlex-Variable.woff2` | Google Sans Flex | variable : graisses 1 à 1000 + taille optique automatique (opsz 1–144) | 186 Ko |

Axes retirés de Google Sans Flex (valeur figée) : largeur `wdth` = 100,
arrondi `ROND` = 0, inclinaison `slnt` = 0. Pour un vrai italique, regénérer
en gardant `slnt` (≈ 305 Ko).

Les noms de famille doivent rester exactement « Boldonse » et « Google Sans Flex » :
ce sont les valeurs des variables Webflow `font/display` et `font/texte`.
