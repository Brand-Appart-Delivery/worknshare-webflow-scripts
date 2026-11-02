# Work'n'Share — scripts et styles du site Webflow

Toujours répondre à Axel en français. Commentaires de code en français, simples.

## Fonctionnement

- Le code vit dans `src/`, esbuild le compile en `main.js` + `main.css` à la racine
  (fichiers générés : ne jamais les modifier à la main).
- Webflow charge ces fichiers depuis jsDelivr (`Brand-Appart-Delivery/worknshare-webflow-scripts`), via le chargeur collé
  dans Site settings → Custom code (voir `webflow/head-code.html` et `footer-code.html`).
- `npm run dev` : serveur local :3000 + proxy :3001 + tunnel Cloudflare
  (`https://dev.michelaxel.fr`), rechargement auto de la page staging à chaque sauvegarde.
- `npm run deploy` : build, `version.json`, tag `vX.Y.Z`, push, purge et vérification
  jsDelivr. Ne déployer que si Axel le demande.

## Conventions

- Un fichier par fonctionnalité, rangé par dossier : `components/` (UI), `content/`
  (rich text CMS), `animations/`, `sections/` (sections épinglées), `embeds/`
  (shortcodes `[xxx]` du rich text), `schema/` (JSON-LD), `utils/`.
- Chaque module exporte `initXxx(root = document)`, ne fait rien si ses éléments sont
  absents, et est appelé dans `src/index.js` (l'ordre compte, voir le commentaire).
- Le JS cible des attributs `data-xxx` posés dans Webflow, jamais des classes Webflow
  (le Designer les renomme). L'en-tête du fichier documente la STRUCTURE et les OPTIONS
  (`data-xxx-*`) à poser dans Webflow.
- États pilotés par le JS : classes `is-open`, `is-active`… ; styles dans un partiel
  `src/styles/_xxx.scss` importé dans `main.scss`.
- GSAP, ScrollTrigger, Lenis sont chargés par Webflow et lus sur `window`
  (`window.gsap`), jamais importés dans le bundle. Toujours vérifier leur présence.
- Respecter `prefers-reduced-motion` (`utils/motion.js`) : pas d'animation si réduit.
- `ScrollTrigger.refresh()` uniquement via `requestScrollRefresh()` (`utils/scroll-refresh.js`).
- Textes générés par le code : `t("clé")` de `utils/i18n.js` (FR + EN), jamais en dur.
- Accessibilité : aria-label, aria-expanded, focus clavier sur tout composant interactif.

## Dossiers annexes

- `webflow/` : scripts de site Webflow autonomes (hors bundle), robots.txt, llms.txt,
  CSV de redirections, HTML d'embeds à coller.
- `gtm/` : balises GTM « HTML personnalisé ».
- `backups/` : sauvegarde JSON des fiches CMS **avant** toute modification en masse via
  l'API / MCP Webflow (`cms-backup-AAAA-MM-JJ-<sujet>.json`).

## Contenu (MCP Webflow)

- Toute correction de contenu s'applique à toutes les langues du site (FR **et** EN),
  y compris les champs cachés (ex. `markdown`) et les collections en double.
- Sauvegarder les fiches dans `backups/` avant de les modifier ; publier seulement si
  Axel le demande.
