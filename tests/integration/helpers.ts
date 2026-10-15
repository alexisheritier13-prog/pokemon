import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { inject } from 'vitest'

const config = inject('supabase')

const options = { auth: { persistSession: false, autoRefreshToken: false } }

export function anonClient(): SupabaseClient {
  return createClient(config.url, config.anonKey, options)
}

// Service-role client: bypasses RLS. Used only to arrange test data.
export const admin: SupabaseClient = createClient(config.url, config.serviceKey, options)

export type TestUser = { id: string; email: string; client: SupabaseClient }

// Creates a confirmed local test account and returns a client signed in as that user.
export async function createUser(): Promise<TestUser> {
  const email = `test-${randomUUID()}@example.test`
  const password = `${randomUUID()}Aa1!`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  const client = anonClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return { id: data.user.id, email, client }
}

export async function setRole(userId: string, role: 'user' | 'admin') {
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

export async function ban(userId: string) {
  const { error } = await admin
    .from('profiles')
    .update({ banned_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

export function point(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

type StoreInput = {
  name?: string
  lat: number
  lng: number
  status?: 'pending' | 'active' | 'rejected' | 'disabled'
  department?: string
  created_by?: string | null
}

export async function createStore(input: StoreInput) {
  const { data, error } = await admin
    .from('stores')
    .insert({
      name: input.name ?? `Magasin test ${randomUUID().slice(0, 8)}`,
      department: input.department ?? '84',
      location: point(input.lat, input.lng),
      status: input.status ?? 'active',
      created_by: input.created_by ?? null,
    })
    .select('id, name, status')
    .single()
  if (error) throw error
  return data as { id: string; name: string; status: string }
}

// Point at roughly `meters` north of the given coordinates.
export function offsetNorth(lat: number, lng: number, meters: number) {
  return { lat: lat + meters / 111_320, lng }
}
