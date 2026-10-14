import { z } from 'zod'

// Empty strings from .env files mean "not set".
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional())

const envSchema = z.object({
  // Required from story 1.5 (Supabase) and 4.1 (push); optional until then.
  VITE_SUPABASE_URL: optional(z.url()),
  VITE_SUPABASE_ANON_KEY: optional(z.string().min(1)),
  VITE_VAPID_PUBLIC_KEY: optional(z.string().min(1)),
  VITE_GEOCODER_URL: z.preprocess(
    emptyToUndefined,
    z.url().default('https://data.geopf.fr/geocodage'),
  ),
  VITE_APP_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['local', 'preview', 'production']).default('local'),
  ),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, unknown>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

// The only place allowed to read import.meta.env (coding standards).
export const env = parseEnv(import.meta.env)
