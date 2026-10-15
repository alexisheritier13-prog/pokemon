import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthContext } from '@/features/auth/auth-context'
import { consumeReturnTo } from '@/features/auth/returnTo'
import type { StoreDetail } from './api'

const store: StoreDetail = {
  id: 's1',
  name: 'Level Games',
  status: 'active',
  brand_slug: 'independant',
  brand_name: 'Boutique indépendante',
  brand_kind: 'tcg_shop',
  category_color: 'plante',
  address: '12 Rue de la République',
  city: 'Avignon',
  postcode: '84000',
  department: '84',
  opening_hours: 'Tu-Sa 10:00-12:00,14:00-19:00',
  lat: 43.95,
  lng: 4.81,
  current_report_id: null,
  current_status: null,
  current_state: null,
  current_reported_at: null,
  current_trust: null,
  current_confirm_count: null,
}

vi.mock('./api', () => ({
  useStore: (id: string) => ({ data: id === 's1' ? store : null, isLoading: false }),
  useFavorite: () => ({ isFavorite: false, toggle: { mutate: vi.fn() } }),
}))

const { StorePage } = await import('./StorePage')

function renderStore(id: string) {
  const router = createMemoryRouter(
    [
      { path: '/m/:storeId', element: <StorePage /> },
      { path: '/connexion', element: <p>Écran de connexion</p> },
    ],
    { initialEntries: [`/m/${id}`] },
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <AuthContext.Provider value={{ status: 'anonymous', session: null }}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('StorePage', () => {
  it('shows the store, its address, weekly hours and a directions link', () => {
    renderStore('s1')
    expect(screen.getByRole('heading', { level: 1, name: 'Level Games' })).toBeInTheDocument()
    expect(screen.getByText('12 Rue de la République, 84000 Avignon')).toBeInTheDocument()
    expect(screen.getAllByText('10 h – 12 h, 14 h – 19 h')).toHaveLength(5)
    expect(screen.getAllByText('fermé')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Y aller/ })).toHaveAttribute(
      'href',
      expect.stringContaining('43.95,4.81'),
    )
  })

  it('asks anonymous visitors to sign in before adding a favorite', async () => {
    renderStore('s1')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter aux favoris' }))
    expect(await screen.findByText('Écran de connexion')).toBeInTheDocument()
    expect(consumeReturnTo()).toBe('/m/s1')
  })

  it('shows a friendly message for an unknown store', () => {
    renderStore('nope')
    expect(screen.getByRole('heading', { name: 'Magasin introuvable' })).toBeInTheDocument()
  })
})
