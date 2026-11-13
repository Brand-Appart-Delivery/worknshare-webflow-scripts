# Temps de trajet en transports (PRIM IDFM)

Relais Cloudflare entre le site et le calculateur d'itinéraires d'Île-de-France
Mobilités. Il garde la clé PRIM côté serveur et calcule les trajets en direct (départ maintenant).

## Mise en place (une seule fois)

1. Compte PRIM : https://prim.iledefrance-mobilites.fr, puis générer un jeton
   (« Mes jetons d'authentification »), avec l'accès au calculateur d'itinéraires.
2. Depuis ce dossier :

   ```bash
   npx wrangler login                  # compte Cloudflare
   npx wrangler secret put PRIM_KEY    # coller le jeton PRIM
   npx wrangler deploy
   ```

3. Copier l'URL affichée (`https://wns-prim-journeys.<compte>.workers.dev`) dans
   `TRANSIT_URL` de `src/utils/transit.js`, puis `npm run deploy` du site.

## Fonctionnement

- Le site envoie `POST { from: { lat, lng }, to: [{ id, lat, lng }] }`.
- Le Worker renvoie `{ times: { id: minutes | null } }`.
- Trajets en direct (départ maintenant), cache de 5 minutes sur domaine personnalisé.
- Si le Worker ne répond pas, le site garde la distance « à vol d'oiseau ».
- Domaines autorisés : `ALLOWED_ORIGINS` dans `wrangler.toml`.
