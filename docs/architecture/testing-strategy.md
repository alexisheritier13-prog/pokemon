# Testing Strategy

## Testing Pyramid
```text
          E2E Playwright (4 parcours + axe)
        Intégration (RPC, RLS, triggers, cron) — Vitest sur supabase start
   Unitaires (trust/rarity, geo, time, image, filtres, mapping erreurs, composants clés)
```

## Test Organization

### Frontend Tests
Tests colocalisés `src/**/*.test.ts(x)` : logique pure (`lib/`), hooks via `renderHook`, composants du design system (états, a11y de base, `aria-pressed`, libellés de statut).

### Backend Tests
```text
tests/integration/
├── helpers/ (clients anon/user/admin, factories, geo points à X m d'un magasin)
├── rls.profiles.test.ts      rls.reports.test.ts    rls.misc.test.ts
├── create_report.test.ts     # distance, remote, rate limits, idempotence, capture_too_old, banned
├── cast_vote.test.ts         # distance, unicité, own, expired, plus rien, contesté, réputation
├── push_targeting.test.ts    # rayon, favoris, produits/types, enseignes, heures silencieuses, dédoublonnage 2 h
├── jobs.test.ts              # finalize (photo_kept, vote_coherent), stats jour × créneau
└── edge/                     # upload-report-photo (EXIF refusé, signature), delete-account
```

### E2E Tests
```text
e2e/
├── anonymous-browse.spec.ts  # carte → liste → fiche, sans compte
├── report-flow.spec.ts       # connexion (OTP local via Inbucket/Mailpit), signalement + photo
├── vote.spec.ts              # 2e utilisateur vote sur place
└── onboarding-alerts.spec.ts # zone + produits + préférences (permission push simulée)
```

## Test Examples

### Frontend Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { StatusBand } from '@/components/ui/StatusBand';

it('exposes status in text, not only color', () => {
  render(<StatusBand status="low_stock" rarity={2} />);
  expect(screen.getByText('Stock faible')).toBeInTheDocument();
  expect(screen.getByLabelText('Fiabilité 2 sur 3')).toBeInTheDocument();
});
```

### Backend API Test
```typescript
it('refuses a report made 450 m away', async () => {
  const user = await signUpUser();
  const store = await createStore({ lat: 43.9493, lng: 4.8055 });
  const far = offsetMeters(store, 450);
  const { error } = await user.rpc('create_report', reportArgs(store.id, far));
  expect(error?.message).toBe('too_far');
  expect(JSON.parse(error!.details!).distance_m).toBeGreaterThan(300);
});
```

### E2E Test
```typescript
test('anonymous user can open a store from the list', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 43.9493, longitude: 4.8055 });
  await page.goto('/?vue=liste');
  await page.getByRole('link', { name: /Cultura/ }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cultura');
  await expect(page.getByRole('button', { name: 'Y aller' })).toBeVisible();
});
```
