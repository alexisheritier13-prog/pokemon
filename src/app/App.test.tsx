import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { APP_VERSION } from '@/config/app'
import { ErrorPage } from './ErrorPage'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('app shell', () => {
  it('shows the four tabs with visible labels and the non-affiliation notice', async () => {
    renderAt('/')
    const nav = await screen.findByRole('navigation', { name: 'Navigation principale' })
    for (const name of ['Carte', 'Fil', 'Signaler', 'Compte']) {
      expect(nav).toContainElement(screen.getByRole('link', { name }))
    }
    expect(screen.getByText(/non affilié à Nintendo, The Pokémon Company/)).toBeInTheDocument()
    expect(screen.getByText(`Version ${APP_VERSION}`)).toBeInTheDocument()
  })

  it('marks the current tab and lazy-loads its page', async () => {
    renderAt('/fil')
    expect(
      await screen.findByRole('heading', { name: 'Calme plat dans le coin' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fil' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Carte' })).not.toHaveAttribute('aria-current')
  })

  it('navigates between tabs', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: 'La carte arrive' })
    await userEvent.click(screen.getByRole('link', { name: 'Compte' }))
    expect(await screen.findByRole('heading', { name: 'Ta carte de chasseur' })).toBeInTheDocument()
  })

  it('renders the not-found page inside the shell for unknown routes', async () => {
    renderAt('/nulle-part')
    expect(await screen.findByRole('heading', { name: 'Fausse piste' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
  })

  it('shows the error screen, inside the shell, when a route crashes', async () => {
    function Boom(): never {
      throw new Error('kaboom')
    }
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <nav aria-label="Navigation principale" />,
          children: [],
        },
        { path: '/crash', element: <Boom />, errorElement: <ErrorPage /> },
      ],
      { initialEntries: ['/crash'] },
    )
    render(<RouterProvider router={router} />)
    expect(
      await screen.findByRole('heading', { name: 'Le radar a pris un coup' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()
  })
})
