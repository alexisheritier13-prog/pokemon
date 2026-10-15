# RestockRadar

PWA communautaire pour signaler et recevoir des alertes de restocks de cartes Pokémon **en magasin physique**, autour de soi. Lancement : Vaucluse (84) et Bouches-du-Rhône (13).

> Projet communautaire indépendant, non affilié à Nintendo, The Pokémon Company, Creatures ou Game Freak.

Le nom de l'app se change dans un seul fichier : [`src/config/app.ts`](src/config/app.ts).

## Stack

Vite, React 19, TypeScript, Tailwind CSS v4, React Router 7 et TanStack Query côté front. Supabase (Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions) côté back. Hébergement du front sur Vercel. Le détail est dans [`docs/architecture/tech-stack.md`](docs/architecture/tech-stack.md).

## Prérequis

- Node.js 24 LTS (voir `.nvmrc`) et npm 10 ou plus
- Docker Desktop, pour la base Supabase locale (la CLI Supabase est installée par `npm install`). Sous Windows, la virtualisation (SVM / VT-x) doit être activée dans le BIOS, et WSL 2 installé.

## Installation locale

```bash
npm install
cp .env.example .env.local   # facultatif à ce stade
npm run dev
```

## Scripts

| Commande                          | Rôle                                              |
| --------------------------------- | ------------------------------------------------- |
| `npm run dev`                     | Serveur de développement                          |
| `npm run build`                   | Typecheck et build de production dans `dist/`     |
| `npm run preview`                 | Sert le build localement                          |
| `npm run lint`                    | ESLint                                            |
| `npm run format` / `format:check` | Prettier                                          |
| `npm run typecheck`               | Vérification TypeScript                           |
| `npm run test`                    | Tests Vitest (`-- --run` pour une seule passe)    |
| `npm run size`                    | Budget du bundle initial (200 ko gzip maximum)    |
| `npm run db:start` / `db:stop`    | Démarre ou arrête Supabase en local (Docker)      |
| `npm run db:reset`                | Recrée la base locale depuis les migrations       |
| `npm run db:types`                | Régénère `src/types/database.ts`                  |
| `npm run test:int`                | Tests d'intégration (RLS, RPC) sur la base locale |

## Base de données

- Migrations versionnées dans [`supabase/migrations/`](supabase/migrations/). Studio local : http://127.0.0.1:54323, e-mails de test (Mailpit) : http://127.0.0.1:54324.
- Après chaque migration : `npm run db:reset`, `npm run db:types`, puis `npm run test:int`.
- **Appliquer en production** (projet `zdittonhmveidzpyldhj`) :
  ```bash
  npx supabase login
  npx supabase link --project-ref zdittonhmveidzpyldhj   # mot de passe de la base demandé
  npx supabase db push
  ```
- **Devenir admin** (une fois inscrit dans l'app) : dans le SQL Editor du dashboard Supabase, exécuter
  `update public.profiles set role = 'admin' where pseudo = 'TonPseudo';`

## Intégration continue et déploiement

- GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) lance lint, format, typecheck, tests, build et budget de bundle sur chaque push, puis les tests d'intégration sur un Supabase local.
- Vercel déploie une preview par branche ou PR et la production sur `main`. La configuration est dans [`vercel.json`](vercel.json).

### Mise en place Vercel (une fois)

1. Sur vercel.com, **Add New → Project**, puis importer le dépôt GitHub.
2. Framework : **Vite**. Build : `npm run build`. Sortie : `dist`. Ces valeurs sont déjà dans `vercel.json`.
3. Variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé publishable), de type « Config ».

## Documentation projet (méthode BMAD)

- [`docs/brief.md`](docs/brief.md) : brief
- [`docs/prd.md`](docs/prd.md) et [`docs/prd/`](docs/prd/) : exigences, epics et stories
- [`docs/front-end-spec.md`](docs/front-end-spec.md) : UX et design system
- [`docs/architecture.md`](docs/architecture.md) et [`docs/architecture/`](docs/architecture/) : architecture, schéma SQL, Edge Functions
- [`docs/stories/`](docs/stories/) : stories en cours

La procédure de test des notifications push sur iPhone sera ajoutée ici à l'epic 4.
