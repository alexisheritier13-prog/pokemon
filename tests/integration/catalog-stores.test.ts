import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { admin, anonClient, ban, createStore, createUser, offsetNorth, setRole } from './helpers.ts'

let gameId: string

beforeAll(async () => {
  const { data, error } = await admin
    .from('games')
    .upsert({ slug: 'test-game', name: 'Test game' }, { onConflict: 'slug' })
    .select('id')
    .single()
  if (error) throw error
  gameId = data.id
})

describe('products RLS', () => {
  it('shows active products to everyone and hides inactive ones', async () => {
    const tag = randomUUID().slice(0, 8)
    const { error } = await admin.from('products').insert([
      { game_id: gameId, name: `Actif ${tag}`, type: 'display', is_active: true },
      { game_id: gameId, name: `Inactif ${tag}`, type: 'display', is_active: false },
    ])
    expect(error).toBeNull()
    const { data } = await anonClient()
      .from('products')
      .select('name')
      .in('name', [`Actif ${tag}`, `Inactif ${tag}`])
    expect(data?.map((p: { name: string }) => p.name)).toEqual([`Actif ${tag}`])
  })

  it('only lets admins write the catalog', async () => {
    const user = await createUser()
    const denied = await user.client
      .from('products')
      .insert({ game_id: gameId, name: 'Pirate', type: 'tin' })
    expect(denied.error).not.toBeNull()

    const boss = await createUser()
    await setRole(boss.id, 'admin')
    const allowed = await boss.client
      .from('products')
      .insert({ game_id: gameId, name: `Admin ${randomUUID().slice(0, 6)}`, type: 'tin' })
    expect(allowed.error).toBeNull()
  })
})

describe('stores RLS', () => {
  it('shows active stores to everyone, pending ones to their author and admins only', async () => {
    const author = await createUser()
    const stranger = await createUser()
    const boss = await createUser()
    await setRole(boss.id, 'admin')
    const pending = await createStore({
      lat: 43.9,
      lng: 4.8,
      status: 'pending',
      created_by: author.id,
    })

    const see = async (client: ReturnType<typeof anonClient>) =>
      (await client.from('stores').select('id').eq('id', pending.id)).data?.length ?? 0

    expect(await see(anonClient())).toBe(0)
    expect(await see(stranger.client)).toBe(0)
    expect(await see(author.client)).toBe(1)
    expect(await see(boss.client)).toBe(1)
  })

  it('refuses direct store edits and creation by regular users', async () => {
    const user = await createUser()
    const store = await createStore({ lat: 43.91, lng: 4.81 })
    const { data } = await user.client
      .from('stores')
      .update({ name: 'Renommé' })
      .eq('id', store.id)
      .select('id')
    expect(data).toEqual([])
    const insert = await user.client
      .from('stores')
      .insert({ name: 'Faux magasin', department: '84', location: 'SRID=4326;POINT(4.8 43.9)' })
    expect(insert.error).not.toBeNull()
  })
})

describe('get_stores_within', () => {
  it('returns active stores inside the radius, nearest first', async () => {
    // Random empty area each run, so stores left by previous runs never interfere.
    const center = { lat: 45 + Math.random() * 2, lng: 1 + Math.random() * 2 }
    const near = await createStore({ ...offsetNorth(center.lat, center.lng, 500), name: 'Proche' })
    const mid = await createStore({ ...offsetNorth(center.lat, center.lng, 4_000), name: 'Moyen' })
    const far = await createStore({ ...offsetNorth(center.lat, center.lng, 30_000), name: 'Loin' })
    const hidden = await createStore({
      ...offsetNorth(center.lat, center.lng, 800),
      status: 'pending',
    })

    const { data, error } = await anonClient().rpc('get_stores_within', {
      p_lat: center.lat,
      p_lng: center.lng,
      p_radius_km: 10,
    })
    expect(error).toBeNull()
    const ids = (data as Array<{ id: string; distance_m: number }>).map((s) => s.id)
    expect(ids).toEqual([near.id, mid.id])
    expect(ids).not.toContain(far.id)
    expect(ids).not.toContain(hidden.id)
    const first = (data as Array<{ distance_m: number }>)[0]!
    expect(first.distance_m).toBeGreaterThan(450)
    expect(first.distance_m).toBeLessThan(550)
  })
})

describe('store_favorites', () => {
  it('lets users manage their own favorites only', async () => {
    const alice = await createUser()
    const bob = await createUser()
    const store = await createStore({ lat: 43.92, lng: 4.82 })

    expect(
      (await alice.client.from('store_favorites').insert({ user_id: alice.id, store_id: store.id }))
        .error,
    ).toBeNull()
    expect(
      (await alice.client.from('store_favorites').insert({ user_id: bob.id, store_id: store.id }))
        .error,
    ).not.toBeNull()

    const { data: bobView } = await bob.client
      .from('store_favorites')
      .select('*')
      .eq('user_id', alice.id)
    expect(bobView).toEqual([])
  })

  it('blocks banned users from adding favorites', async () => {
    const user = await createUser()
    const store = await createStore({ lat: 43.93, lng: 4.83 })
    await ban(user.id)
    const { error } = await user.client
      .from('store_favorites')
      .insert({ user_id: user.id, store_id: store.id })
    expect(error).not.toBeNull()
  })
})
