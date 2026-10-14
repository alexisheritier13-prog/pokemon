# Development Workflow

## Local Development Setup

### Prerequisites
```bash
node --version      # 22 LTS
npm --version       # 10+
docker --version    # requis par supabase start
npx supabase --version   # CLI 2.x
```

### Initial Setup
```bash
npm install
cp .env.example .env.local          # remplir avec les valeurs de `supabase status`
npx supabase start                  # Postgres + Auth + Storage + Realtime + Edge runtime en local
npx supabase db reset               # migrations + seed.sql (catalogue)
npm run osm:import -- --dept 84,13  # importe les magasins dans la base locale
npm run seed:demo                   # signalements fictifs (local uniquement)
npm run vapid:generate              # puis copier dans .env.local et supabase/functions/.env
npm run dev
```

### Development Commands
```bash
npm run dev            # Vite (front) — https via mkcert conseillé pour tester la géoloc/PWA sur téléphone
npm run functions      # supabase functions serve --env-file supabase/functions/.env
npm run lint           # eslint .
npm run typecheck      # tsc -b --noEmit
npm run test           # vitest (unit)
npm run test:int       # vitest -c vitest.integration.config.ts (base locale requise)
npm run test:e2e       # playwright
npm run build          # vite build (+ génération du SW)
npm run size           # size-limit
npm run db:types       # supabase gen types typescript --local > src/types/database.ts
```

## Environment Configuration

### Required Environment Variables
```bash
# Frontend (.env.local) — publiques par nature
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<clé publique anon/publishable>
VITE_VAPID_PUBLIC_KEY=<clé publique VAPID>
VITE_GEOCODER_URL=https://data.geopf.fr/geocodage
VITE_APP_ENV=local            # local | production

# Edge Functions (supabase/functions/.env en local ; `supabase secrets set` en prod)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@<domaine>
PUSH_WEBHOOK_SECRET=<32 octets aléatoires>
APP_URL=https://<domaine>
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement

# Vault (SQL, une fois par environnement)
#   select vault.create_secret('<url>/functions/v1/send-push',   'edge_send_push_url');
#   select vault.create_secret('<url>/functions/v1/maintenance', 'edge_maintenance_url');
#   select vault.create_secret('<PUSH_WEBHOOK_SECRET>',           'push_webhook_secret');

# Scripts (shell, jamais commités)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Dashboard Supabase (pas d'env) : Auth → Google, Apple, SMTP Resend, Redirect URLs, rate limit e-mails
```
