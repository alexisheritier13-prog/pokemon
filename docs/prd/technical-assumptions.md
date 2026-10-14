# Technical Assumptions

## Repository Structure: Monorepo
Un seul dépôt : front Vite à la racine (`src/`), `supabase/` (migrations, fonctions, seed, tests SQL) et `scripts/` (import OSM, génération VAPID, seed démo). Pas de workspaces npm au départ.

## Service Architecture
**Serverless** autour de Supabase :
- un client React lourd (SPA statique) ;
- la logique métier en **fonctions Postgres** (RPC `SECURITY DEFINER` : création de signalement, vote, calcul de réputation et de `trust_score`, contrôles de distance et de fréquence) ;
- des **Edge Functions Deno** pour ce qui sort de la base : envoi des push, upload et vérification des photos, export et suppression de compte, notification de modération ;
- les déclencheurs push partent d'un **trigger Postgres** (`pg_net`) vers l'Edge Function d'envoi ;
- `pg_cron` pour l'expiration et les statistiques ;
- Realtime (Postgres Changes) pour le fil, avec un filtrage géographique côté client sur la zone de lancement.

## Testing Requirements
**Unit + Integration + E2E ciblé** :
- Vitest pour la logique pure (trust score, formatage, filtres, compression photo) ;
- tests d'intégration des RPC et des policies RLS sur une base Supabase locale (`supabase start`) ;
- Playwright pour 4 parcours critiques : consultation anonyme carte → fiche, signalement complet, vote, onboarding avec préférences d'alerte ;
- une **procédure manuelle documentée** pour les push sur iPhone installé et sur Android.

Chaque epic ajoute ses tests au fil de l'eau. L'epic 6 ne fait que consolider.

## Additional Technical Assumptions and Requests
- **Stack imposée par le porteur** (non négociable sans son accord) :
  - Vite, React, TypeScript, Tailwind CSS, `vite-plugin-pwa` (Workbox), React Router, TanStack Query ;
  - MapLibre GL JS et OpenFreeMap ;
  - Supabase : Postgres + PostGIS, Auth (magic link, Google, Apple), Storage, Realtime, Edge Functions, `pg_cron` ;
  - librairie `web-push` ;
  - Zod, ESLint, Prettier, Vitest, Playwright.
- **À trancher à l'étape Architecture** : version de Tailwind (v3 ou v4) et hébergeur front (Vercel ou Netlify).
- **Spike obligatoire en phase 1** : `web-push` dans une Edge Function Deno. En cas d'échec, retour vers le porteur avant tout changement de librairie.
- **Géocodage de repli** (ville ou code postal) : **géocodeur de la Géoplateforme IGN (`data.geopf.fr/geocodage`)**, successeur de l'API Adresse décommissionnée fin janvier 2026, gratuit et sans clé. **[VALIDÉ, mis à jour par l'architecte]**
- **Horaires** : format `opening_hours` d'OSM, parsé côté client, et modifiable par l'admin.
- **Catalogue** : tables `games` et `products` (la notion de jeu existe dès la V1 pour préparer One Piece, Lorcana et Magic). Seed initial d'une trentaine de produits Pokémon génériques, sans visuel.
- **Schéma prêt pour la V2** : la table de statistiques par magasin (agrégats jour × heure) est alimentée dès la V1 par le job `pg_cron`. Elle sert la heatmap et servira la prédiction.
- **Service worker unique** : Workbox (precache, runtime cache) plus les handlers `push`, `notificationclick` et `sync`, via la stratégie `injectManifest`.
- **Environnements** : un projet Supabase local (CLI) pour le développement et un projet Supabase cloud pour la prod. Seed démo **uniquement en local**.
- **Attribution OSM et OpenFreeMap** affichée sur la carte (exigence de licence).
