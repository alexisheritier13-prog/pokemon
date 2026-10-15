import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  admin,
  anonClient,
  ban,
  createStore,
  createUser,
  offsetNorth,
  type TestUser,
} from './helpers.ts'

let productId: string

beforeAll(async () => {
  const { data, error } = await admin
    .from('products')
    .select('id')
    .eq('name', 'Display 36 boosters')
    .single()
  if (error) throw error
  productId = data.id
})

// Random empty area so the store cooldown and first-of-day logic never collide between runs.
function randomPoint() {
  return { lat: 45 + Math.random() * 2, lng: 1 + Math.random() * 2 }
}

function args(
  storeId: string,
  at: { lat: number; lng: number },
  extra: Record<string, unknown> = {},
) {
  return {
    p_client_id: randomUUID(),
    p_store_id: storeId,
    p_lat: at.lat,
    p_lng: at.lng,
    p_status: 'in_stock',
    p_products: [{ product_id: productId, qty: 3 }],
    p_captured_at: new Date().toISOString(),
    ...extra,
  }
}

async function report(
  user: TestUser,
  storeId: string,
  at: { lat: number; lng: number },
  extra = {},
) {
  return user.client.rpc('create_report', args(storeId, at, extra))
}

describe('create_report — position', () => {
  it('accepts a report made within 300 m and stores only the distance', async () => {
    const user = await createUser()
    const spot = randomPoint()
    const store = await createStore(spot)
    const { data, error } = await report(user, store.id, offsetNorth(spot.lat, spot.lng, 120))
    expect(error).toBeNull()
    expect(data.reporter_distance_m).toBeGreaterThan(100)
    expect(data.reporter_distance_m).toBeLessThan(140)
    expect(data.is_remote).toBe(false)
    expect(data.is_first_of_day).toBe(true)
    expect(data).not.toHaveProperty('lat')
    const expiresIn = (new Date(data.expires_at).getTime() - Date.now()) / 3_600_000
    expect(expiresIn).toBeGreaterThan(5.9)
    expect(expiresIn).toBeLessThan(6.1)
  })

  it('refuses a report made 450 m away', async () => {
    const user = await createUser()
    const spot = randomPoint()
    const store = await createStore(spot)
    const { error } = await report(user, store.id, offsetNorth(spot.lat, spot.lng, 450))
    expect(error?.message).toBe('too_far')
    expect(JSON.parse(error!.details!).distance_m).toBeGreaterThan(400)
  })

  it('lets a high-reputation reporter report remotely, flagged as such', async () => {
    const user = await createUser()
    await admin.from('profiles').update({ reputation_score: 200 }).eq('id', user.id)
    const spot = randomPoint()
    const store = await createStore(spot)
    const { data, error } = await report(user, store.id, offsetNorth(spot.lat, spot.lng, 5_000))
    expect(error).toBeNull()
    expect(data.is_remote).toBe(true)
  })
})

describe('create_report — rate limits', () => {
  it('allows one report per store every 30 minutes', async () => {
    const user = await createUser()
    const spot = randomPoint()
    const store = await createStore(spot)
    expect((await report(user, store.id, spot)).error).toBeNull()
    const { error } = await report(user, store.id, spot)
    expect(error?.message).toBe('rate_limited_store')
    expect(JSON.parse(error!.details!).retry_in_min).toBeGreaterThan(25)
  })

  it('caps a user at 10 reports per hour', async () => {
    const user = await createUser()
    for (let i = 0; i < 10; i++) {
      const spot = randomPoint()
      const store = await createStore(spot)
      expect((await report(user, store.id, spot)).error).toBeNull()
    }
    const spot = randomPoint()
    const store = await createStore(spot)
    const { error } = await report(user, store.id, spot)
    expect(error?.message).toBe('rate_limited_user')
  })
})

describe('create_report — integrity', () => {
  it('is idempotent on client_id (offline retries) and refuses a stolen client_id', async () => {
    const user = await createUser()
    const other = await createUser()
    const spot = randomPoint()
    const store = await createStore(spot)
    const payload = args(store.id, spot)
    const first = await user.client.rpc('create_report', payload)
    const again = await user.client.rpc('create_report', payload)
    expect(again.error).toBeNull()
    expect(again.data.id).toBe(first.data.id)
    const stolen = await other.client.rpc('create_report', payload)
    expect(stolen.error?.message).toBe('client_id_conflict')
  })

  it('refuses captures older than 2 hours and unknown products', async () => {
    const user = await createUser()
    const spot = randomPoint()
    const store = await createStore(spot)
    const old = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect((await report(user, store.id, spot, { p_captured_at: old })).error?.message).toBe(
      'capture_too_old',
    )
    const bad = await report(user, store.id, spot, { p_products: [{ product_id: randomUUID() }] })
    expect(bad.error?.message).toBe('invalid_products')
    const empty = await report(user, store.id, spot, { p_products: [] })
    expect(empty.error?.message).toBe('invalid_products')
  })

  it('refuses banned users, anonymous callers and direct table writes', async () => {
    const user = await createUser()
    const spot = randomPoint()
    const store = await createStore(spot)
    await ban(user.id)
    expect((await report(user, store.id, spot)).error?.message).toBe('banned')

    const anon = await anonClient().rpc('create_report', args(store.id, spot))
    expect(anon.error).not.toBeNull()

    const fresh = await createUser()
    const direct = await fresh.client.from('reports').insert({
      client_id: randomUUID(),
      store_id: store.id,
      status: 'in_stock',
      reporter_distance_m: 0,
      reported_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    })
    expect(direct.error).not.toBeNull()
  })
})

describe('store status and expiry', () => {
  it('shows the latest valid report on the map, then nothing once expired', async () => {
    const user = await createUser()
    const spot = randomPoint()
    const store = await createStore({ ...spot, department: '84' })
    const { data: created } = await report(user, store.id, spot, { p_status: 'low_stock' })

    const statusOf = async () => {
      const { data } = await anonClient().rpc('get_launch_stores')
      return (data as Array<{ id: string; status: string | null }>).find((s) => s.id === store.id)
        ?.status
    }
    expect(await statusOf()).toBe('low_stock')

    await admin
      .from('reports')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('id', created.id)
    expect((await admin.rpc('svc_run_jobs')).error).toBeNull()
    const { data: after } = await admin
      .from('reports')
      .select('state, finalized_at')
      .eq('id', created.id)
      .single()
    expect(after?.state).toBe('expired')
    expect(after?.finalized_at).not.toBeNull()
    expect(await statusOf()).toBeNull()
  })

  it('counts positive reports by weekday and 2-hour slot', async () => {
    const user = await createUser()
    const spot = randomPoint()
    const store = await createStore(spot)
    await report(user, store.id, spot)
    await admin.rpc('svc_run_jobs')
    const { data } = await anonClient()
      .from('store_slot_stats')
      .select('n_90d')
      .eq('store_id', store.id)
    expect(data?.reduce((sum, row) => sum + (row.n_90d as number), 0)).toBe(1)
  })
})
