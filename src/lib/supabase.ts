import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

// supabase-js weighs ~80 kB gzip: it is loaded on first use, never in the initial bundle (NFR3).
let clientPromise: Promise<SupabaseClient | null> | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
}

// Single Supabase client for the app. Resolves to null until the project URL and public key are set.
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    clientPromise = isSupabaseConfigured()
      ? import('@supabase/supabase-js').then(({ createClient }) =>
          createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              flowType: 'pkce',
            },
          }),
        )
      : Promise.resolve(null)
  }
  return clientPromise
}
