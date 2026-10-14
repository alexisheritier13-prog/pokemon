import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { APP_NAME, APP_VERSION } from '@/config/app'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('app shell', () => {
  it('shows the app name, version and non-affiliation notice on the canary page', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: APP_NAME })).toBeInTheDocument()
    expect(screen.getByText(`Version ${APP_VERSION}`)).toBeInTheDocument()
    expect(screen.getByText(/non affilié à Nintendo, The Pokémon Company/)).toBeInTheDocument()
  })

  it('renders the not-found page for unknown routes', () => {
    renderAt('/nulle-part')
    expect(screen.getByRole('heading', { level: 1, name: 'Fausse piste' })).toBeInTheDocument()
  })
})
