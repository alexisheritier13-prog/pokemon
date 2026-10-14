# Components

## Web App (SPA React)
**Responsibility :** UI, cache des données, géolocalisation à la volée, compression des photos, file hors ligne.
**Key Interfaces :** routes React Router, hooks `use*Query` / `use*Mutation`, client Supabase unique.
**Dependencies :** Supabase (Auth, REST, Realtime, Edge), OpenFreeMap, Géoplateforme.
**Technology Stack :** React, Vite, Tailwind, TanStack Query, Zustand, MapLibre (lazy).

## Service Worker
**Responsibility :**
- precache de la coquille ;
- cache d'exécution (tuiles, photos, polices) ;
- réception des push (`push`), ouverture (`notificationclick` → `/r/:id`) ;
- réveil Background Sync (`sync` → demande au client de vider l'outbox) ;
- invite de mise à jour.

**Technology Stack :** Workbox 7 via `vite-plugin-pwa` en `injectManifest` (`src/sw/service-worker.ts`).

## Postgres (logique métier)
**Responsibility :** données, RLS, RPC, triggers (compteurs, réputation, outbox push), cron (expiration, statistiques, reprise des push).
**Key Interfaces :** RPC listées plus haut, publication Realtime sur `reports`.

## Edge Functions
**Responsibility :** ce que Postgres ne sait pas faire : chiffrement Web Push, validation binaire et écriture Storage, suppression d'un utilisateur Auth, purge Storage.

## Scripts Node (hors runtime)
`scripts/import-osm.ts`, `scripts/generate-vapid.mjs`, `scripts/seed-demo.ts` (local uniquement), `scripts/gen-pwa-assets` (via le CLI assets-generator).

## Component Diagrams

```mermaid
graph TD
  subgraph src/features
    MAP[map] --> STORE[store]
    FEED[feed] --> REPORTCARD[components/ReportCard]
    STORE --> REPORTCARD
    REPORT[report<br/>create flow] --> OUTBOX[offline/outbox]
    VOTE[vote] --> REPORTCARD
    PUSH[push] --> SWREG[sw registration]
    ONB[onboarding] --> PUSH
    ACCOUNT[account] --> PUSH
    ADMIN[admin - lazy]
  end
  subgraph src/lib
    SB[supabase.ts]
    GEO[geo.ts]
    IMG[image.ts]
    PLAT[platform.ts]
    ERR[errors.ts]
  end
  MAP --> SB
  FEED --> SB
  REPORT --> SB
  REPORT --> IMG
  REPORT --> GEO
  VOTE --> GEO
  OUTBOX --> SB
  PUSH --> PLAT
```
