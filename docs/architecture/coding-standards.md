# Coding Standards

## Critical Fullstack Rules
- **Règles métier côté serveur uniquement :** distance, rate limits, votes, réputation, trust, ban et rôles vivent en SQL ou dans les Edge Functions. Le client peut pré-valider pour l'UX, mais n'est jamais l'autorité.
- **Aucune écriture directe sur `reports`, `report_votes` ni `moderation_flags` :** toujours la RPC dédiée.
- **Tout accès Supabase passe par `features/*/api.ts` :** jamais d'appel depuis un composant.
- **Types générés :** toute migration est suivie de `npm run db:types`, et la CI échoue sur un diff.
- **Tokens uniquement :** aucune couleur, taille, ombre, durée ou radius littéral dans les composants. Tout vient de `src/design/tokens.css`.
- **Textes centralisés :** tous les textes de l'UI et les messages d'erreur viennent de `src/copy/fr.ts` (NFR14). La marque Pokémon n'y apparaît que de façon descriptive.
- **Position :** ne jamais persister ni envoyer une position précise ailleurs qu'aux RPC `create_report` et `cast_vote`, et ne jamais la logger.
- **Variables d'env :** uniquement via `src/config/env.ts` (Zod). Ne jamais lire `import.meta.env` ailleurs.
- **Erreurs RPC :** toujours `toAppError(error)` puis un message de `copy.errors[code]`. Pas de `error.message` brut affiché.
- **Accessibilité :** tout bouton icône a un `aria-label`, tout statut a un libellé texte, et chaque nouvel écran passe axe sans violation sérieuse.
- **Motion :** toute animation passe par les tokens de durée et respecte `prefers-reduced-motion`.
- **Migrations :** une migration par changement, jamais d'édition d'une migration déjà appliquée en prod, et `search_path` fixé sur chaque fonction.

## Naming Conventions
| Element | Frontend | Backend | Example |
|---|---|---|---|
| Components | PascalCase | — | `ReportCard.tsx` |
| Hooks | camelCase `use` | — | `useCreateReport.ts` |
| Feature folders | kebab/minuscule | — | `features/report/` |
| RPC | — | snake_case verbe_objet | `create_report`, `admin_set_ban`, `svc_claim_push_targets` |
| Tables | — | snake_case pluriel | `report_votes` |
| Error codes | — | snake_case | `rate_limited_store` |
| Edge Functions | — | kebab-case | `upload-report-photo` |
| Routes (URL) | français court | — | `/signaler`, `/m/:id`, `/r/:id` |
