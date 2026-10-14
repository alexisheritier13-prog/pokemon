# Data Models

Modèles partagés (types générés par `supabase gen types typescript` dans `src/types/database.ts`, puis aliasés dans `src/types/domain.ts`).

## Profile (public)
**Purpose :** identité publique d'un contributeur.
**Key Attributes :** `id` (= auth.uid), `pseudo` (unique, insensible à la casse), `avatar_key` (avatar maison), `reputation_score`, `reports_count`, `reports_disputed_count`, `scout_count`, `role` (`user` | `admin`), `banned_at` (non exposé).

```typescript
export interface Profile {
  id: string;
  pseudo: string;
  avatarKey: string;
  reputationScore: number;
  reportsCount: number;
  reportsDisputedCount: number;
  scoutCount: number;
  role: 'user' | 'admin';
  badges: BadgeKey[]; // computed: 'nouveau' | 'fiable' | 'eclaireur' | 'veteran'
  createdAt: string;
}
```
**Relationships :** 1-1 avec `user_settings` et `alert_preferences`, 1-n avec `reports`, `report_votes`, `push_subscriptions` et `store_favorites`.

## UserSettings / AlertPreferences (privés)
**Purpose :** zone de référence (arrondie à ~1 km) et filtres d'alerte. Lisibles par leur seul propriétaire.

```typescript
export interface AlertPreferences {
  userId: string;
  enabled: boolean;
  radiusKm: number;            // 1..50, default 15
  trigger: 'created' | 'first_confirm'; // default 'first_confirm'
  productIds: string[];
  productTypes: ProductType[];
  brandIds: string[];
  favoritesOnly: boolean;
  quietStart: string | null;   // 'HH:MM' Europe/Paris
  quietEnd: string | null;
}
```

## Store
**Purpose :** magasin physique (import OSM ou proposition d'un utilisateur).

```typescript
export interface Store {
  id: string;
  osmRef: string | null;       // 'node/123' | 'way/456'
  name: string;
  brandId: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  department: string;          // '84', '13'…
  lng: number; lat: number;
  openingHours: string | null; // OSM opening_hours syntax
  status: 'pending' | 'active' | 'rejected' | 'disabled';
}
```
**Relationships :** n-1 vers `brands`, 1-n vers `reports` et `store_slot_stats`.

## Brand / Game / Product
**Purpose :** référentiels éditables par l'admin. `games` prépare les autres TCG, `brands.category_color` porte la palette secondaire « types ».

```typescript
export type ProductType = 'booster' | 'blister' | 'display' | 'etb' | 'coffret' | 'tin' | 'bundle' | 'other';
export interface Product { id: string; gameId: string; name: string; type: ProductType; setName: string | null; imagePath: string | null; sortOrder: number; isActive: boolean; }
```

## Report
**Purpose :** signalement d'un statut de stock dans un magasin, à un instant donné.

```typescript
export type ReportStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'restock_incoming';
export type ReportState = 'active' | 'sold_out' | 'disputed' | 'expired' | 'hidden';
export interface Report {
  id: string;
  clientId: string;            // idempotency key generated on device
  storeId: string;
  userId: string | null;       // null once author deleted their account
  status: ReportStatus;
  state: ReportState;
  priceCents: number | null;
  comment: string | null;
  photoPath: string | null; thumbPath: string | null;
  reporterDistanceM: number;
  isRemote: boolean;
  isFirstOfDay: boolean;
  reportedAt: string;          // observation time (captured on device, validated server-side)
  createdAt: string;           // server insert time (rate limits)
  expiresAt: string;
  confirmCount: number; denyCount: number; soldOutCount: number;
  firstConfirmedAt: string | null;
  trustScore: number;          // 0..100
}
```
**Relationships :** n-n avec `products` via `report_products` (avec `qty_estimate`), 1-n avec `report_votes` et `moderation_flags`.

## ReportVote, PushSubscription, ModerationFlag, StoreSlotStats
Voir le schéma SQL. `StoreSlotStats` (jour × créneau de 2 h, compteurs sur 90 jours et depuis l'origine) alimente la heatmap en V1 et **la prédiction en V2**.
