// Remembers where the visitor was going before signing in. OAuth and e-mail links leave the app,
// so the target survives in sessionStorage rather than router state.
const KEY = 'rr-auth-return'

function safePath(path: string | null | undefined): string {
  // Only same-origin app paths: never redirect to an external URL.
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/'
  if (path.startsWith('/connexion') || path.startsWith('/auth/')) return '/'
  return path
}

export function rememberReturnTo(path: string) {
  try {
    sessionStorage.setItem(KEY, safePath(path))
  } catch {
    // Private mode: fall back to the home page after sign-in.
  }
}

export function consumeReturnTo(): string {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return safePath(value)
  } catch {
    return '/'
  }
}

export { safePath as sanitizeReturnPath }
