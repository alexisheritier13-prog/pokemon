import { describe, expect, it } from 'vitest'
import { admin, anonClient, createUser } from './helpers.ts'

describe('log_client_error', () => {
  it('accepts errors from anonymous and signed-in visitors', async () => {
    const since = new Date().toISOString()
    expect(
      (await anonClient().rpc('log_client_error', { p_message: 'anon boom', p_url: '/fil?x=1' }))
        .error,
    ).toBeNull()
    const user = await createUser()
    expect((await user.client.rpc('log_client_error', { p_message: 'user boom' })).error).toBeNull()
    const { data: count } = await admin.rpc('svc_client_error_count', { p_since: since })
    expect(count).toBeGreaterThanOrEqual(2)
  })

  it('caps a signed-in user at 20 errors per hour', async () => {
    const user = await createUser()
    const since = new Date().toISOString()
    for (let i = 0; i < 25; i++) {
      await user.client.rpc('log_client_error', { p_message: `spam ${i}` })
    }
    const { data: count } = await admin.rpc('svc_client_error_count', { p_since: since })
    expect(count).toBe(20)
  })

  it('keeps the counter service-only', async () => {
    const { error } = await anonClient().rpc('svc_client_error_count', {
      p_since: new Date().toISOString(),
    })
    expect(error).not.toBeNull()
  })
})
