import { env } from '@/config/env'

export type AuthMethod = 'email' | 'google' | 'apple'

const known: ReadonlySet<AuthMethod> = new Set(['email', 'google', 'apple'])

// Parsed from VITE_AUTH_PROVIDERS ("email,google"). E-mail is always available.
export function enabledAuthMethods(raw: string = env.VITE_AUTH_PROVIDERS): Set<AuthMethod> {
  const methods = new Set<AuthMethod>(['email'])
  for (const part of raw.split(',')) {
    const value = part.trim().toLowerCase() as AuthMethod
    if (known.has(value)) methods.add(value)
  }
  return methods
}
