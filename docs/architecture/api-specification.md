# API Specification

Il n'y a pas d'API REST maison : le client parle à **PostgREST** (tables en lecture sous RLS, RPC pour l'écriture), à **Realtime** et à **5 Edge Functions**. Le contrat est défini par les signatures SQL ci-dessous et les types générés.

## RPC exposées (schéma `public`)

| RPC | Rôle autorisé | Description |
|---|---|---|
| `get_public_config()` | anon, authenticated | Seuils non secrets (distances, TTL, seuil holo, seuil heatmap) |
| `get_me()` | authenticated | Profil complet de l'appelant (dont `banned`) + réglages + préférences |
| `get_launch_stores()` | anon, authenticated | Tous les magasins actifs des départements lancés + statut courant (≈ 1 000 lignes, mis en cache 24 h) |
| `get_stores_in_bbox(min_lng, min_lat, max_lng, max_lat)` | anon, authenticated | Même chose par emprise (utilisé quand on étendra à la France) |
| `get_feed(lat, lng, radius_km, product_ids, brand_ids, max_age_min, before, limit)` | anon, authenticated | Fil paginé (curseur `before` = `reported_at`) |
| `get_store_heatmap(store_id)` | anon, authenticated | `{ enough, total_90d, cells[] }` |
| `create_report(client_id, store_id, lat, lng, status, products, price_cents, comment, captured_at)` | authenticated | Crée un signalement (toutes les règles serveur) |
| `cast_vote(report_id, vote, lat, lng)` | authenticated | Vote sur place, règles « Plus rien » et « contesté » |
| `propose_store(name, brand_id, address, city, postcode, lat, lng)` | authenticated | Magasin `pending` |
| `find_store_duplicates(lat, lng, brand_id)` | authenticated | Magasins de même enseigne à moins de 100 m |
| `flag_content(report_id, target, reason, note)` | authenticated | Signalement d'abus |
| `get_my_export()` | authenticated | Export JSON RGPD |
| `log_client_error(message, stack, url)` | anon, authenticated | Journal d'erreurs JS (limité) |
| `admin_review_store(store_id, decision, note, patch)` | authenticated + admin | Valider, refuser ou modifier |
| `admin_moderate(report_id, action, flag_ids)` | authenticated + admin | `hide_report` / `unhide_report` / `hide_photo` / `dismiss` |
| `admin_set_ban(user_id, banned)` | authenticated + admin | Bannir ou débannir |
| `admin_health()` | authenticated + admin | Derniers runs cron, stats push, KPIs |
| `svc_claim_push_targets(job_id)` | service_role | Ciblage et dédoublonnage atomique des push |
| `svc_finish_push_job(job_id, sent, ok_ids, gone_ids, failed)` | service_role | Clôture du job, purge des endpoints morts |
| `svc_attach_report_photo(report_id, user_id, photo_path, thumb_path)` | service_role | Rattache les photos validées |
| `svc_prepare_account_deletion(user_id)` | service_role | Anonymise et renvoie les chemins de photos à supprimer |
| `svc_photos_to_purge(older_than_days)` | service_role | Liste des photos expirées (rétention D4) |

**Format d'erreur RPC :** `raise exception using errcode = 'P0001', message = '<code>', detail = '<json>'`. Les codes sont stables, en `snake_case` : `auth_required`, `banned`, `store_not_found`, `too_far`, `rate_limited_user`, `rate_limited_store`, `capture_too_old`, `invalid_products`, `report_not_found`, `own_report`, `report_expired`, `forbidden`, `client_id_conflict`. Le `detail` porte un JSON (`{"distance_m":412}`, `{"retry_in_min":12}`). Le front traduit chaque code via `src/copy/fr.ts`.

## Edge Functions (HTTP)

| Fonction | Auth | Méthode et entrée | Sortie |
|---|---|---|---|
| `send-push` | en-tête `x-push-secret` (appel interne `pg_net` / cron) | `POST { job_id }` | `{ sent, gone, failed }` |
| `upload-report-photo` | JWT utilisateur | `POST multipart { report_id, photo, thumb }` | `{ photo_path, thumb_path }` |
| `push-test` | JWT utilisateur | `POST {}` | `{ sent }` |
| `delete-account` | JWT utilisateur | `POST { confirm: "SUPPRIMER" }` | `204` |
| `maintenance` | en-tête `x-push-secret` (cron quotidien) | `POST { task: "purge_photos" \| "purge_dead_subscriptions" }` | `{ purged }` |

Erreurs Edge : `{ "error": { "code": "...", "message": "..." } }` avec le statut HTTP correspondant (400, 401, 403, 404, 413, 415, 422, 429, 500).
