# Monitoring and Observability

## Monitoring Stack
- **Frontend Monitoring :** `log_client_error` (en base, limité), Web Vitals mesurés en local et en CI (Lighthouse), aucun SaaS tiers.
- **Backend Monitoring :** logs Supabase (Postgres, Edge, Auth), `cron.job_run_details`, compteurs `push_jobs`.
- **Error Tracking :** panneau admin « Santé » (`admin_health`).
- **Performance Monitoring :** rapports Lighthouse archivés (epic 6), `pg_stat_statements` pour les requêtes lentes.

## Key Metrics
**Frontend Metrics :** LCP, INP et CLS sur Carte, Fil et Fiche (Lighthouse), taux d'erreurs JS par jour, part des signalements passés par l'outbox.
**Backend Metrics :**
- signalements par jour, ratio confirmés / contestés, délai médian de 1re confirmation ;
- push envoyés, purgés (410) et en échec par jour, latence du job au premier envoi ;
- durée et échecs des jobs cron ;
- taille de la base et du stockage (vs limites Free), connexions Realtime au pic.
