# Deployment Architecture

## Deployment Strategy
**Frontend Deployment :**
- **Platform :** Vercel (D2). Intégration Git : preview par PR, production sur `main`.
- **Build Command :** `npm run build`
- **Output Directory :** `dist`
- **CDN/Edge :** CDN Vercel. Le service worker est servi en `no-cache`, et les assets hashés en `immutable`.
- **`vercel.json` :** rewrite SPA vers `/index.html` et en-têtes de sécurité (CSP stricte : `self`, Supabase, OpenFreeMap, Géoplateforme, `blob:` pour les photos ; `Permissions-Policy: geolocation=(self), camera=(self)` ; HSTS ; `Referrer-Policy: strict-origin-when-cross-origin`).

**Backend Deployment :**
- **Platform :** Supabase cloud (`eu-west-3`).
- **Deployment Method :** workflow GitHub `deploy-supabase.yml` déclenché **manuellement** (`supabase db push`, puis `supabase functions deploy`), avec un token d'accès en secret GitHub. Aucune migration automatique sur `main` sans action du porteur.

## CI/CD Pipeline
```yaml
# .github/workflows/ci.yml (extrait)
name: ci
on: [push, pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --run
      - run: npm run build
      - run: npm run size
  integration:
    runs-on: ubuntu-latest
    needs: checks
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: supabase start
      - run: supabase db reset
      - run: npm run db:types && git diff --exit-code src/types/database.ts
      - run: npm run test:int -- --run
      - run: npx playwright install --with-deps chromium && npm run test:e2e
```

## Environments
| Environment | Frontend URL | Backend URL | Purpose |
|---|---|---|---|
| Local | https://localhost:5173 | http://127.0.0.1:54321 | Développement, tests, seed démo |
| Preview | `*.vercel.app` par PR | Supabase prod (lecture et écriture réelles !) | Revue visuelle uniquement, sans test d'écriture |
| Production | domaine à choisir (avant la phase 5) | projet Supabase prod | Utilisateurs |

*Staging :* optionnel. L'offre Free permet 2 projets, et un second projet « staging » pourra servir les previews dès l'epic 4 si le porteur le souhaite.
