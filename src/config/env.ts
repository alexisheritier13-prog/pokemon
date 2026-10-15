import * as z from 'zod/mini'

// zod/mini keeps the initial bundle small; full zod stays available inside lazy feature chunks.
const envSchema = z.object({
  // Required from story 1.5 (Supabase) and 4.1 (push); optional until then.
  VITE_SUPABASE_URL: z.optional(z.url()),
  VITE_SUPABASE_ANON_KEY: z.optional(z.string().check(z.minLength(1))),
  VITE_VAPID_PUBLIC_KEY: z.optional(z.string().check(z.minLength(1))),
  VITE_GEOCODER_URL: z._default(z.url(), 'https://data.geopf.fr/geocodage'),
  VITE_APP_ENV: z._default(z.enum(['local', 'preview', 'production']), 'local'),
  // Comma-separated sign-in methods shown on the login screen. Apple stays off until configured.
  VITE_AUTH_PROVIDERS: z._default(z.string(), 'email'),
})

export type Env = z.infer<typeof envSchema>

const keys = Object.keys(envSchema.def.shape) as Array<keyof Env>

export function parseEnv(source: Record<string, unknown>): Env {
  // Empty strings from .env files mean "not set".
  const cleaned = Object.fromEntries(
    keys.map((key) => [key, source[key] === '' ? undefined : source[key]]),
  )
  const result = envSchema.safeParse(cleaned)
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

// The only place allowed to read import.meta.env (coding standards).
export const env = parseEnv(import.meta.env)
