# MealMe backend

## Connecter Neon

1. Dans le tableau de bord Neon, ouvrez **Connect** et copiez la chaîne de
   connexion **pooled** pour Node.js.
2. Dans `.env`, remplacez la ligne `DATABASE_URL` commentée par cette chaîne.
   Ne publiez jamais cette valeur dans Git.
3. Créez les tables dans la base Neon avec :

   ```powershell
   npm run migrate
   ```

4. Lancez l'API avec `npm start`.

`DATABASE_URL` est prioritaire. Sans elle, le projet continue à employer les
variables `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` et `PGDATABASE` pour une
base PostgreSQL locale.

Neon crée déjà la base ciblée par l'URL : la migration applique seulement le
schéma et peut être relancée sans risque grâce aux instructions SQL idempotentes.
