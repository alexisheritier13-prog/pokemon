# Backend Architecture

## Service Architecture

### Function Organization
```text
supabase/
├── config.toml
├── migrations/                 # 0001…0013 ci-dessus, puis une migration par story si besoin
├── seed.sql                    # catalogue (jeu Pokémon, produits génériques, enseignes) — pas de données démo
├── functions/
│   ├── _shared/
│   │   ├── admin.ts            # service-role client
│   │   ├── auth.ts             # getUserFromRequest (JWT) ; requireSecret(x-push-secret)
│   │   ├── cors.ts
│   │   ├── errors.ts           # jsonError(code, status)
│   │   └── schemas.ts          # Zod schemas shared by functions
│   ├── send-push/index.ts
│   ├── upload-report-photo/index.ts
│   ├── push-test/index.ts
│   ├── delete-account/index.ts
│   └── maintenance/index.ts
└── tests/                      # (integration tests live in /tests/integration, run against supabase start)
```

**Pourquoi pas d'Edge Function de modération :** la modération est entièrement transactionnelle (états, réputation, journal) et vit donc en RPC admin. La seule opération hors base, la suppression d'un objet Storage, est faite par l'interface admin, autorisée par une policy Storage réservée au rôle admin.

### Function Template
```typescript
// supabase/functions/send-push/index.ts
import webpush from 'npm:web-push@3';
import { z } from 'npm:zod@4';
import { admin } from '../_shared/admin.ts';
import { requireSecret } from '../_shared/auth.ts';
import { jsonError } from '../_shared/errors.ts';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);
const Body = z.object({ job_id: z.number().int().positive() });

Deno.serve(async (req) => {
  if (!requireSecret(req)) return jsonError('forbidden', 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('invalid_body', 400);

  const { data: targets, error } = await admin.rpc('svc_claim_push_targets', { p_job_id: parsed.data.job_id });
  if (error) return jsonError('claim_failed', 500);
  if (!targets?.length) {
    await admin.rpc('svc_finish_push_job', { p_job_id: parsed.data.job_id, p_sent: 0, p_ok_ids: [], p_gone_ids: [], p_failed: 0 });
    return Response.json({ sent: 0 });
  }

  const { data: report } = await admin.from('feed_reports').select('*')
    .eq('id', targets[0].report_id).single();
  const payload = JSON.stringify(buildPayload(report)); // { title, body, url: `/r/${id}`, tag: `store-${storeId}` }

  const ok: string[] = []; const gone: string[] = []; let failed = 0;
  await pool(targets, 10, async (t) => {
    try {
      await webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        payload,
        { TTL: 3 * 3600, urgency: 'high', topic: `s${report.store_id.replaceAll('-', '').slice(0, 30)}` },
      );
      ok.push(t.subscription_id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(t.subscription_id); else failed++;
    }
  });

  await admin.rpc('svc_finish_push_job', {
    p_job_id: parsed.data.job_id, p_sent: ok.length, p_ok_ids: ok, p_gone_ids: gone, p_failed: failed,
  });
  return Response.json({ sent: ok.length, gone: gone.length, failed });
});
```

### Liste des Edge Functions (livrable)

| # | Fonction | Déclencheur | Rôle | Story |
|---|---|---|---|---|
| 1 | `send-push` | `pg_net` après insertion dans `push_jobs`, reprise par cron chaque minute | Ciblage (RPC), envoi Web Push VAPID, purge 404/410, compteurs | 4.3 |
| 2 | `upload-report-photo` | Client (JWT), juste après `create_report` | Contrôles (auteur, âge < 15 min, ≤ 1,5 Mo + 200 Ko, signature WebP/JPEG, **refus de tout EXIF**), écriture Storage, rattachement | 2.7 |
| 3 | `push-test` | Client (JWT), bouton du Compte | Notification de test vers les abonnements de l'appelant | 4.4 |
| 4 | `delete-account` | Client (JWT), double confirmation | Anonymisation des signalements, suppression des photos, puis `auth.admin.deleteUser` (cascade) | 5.5 |
| 5 | `maintenance` | Cron nocturne (`pg_net`) | Purge des photos au-delà de la rétention (D4) et des abonnements en échec répété | 2.7 / 5.5 |
| — | `spike-webpush` | Manuel | Spike de faisabilité de `web-push` sous Deno, **supprimé après la story 1.6** | 1.6 |

## Database Architecture

### Schema Design
Voir la section « Database Schema » ci-dessus (migrations 0001 à 0013).

### Data Access Layer
- **Client :** lectures de tables sous RLS (catalogue, profils, préférences, favoris, abonnements push) et appels RPC pour tout le reste. Les accès sont regroupés dans `features/*/api.ts`, et aucun composant n'appelle `supabase` directement.
- **Edge Functions :** uniquement les RPC `svc_*` et des lectures ciblées via le client service role.
- **Typage :** `npm run db:types` régénère `src/types/database.ts` après chaque migration (vérifié en CI : diff vide).

## Authentication and Authorization

### Auth Flow
```mermaid
sequenceDiagram
  participant U as App
  participant A as Supabase Auth
  participant P as Fournisseur (Google/Apple) ou e-mail
  participant DB as Postgres
  U->>A: signInWithOtp(email) | signInWithOAuth(google|apple), PKCE, redirectTo=/auth/callback
  A->>P: e-mail magic link (SMTP Resend) | redirection OAuth
  P-->>U: lien / retour sur /auth/callback?code=…
  U->>A: exchangeCodeForSession(code)
  A->>DB: insert auth.users (1re fois) → trigger handle_new_user (profil, réglages, préférences)
  A-->>U: session (JWT 1 h + refresh)
  U->>U: retour à l'action d'origine (state.from) ; fusion des choix d'onboarding invité
```

### Middleware/Guards
- **Base de données (la vraie barrière) :** RLS sur chaque table, contrôle de `auth.uid()` et de `banned_at` dans chaque RPC d'écriture, `private.is_admin()` dans chaque RPC admin.
- **Edge Functions :** `getUserFromRequest(req)` vérifie le JWT via `admin.auth.getUser(token)`. Les fonctions internes exigent `x-push-secret` (secret aléatoire de 32 octets, stocké dans Vault et dans les secrets Edge).
- **Front :** `RequireAuth` et `RequireRole`, qui ne servent qu'au confort.
- **Apple :** compte Apple Developer (D-porteur), Services ID, clé `.p8`, domaine de retour Supabase.
- **iOS installé :** OAuth dans une PWA standalone passe par le navigateur in-app. Le magic link s'ouvre dans Safari et non dans la PWA (limite connue d'iOS). La page `/auth/callback` affiche alors « Connexion réussie, reviens dans l'app » et la PWA récupère la session à l'ouverture via un **code OTP à 6 chiffres** saisi dans l'app. Le modèle d'e-mail Supabase est personnalisé pour contenir à la fois le lien et le code (`{{ .Token }}`), et l'écran de connexion propose la saisie du code par défaut quand l'app est installée.
