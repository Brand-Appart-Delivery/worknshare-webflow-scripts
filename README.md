# Work'n'Share — scripts et styles du site Webflow

Le JavaScript et le CSS du site Work'n'Share (Webflow), bundlés par **esbuild**.
Le build produit `main.js` et `main.css` à la racine, servis au site par
jsDelivr depuis le dépôt GitHub `Brand-Appart-Delivery/worknshare-webflow-scripts`.

## Structure

```
src/
├── index.js        Point d'entrée : appelle les init de chaque module
├── core/           Démarrage global (ancres, Lenis optionnel)
├── components/     Éléments d'interface (accordéons, nav, sliders…)
├── content/        Transformations du rich text CMS
├── animations/     Animations au scroll
├── sections/       Grandes sections animées / épinglées
├── embeds/         Shortcodes [xxx] du rich text
├── schema/         Données structurées schema.org
├── utils/          Fonctions partagées
└── styles/         SCSS (main.scss importe les partiels)
scripts/            build, dev-proxy, deploy
webflow/            Code à coller dans Webflow + scripts de site
```

## Commandes

| Commande         | Rôle                                                      |
|------------------|-----------------------------------------------------------|
| `npm install`    | Installe les dépendances                                  |
| `npm run dev`    | Serveur local + rebuild + proxy + tunnel Cloudflare       |
| `npm run build`  | Build de production minifié                               |
| `npm run deploy` | Build + version + tag + push + purge/vérif jsDelivr       |

## Développement local

`npm run dev` sert les fichiers sur `http://localhost:3000` (CORS ouvert) et
les expose via le tunnel `https://dev.michelaxel.fr`. Sur le staging `.webflow.io`, avec
`FORCE_PROD = false` dans le head code, la page charge la version locale et se
recharge à chaque sauvegarde.

## Mise en production

`npm run deploy` (depuis `main` uniquement). La version servie s'affiche dans
la console : `[Work'n'Share] main.js — build …`.

## Configuration Webflow

Site settings → Custom code :
- **Head code** : contenu de `webflow/head-code.html`
- **Footer code** : contenu de `webflow/footer-code.html`, après les librairies
  (GSAP, ScrollTrigger, Lenis…)

## Ajouter une fonctionnalité

1. Créer `src/<dossier>/<nom>.js` avec `export function initNom(root = document)`.
2. L'importer et l'appeler dans `src/index.js`.
3. Styles éventuels : `src/styles/_nom.scss` + `@use "nom";` dans `main.scss`.
