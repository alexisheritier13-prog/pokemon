# Frontend Architecture

## Component Architecture

### Component Organization
```text
src/
├── app/                 # App.tsx, router.tsx, providers.tsx, layouts (AppShell, AdminShell)
├── components/ui/       # design system: PressButton, Chip, Sheet, Toast, Badge, ReportCard,
│                        #   HoloLayer, MapMarkerSprite, EmptyState, Skeleton, Heatmap
├── features/
│   ├── auth/            # login sheet, magic link, OAuth callbacks, RequireAuth
│   ├── onboarding/      # intro screens, zone picker, products picker
│   ├── map/             # MapView (lazy maplibre), useLaunchStores, StoreSheet, ListView
│   ├── store/           # StorePage, OpeningHours (lazy), HeatmapSection, ProposeStore
│   ├── report/          # ReportFlow, useCreateReport, photo capture
│   ├── feed/            # FeedPage, filters, useFeed, useRealtimeReports
│   ├── vote/            # VoteBar, useCastVote
│   ├── account/         # AccountPage, TrainerCard, AlertPrefs, MyReports, MyData
│   ├── push/            # usePushSubscription, IosInstallGuide, test push
│   ├── offline/         # outbox (idb), OfflineBanner, flush logic
│   ├── legal/           # mentions, confidentialité, CGU (MD → JSX)
│   ├── admin/           # catalogue, stores review, moderation, users, health (lazy chunk)
│   └── design/          # /design page (DEV only)
├── lib/                 # supabase.ts, queryClient.ts, geo.ts, image.ts, platform.ts, time.ts, errors.ts
├── copy/fr.ts           # every UI string and error-code message
├── config/              # app.ts (APP_NAME…), env.ts (Zod-validated import.meta.env)
├── design/              # tokens.css (@theme), fonts.css, motion.ts
├── sw/service-worker.ts
└── types/               # database.ts (generated), domain.ts
```

### Component Template
```typescript
import { cn } from '@/lib/cn';
import type { ReportStatus } from '@/types/domain';
import { copy } from '@/copy/fr';

type StatusBandProps = { status: ReportStatus; rarity: 1 | 2 | 3; remote?: boolean };

export function StatusBand({ status, rarity, remote = false }: StatusBandProps) {
  return (
    <div className={cn('flex items-center justify-between rounded-md px-3 py-2 font-display-band', bandClass[status])}>
      <span className="flex items-center gap-2">
        <StatusIcon status={status} aria-hidden />
        {copy.status[status]}
        {remote && <span className="chip-remote">{copy.report.remote}</span>}
      </span>
      <Rarity value={rarity} label={copy.report.rarity(rarity)} />
    </div>
  );
}

const bandClass: Record<ReportStatus, string> = {
  in_stock: 'bg-status-ok text-on-status',
  low_stock: 'bg-status-low text-ink',
  out_of_stock: 'bg-status-out text-on-status',
  restock_incoming: 'bg-status-soon text-on-status',
};
```
Règles : un composant par fichier, export nommé, props typées, **aucune couleur ni taille littérale** (classes issues des tokens), aucun texte en dur (`copy`).

## State Management Architecture

### State Structure
```typescript
// Server state: TanStack Query keys
export const qk = {
  config: ['config'] as const,
  me: ['me'] as const,
  stores: ['stores', 'launch'] as const,
  store: (id: string) => ['store', id] as const,
  heatmap: (id: string) => ['store', id, 'heatmap'] as const,
  feed: (f: FeedFilters) => ['feed', f] as const,
  report: (id: string) => ['report', id] as const,
  catalog: ['catalog'] as const,
};

// Device UI state (Zustand + persist, localStorage)
type UiState = {
  viewMode: 'map' | 'list';
  feedFilters: FeedFilters;
  guestZone: { lat: number; lng: number; label: string; radiusKm: number } | null; // anonymous onboarding
  guestProducts: string[];
  lastReportDraft: { storeId: string; productIds: string[]; at: number } | null; // 30-min memory
};
```

### State Management Patterns
- Toutes les données serveur passent par TanStack Query : `staleTime` 30 s pour le fil, 24 h pour les magasins et le catalogue, 5 min pour la config.
- Les mutations (vote, favori) sont **optimistes**, avec rollback et toast en cas d'erreur.
- Le cache des requêtes est persisté dans IndexedDB (`persistQueryClient`, `maxAge` 24 h, liste blanche : magasins, catalogue, fil, détails de signalements consultés, fiches).
- La position n'est jamais persistée en précision fine. On garde en mémoire la dernière position (`useGeolocation`, 2 min), et seule une zone arrondie à 0,01° est mémorisée pour les invités.

## Routing Architecture

### Route Organization
```text
/                       Carte (lazy MapView) | ?vue=liste
/fil                    Fil
/signaler               Parcours de signalement (RequireAuth)
/m/:storeId             Fiche magasin
/m/proposer             Proposer un magasin (RequireAuth)
/r/:reportId            Détail d'un signalement
/bienvenue              Onboarding
/connexion              Connexion · /auth/callback (OAuth + magic link)
/compte                 Compte (RequireAuth) + /alertes /signalements /favoris /donnees
/legal/:page            mentions | confidentialite | cgu
/admin/*                AdminShell (RequireRole admin, chunk séparé)
/design                 DEV uniquement (exclu du build prod)
```

### Protected Route Pattern
```typescript
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return <ScreenSkeleton />;
  if (!session) return <Navigate to="/connexion" replace state={{ from: location }} />;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: 'admin'; children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <ScreenSkeleton />;
  if (me?.profile.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>; // UI guard only: every admin RPC re-checks private.is_admin()
}
```

## Frontend Services Layer

### API Client Setup
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from '@/config/env';

export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  realtime: { params: { eventsPerSecond: 5 } },
});
```

### Service Example
```typescript
export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const payload = createReportSchema.parse(input);
      const { data, error } = await supabase.rpc('create_report', {
        p_client_id: payload.clientId,
        p_store_id: payload.storeId,
        p_lat: payload.lat,
        p_lng: payload.lng,
        p_status: payload.status,
        p_products: payload.products,
        p_price_cents: payload.priceCents ?? null,
        p_comment: payload.comment ?? null,
        p_captured_at: payload.capturedAt,
      });
      if (error) throw toAppError(error); // maps P0001 message → AppError(code, detail)
      return data;
    },
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: qk.stores });
      qc.setQueryData(qk.report(report.id), report);
    },
  });
}
```

## Carte : choix d'implémentation
- MapLibre est importé dynamiquement dans `MapView` (chunk séparé). Le premier rendu est un squelette papier.
- Les données viennent d'une source GeoJSON `stores` (`cluster: true`, `clusterRadius: 48`) construite depuis `get_launch_stores`.
- Les marqueurs sont une **couche symbole** : chaque statut est un sprite SVG rasterisé au `devicePixelRatio` et ajouté par `map.addImage`.
- Le style clair ou sombre suit le thème (`prefers-color-scheme`).
- Le statut courant se rafraîchit toutes les 60 s quand la carte est visible, et immédiatement sur un évènement temps réel concernant le magasin.

## Photos : pipeline client
1. `createImageBitmap(file, { imageOrientation: 'from-image' })` applique l'orientation EXIF.
2. Dessin sur canvas en 1600 px (côté long), puis 480 px pour la vignette.
3. `toBlob('image/webp', 0.8)`. Si le blob obtenu n'est pas en WebP (cas de Safari), nouvel essai en `image/jpeg` à 0,82.
4. Le ré-encodage canvas ne transporte **aucune métadonnée**. Le serveur le vérifie quand même.
