import { describe, expect, it } from 'vitest'
import { admin, anonClient, ban, createUser } from './helpers.ts'

describe('signup trigger', () => {
  it('creates a profile with a generated pseudo, settings and default alert preferences', async () => {
    const user = await createUser()
    const { data: me, error } = await user.client.rpc('get_me')
    expect(error).toBeNull()
    expect(me.profile.pseudo).toMatch(/^Chasseur/)
    expect(me.profile.role).toBe('user')
    expect(me.profile.banned).toBe(false)
    expect(me.profile.badges).toEqual(['nouveau'])
    expect(me.alerts.radius_km).toBe(15)
    expect(me.alerts.trigger).toBe('first_confirm')
  })
})

describe('profiles RLS', () => {
  it('lets anyone read public columns but never banned_at', async () => {
    const user = await createUser()
    const anon = anonClient()
    const { data, error } = await anon.from('profiles').select('pseudo').eq('id', user.id).single()
    expect(error).toBeNull()
    expect(data?.pseudo).toMatch(/^Chasseur/)
    const { error: hidden } = await anon.from('profiles').select('banned_at').eq('id', user.id)
    expect(hidden).not.toBeNull()
  })

  it('lets a user rename themself, but not someone else', async () => {
    const alice = await createUser()
    const bob = await createUser()
    const newName = `Alice${alice.id.slice(0, 6)}`
    const { error } = await alice.client
      .from('profiles')
      .update({ pseudo: newName })
      .eq('id', alice.id)
    expect(error).toBeNull()

    const { data: hijack } = await alice.client
      .from('profiles')
      .update({ pseudo: 'Pirate1234' })
      .eq('id', bob.id)
      .select('id')
    expect(hijack).toEqual([])
    const { data: bobRow } = await admin.from('profiles').select('pseudo').eq('id', bob.id).single()
    expect(bobRow?.pseudo).not.toBe('Pirate1234')
  })

  it('refuses self-promotion to admin or editing reputation', async () => {
    const user = await createUser()
    const { error: role } = await user.client
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)
    expect(role).not.toBeNull()
    const { error: rep } = await user.client
      .from('profiles')
      .update({ reputation_score: 999 })
      .eq('id', user.id)
    expect(rep).not.toBeNull()
  })

  it('rejects invalid pseudos', async () => {
    const user = await createUser()
    const { error } = await user.client.from('profiles').update({ pseudo: 'ab' }).eq('id', user.id)
    expect(error).not.toBeNull()
  })

  it('blocks a banned user from editing their profile', async () => {
    const user = await createUser()
    await ban(user.id)
    const { data } = await user.client
      .from('profiles')
      .update({ avatar_key: 'lamp-2' })
      .eq('id', user.id)
      .select('id')
    expect(data).toEqual([])
  })
})

describe('user_settings', () => {
  it('snaps the home area to a ~1 km grid and keeps it private', async () => {
    const owner = await createUser()
    const other = await createUser()
    const { error } = await owner.client
      .from('user_settings')
      .update({ home_area: 'SRID=4326;POINT(4.80553 43.94931)' })
      .eq('user_id', owner.id)
    expect(error).toBeNull()

    const { data: me } = await owner.client.rpc('get_me')
    expect(me.settings.home_lat).toBeCloseTo(43.95, 6)
    expect(me.settings.home_lng).toBeCloseTo(4.81, 6)

    const { data: spied } = await other.client
      .from('user_settings')
      .select('*')
      .eq('user_id', owner.id)
    expect(spied).toEqual([])
    const { data: anonSpied, error: anonError } = await anonClient()
      .from('user_settings')
      .select('*')
    expect(anonSpied ?? []).toEqual([])
    expect(anonError === null || anonError.code === '42501').toBe(true)
  })
})

describe('alert_preferences', () => {
  it('lets the owner change the radius within bounds only', async () => {
    const user = await createUser()
    const ok = await user.client
      .from('alert_preferences')
      .update({ radius_km: 25 })
      .eq('user_id', user.id)
    expect(ok.error).toBeNull()
    const tooFar = await user.client
      .from('alert_preferences')
      .update({ radius_km: 500 })
      .eq('user_id', user.id)
    expect(tooFar.error).not.toBeNull()
  })

  it('cannot be read or changed by another user', async () => {
    const owner = await createUser()
    const other = await createUser()
    const { data } = await other.client
      .from('alert_preferences')
      .update({ radius_km: 3 })
      .eq('user_id', owner.id)
      .select('user_id')
    expect(data).toEqual([])
  })
})
