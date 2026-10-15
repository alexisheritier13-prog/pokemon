import { execSync } from 'node:child_process'
import type { TestProject } from 'vitest/node'

export type SupabaseTestConfig = { url: string; anonKey: string; serviceKey: string }

declare module 'vitest' {
  export interface ProvidedContext {
    supabase: SupabaseTestConfig
  }
}

// Reads the local stack's URL and keys once, refusing anything that is not local.
export default function setup(project: TestProject) {
  const raw = execSync('npx supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const status = JSON.parse(raw.slice(raw.indexOf('{'))) as Record<string, string>
  const url = status.API_URL
  const anonKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY
  const serviceKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    throw new Error('Local Supabase is not running. Start it with `npx supabase start`.')
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error(`Integration tests only run against a local stack, got ${url}`)
  }
  project.provide('supabase', { url, anonKey, serviceKey })
}
