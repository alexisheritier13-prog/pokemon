import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('applies defaults and treats empty strings as unset', () => {
    const env = parseEnv({ VITE_SUPABASE_URL: '', VITE_APP_ENV: '' })
    expect(env.VITE_SUPABASE_URL).toBeUndefined()
    expect(env.VITE_APP_ENV).toBe('local')
    expect(env.VITE_GEOCODER_URL).toBe('https://data.geopf.fr/geocodage')
  })

  it('rejects malformed values with a readable message', () => {
    expect(() => parseEnv({ VITE_SUPABASE_URL: 'not-a-url' })).toThrow(/VITE_SUPABASE_URL/)
  })
})
