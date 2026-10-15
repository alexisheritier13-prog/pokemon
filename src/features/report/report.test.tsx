import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '@/features/auth/auth-context'
import type { LaunchStore } from '@/features/map/api'
import { reportErrorMessage } from './reportErrors'

const here = { lat: 43.9493, lng: 4.8055 }

const stores: Partial<LaunchStore>[] = [
  { id: 'far', name: 'Cultura Marseille', city: 'Marseille', lat: 43.2965, lng: 5.3698 },
  { id: 'near', name: 'Level Games', city: 'Avignon', lat: 43.9496, lng: 4.8058 },
]

const mutate = vi.fn()

vi.mock('@/features/location/useConsentedLocation', () => ({
  useConsentedLocation: () => ({
    state: { status: 'located', position: here, accuracy: 10 },
    request: vi.fn(),
    consentSheet: null,
  }),
}))
vi.mock('@/features/map/api', () => ({ useLaunchStores: () => ({ data: stores }) }))
vi.mock('./api', () => ({
  useProducts: () => ({
    data: [
      { id: 'p-display', name: 'Display 36 boosters', type: 'display', sort_order: 20 },
      { id: 'p-etb', name: 'Coffret Dresseur d’Élite (ETB)', type: 'etb', sort_order: 30 },
    ],
  }),
  useCreateReport: () => ({ mutate, isPending: false }),
}))

const { ReportPage } = await import('./ReportPage')

const session = { user: { id: 'u1' } } as unknown as AuthState['session']

function renderFlow() {
  const router = createMemoryRouter([{ path: '/signaler', element: <ReportPage /> }], {
    initialEntries: ['/signaler'],
  })
  render(
    <AuthContext.Provider value={{ status: 'authenticated', session } as AuthState}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
}

// Braces matter: a function returned from beforeEach is treated as a teardown and called.
beforeEach(() => {
  mutate.mockReset()
})

describe('ReportPage', () => {
  it('preselects the nearest store and requires products and a status', async () => {
    renderFlow()
    expect(screen.getByText('Level Games')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choisis au moins un produit et un statut.')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('sends the report with the precise position, products, quantity and status', async () => {
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: 'Display 36 boosters' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Quantité estimée + Display 36 boosters' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Quantité estimée + Display 36 boosters' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Stock faible' }))
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))
    expect(mutate).toHaveBeenCalledOnce()
    const [input] = mutate.mock.calls[0]!
    expect(input).toMatchObject({
      storeId: 'near',
      lat: here.lat,
      lng: here.lng,
      status: 'low_stock',
      products: [{ productId: 'p-display', qty: 2 }],
      priceCents: null,
      comment: null,
    })
    expect(input.clientId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('shows the celebration once the server accepts', async () => {
    mutate.mockImplementation((_input, options) =>
      options.onSuccess({ id: 'r1', store_id: 'near' }),
    )
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: 'Display 36 boosters' }))
    await userEvent.click(screen.getByRole('button', { name: 'En stock' }))
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Restock repéré !' })).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'Voir le magasin' })).toHaveAttribute('href', '/m/near')
  })

  it('explains a server refusal', async () => {
    mutate.mockImplementation((_input, options) =>
      options.onError({ code: 'too_far', detail: { distance_m: 412 } }),
    )
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: 'Display 36 boosters' }))
    await userEvent.click(screen.getByRole('button', { name: 'En stock' }))
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Tu es à 412 m du magasin')
  })
})

describe('reportErrorMessage', () => {
  it('turns server codes into actionable French messages', () => {
    expect(reportErrorMessage({ code: 'rate_limited_store', detail: { retry_in_min: 27 } })).toBe(
      'Tu as déjà signalé ce magasin. Réessaie dans 27 min.',
    )
    expect(reportErrorMessage({ code: 'banned', detail: {} })).toContain('ne peut plus publier')
    expect(reportErrorMessage({ code: 'something_new', detail: {} })).toContain('n’est pas passé')
  })
})
