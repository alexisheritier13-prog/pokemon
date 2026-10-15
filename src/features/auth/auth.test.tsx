import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from './auth-context'
import { enabledAuthMethods } from './providers'
import { RequireAuth } from './RequireAuth'
import { consumeReturnTo, rememberReturnTo, sanitizeReturnPath } from './returnTo'

const api = vi.hoisted(() => ({
  sendEmailCode: vi.fn(async () => undefined),
  verifyEmailCode: vi.fn(async () => undefined),
  signInWithProvider: vi.fn(async () => undefined),
}))

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>()
  return { ...actual, ...api }
})

const { LoginPage } = await import('./LoginPage')

function renderWithAuth(ui: ReactNode, state: AuthState, path = '/') {
  const router = createMemoryRouter(
    [
      { path: '/', element: ui },
      { path: '/connexion', element: <p>Écran de connexion</p> },
      { path: '/signaler', element: <p>Écran de signalement</p> },
    ],
    { initialEntries: [path] },
  )
  render(
    <AuthContext.Provider value={state}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
}

const anonymous: AuthState = { status: 'anonymous', session: null }

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('enabledAuthMethods', () => {
  it('always offers e-mail and keeps Apple off unless listed', () => {
    expect([...enabledAuthMethods('email')]).toEqual(['email'])
    expect([...enabledAuthMethods('email, google')]).toEqual(['email', 'google'])
    expect(enabledAuthMethods('google,apple,unknown').has('apple')).toBe(true)
    expect(enabledAuthMethods('').has('apple')).toBe(false)
  })
})

describe('return path', () => {
  it('only keeps same-origin app paths', () => {
    expect(sanitizeReturnPath('/signaler')).toBe('/signaler')
    expect(sanitizeReturnPath('https://evil.example')).toBe('/')
    expect(sanitizeReturnPath('//evil.example')).toBe('/')
    expect(sanitizeReturnPath('/connexion')).toBe('/')
  })

  it('is consumed once', () => {
    rememberReturnTo('/compte')
    expect(consumeReturnTo()).toBe('/compte')
    expect(consumeReturnTo()).toBe('/')
  })
})

describe('LoginPage', () => {
  it('requests a code, then verifies the 6 digits', async () => {
    renderWithAuth(<LoginPage />, anonymous)
    await userEvent.type(screen.getByLabelText('Ton adresse e-mail'), 'sacha@example.org')
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }))
    expect(api.sendEmailCode).toHaveBeenCalledWith('sacha@example.org')

    expect(await screen.findByRole('heading', { name: 'Regarde tes e-mails' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Code à 6 chiffres'), '12a3456')
    await userEvent.click(screen.getByRole('button', { name: 'Me connecter' }))
    expect(api.verifyEmailCode).toHaveBeenCalledWith('sacha@example.org', '123456')
  })

  it('rejects an invalid address without calling the server', async () => {
    renderWithAuth(<LoginPage />, anonymous)
    await userEvent.type(screen.getByLabelText('Ton adresse e-mail'), 'pas-une-adresse')
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }))
    expect(api.sendEmailCode).not.toHaveBeenCalled()
    expect(screen.getByText('Cette adresse ne semble pas valide.')).toBeInTheDocument()
  })

  it('hides Google and Apple unless enabled', () => {
    renderWithAuth(<LoginPage />, anonymous)
    expect(screen.queryByRole('button', { name: 'Continuer avec Google' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continuer avec Apple' })).not.toBeInTheDocument()
  })

  it('sends signed-in visitors back to where they were going', async () => {
    rememberReturnTo('/signaler')
    const session = { user: { id: 'u1' } } as unknown as AuthState['session']
    renderWithAuth(<LoginPage />, { status: 'authenticated', session } as AuthState)
    expect(await screen.findByText('Écran de signalement')).toBeInTheDocument()
  })
})

describe('RequireAuth', () => {
  it('redirects anonymous visitors to the login screen and remembers the target', async () => {
    renderWithAuth(
      <RequireAuth>
        <p>Contenu réservé</p>
      </RequireAuth>,
      anonymous,
    )
    expect(await screen.findByText('Écran de connexion')).toBeInTheDocument()
    expect(screen.queryByText('Contenu réservé')).not.toBeInTheDocument()
    expect(consumeReturnTo()).toBe('/')
  })
})
