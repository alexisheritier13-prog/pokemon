# Source Tree

```text
restockradar/
├── .bmad-core/                     # BMAD (ne pas modifier)
├── .claude/commands/BMad/          # agents BMAD
├── .github/workflows/
│   ├── ci.yml                      # lint, typecheck, unit, build, size-limit, db types diff
│   ├── integration.yml             # supabase start → migrations → vitest integration → playwright
│   └── deploy-supabase.yml         # manuel (workflow_dispatch) : db push + functions deploy
├── docs/                           # brief, prd, front-end-spec, architecture (+ versions découpées), design/, stories/
├── e2e/                            # Playwright specs + fixtures (géoloc simulée)
├── public/
│   ├── icons/ splash/              # générés (assets-generator)
│   ├── map/style-light.json style-dark.json
│   ├── fonts/                      # Fredoka (variable), Figtree — WOFF2 latin + latin-ext
│   └── robots.txt
├── scripts/
│   ├── import-osm.ts               # Overpass → upsert stores (service role)
│   ├── generate-vapid.mjs          # web-push generateVAPIDKeys → affiche les clés
│   ├── seed-demo.ts                # LOCAL UNIQUEMENT (refuse si l'URL n'est pas localhost)
│   └── osm/brands.json             # normalisation des enseignes
├── src/                            # voir Frontend Architecture
├── supabase/                       # voir Backend Architecture
├── tests/
│   ├── unit/                       # (ou colocalisés *.test.ts)
│   └── integration/                # RPC, RLS, triggers sur base locale
├── .env.example
├── eslint.config.js  .prettierrc  tsconfig*.json  vite.config.ts  playwright.config.ts  vitest.config.ts
├── vercel.json                     # rewrites SPA + en-têtes de sécurité
├── package.json
└── README.md
```

## Import OSM
- **Une requête Overpass par département** (`area["ISO3166-2"="FR-84"]`), sur les tags `shop` = `supermarket`, `department_store`, `toys`, `games`, `video_games`, `books`, `hobby`, `anime`, `comics`, `electronics`, plus `shop=*` avec `brand` correspondant à `brands.osm_match`.
- Sortie `out center tags`. Les `way` et `relation` prennent leur centroïde.
- **Filtrage :** les supermarchés ne sont gardés que pour les enseignes listées (Leclerc, Carrefour, Auchan, Intermarché…), et les formats de proximité (« City », « Express », « Contact »…) sont exclus par défaut (liste configurable). Les magasins de jouets, de jeux, de jeux vidéo et les librairies-culture sont tous gardés.
- **Upsert** sur `osm_ref` (`node/123`). Nom, adresse, horaires et position sont mis à jour, mais jamais `status` ni les corrections admin (champ `admin_locked` à ajouter si nécessaire).
- Rapport en console (créés, mis à jour, ignorés, sans enseigne). Les nouveaux magasins importés sont `active`.
