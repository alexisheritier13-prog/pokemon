# Introduction

Ce document décrit l'architecture complète de RestockRadar : front PWA, back Supabase, données, sécurité, déploiement et tests. C'est la source de vérité pour les agents de développement. Il contient les trois livrables exigés par le porteur avant tout code : **l'arborescence** (Source Tree), **le schéma SQL complet avec les policies RLS** (Database Schema) et **la liste des Edge Functions** (Backend Architecture). Le découpage en phases suit les epics du PRD.

## Starter Template or Existing Project
Projet greenfield, sans starter tiers. Initialisation par `npm create vite@latest` (template `react-ts`) puis ajout manuel des briques, pour garder la maîtrise du bundle. Le back est initialisé par `supabase init`.

## Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-10-14 | 0.1 | Version initiale, soumise au porteur | Architect (Winston) |
| 2026-10-14 | 0.2 | D1 Tailwind v4, D2 Vercel, D3 Resend, D4 photos 60 j : validés | Architect (Winston) |
