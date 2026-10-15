# Tech Stack

Les versions sont **épinglées à la story 1.1** (dernière version stable de la majeure indiquée, `package-lock.json` versionné). La table ci-dessous est la référence que tout agent doit respecter.

## Technology Stack Table
| Category | Technology | Version | Purpose | Rationale |
|---|---|---|---|---|
| Frontend Language | TypeScript | 5.x (strict) | Typage du front et des scripts | Imposé, sécurité de refactor |
| Frontend Framework | React | 19.x | UI | Imposé |
| Build | Vite | dernière majeure stable | Bundling, dev server | Imposé, rapide |
| UI Component Library | Composants maison + `vaul` (feuilles) + `@radix-ui/react-dialog` | dernière | Primitives accessibles sans style | Pas de look shadcn par défaut (front-end spec) |
| CSS | Tailwind CSS | **4.x (D1)** | Utilitaires branchés sur les tokens | Imposé, tokens via `@theme` |
| Icônes | `@phosphor-icons/react` (Bold) | 2.x | Iconographie | Front-end spec |
| State Management | TanStack Query + Zustand | 5.x / 5.x | État serveur / préférences UI | Imposé (Query) ; Zustand ~1 ko |
| Persistance hors ligne | `@tanstack/query-persist-client-core` + `idb-keyval` | 5.x / 6.x | Cache des requêtes et outbox en IndexedDB | FR40-41 |
| Routing | React Router | 7.x (data router) | Routes, lazy loading | Imposé |
| Carte | MapLibre GL JS | 5.x | Rendu vectoriel, clusters | Imposé, sans clé |
| Tuiles | OpenFreeMap | — | Tuiles OSM, glyphes | Gratuit, sans clé |
| Horaires | Analyseur maison (`src/features/store/openingHours.ts`) | — | Parsing des formats OSM courants | `opening_hours` (npm) écarté en story 2.4 : 160 ko gzip pour 251/251 cas couverts par l'analyseur maison |
| Validation | Zod | 4.x | Schémas des formulaires, de l'env, des réponses et des Edge Functions | Imposé |
| PWA | `vite-plugin-pwa` + Workbox | 1.x / 7.x | Manifest, precache, SW | Imposé |
| Assets PWA | `@vite-pwa/assets-generator` | 1.x | Icônes et splash iOS | Génère toutes les tailles |
| Backend Language | SQL (PL/pgSQL) + TypeScript (Deno) | PG 15+ / Deno 2 | RPC, triggers / Edge Functions | Imposé |
| Backend Framework | Supabase | CLI 2.x, supabase-js 2.x | BaaS | Imposé |
| API Style | PostgREST (tables + RPC) + Realtime + Edge Functions HTTP | — | Accès données | Natif Supabase |
| Database | Postgres + PostGIS + pg_cron + pg_net + citext | PG 15+ | Données, géo, cron, HTTP | Imposé |
| File Storage | Supabase Storage | — | Photos, images produits | Imposé |
| Authentication | Supabase Auth | — | Magic link, Google, Apple | Imposé |
| Push | `web-push` (npm, via `npm:`) | 3.x | Web Push VAPID | **Imposé, spike story 1.6** |
| Frontend Testing | Vitest + Testing Library | dernière | Logique pure, composants | Imposé |
| Backend Testing | Vitest (intégration supabase-js sur `supabase start`) | dernière | RPC, RLS, triggers | Teste comme le client réel |
| E2E Testing | Playwright + `@axe-core/playwright` | 1.x | 4 parcours + a11y | Imposé |
| Lint / Format | ESLint (flat config) + Prettier | 9.x / 3.x | Qualité | Imposé |
| Bundle budget | `size-limit` | 11.x | Bundle initial < 200 ko gzip en CI | NFR3 |
| CI/CD | GitHub Actions + intégration Git Vercel | — | Checks, tests, deploy | Gratuit |
| Monitoring | Logs Supabase + tables internes + panneau admin « Santé » | — | Observabilité sans tracker tiers | NFR7 |
| Logging front | RPC `log_client_error` (limitée) | — | Erreurs JS en base | Aucun SaaS tiers |
