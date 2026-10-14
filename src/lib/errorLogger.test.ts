import { describe, expect, it, vi } from 'vitest'
import { createErrorLogger } from './errorLogger'

function fakeClient() {
  return { rpc: vi.fn(() => Promise.resolve({ error: null })) }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createErrorLogger', () => {
  it('does not call anything without a configured client', async () => {
    const log = createErrorLogger(() => Promise.resolve(null))
    expect(log(new Error('boom'))).toBe(true)
    await flush()
  })

  it('sends at most 5 errors per minute, then resumes', async () => {
    let t = 0
    const client = fakeClient()
    const log = createErrorLogger(
      () => Promise.resolve(client),
      () => t,
    )
    const results = Array.from({ length: 7 }, () => log(new Error('boom'), '/fil'))
    expect(results.filter(Boolean)).toHaveLength(5)
    t = 61_000
    expect(log(new Error('again'), '/fil')).toBe(true)
    await flush()
    expect(client.rpc).toHaveBeenCalledTimes(6)
  })

  it('truncates messages and strips query strings from the url', async () => {
    const client = fakeClient()
    createErrorLogger(() => Promise.resolve(client))('x'.repeat(900), '/r/abc?email=a@b.org')
    await flush()
    expect(client.rpc).toHaveBeenCalledWith('log_client_error', {
      p_message: 'x'.repeat(500),
      p_stack: null,
      p_url: '/r/abc',
    })
  })

  it('swallows RPC failures (function not deployed yet)', async () => {
    const client = { rpc: vi.fn(() => Promise.reject(new Error('function not found'))) }
    expect(createErrorLogger(() => Promise.resolve(client))(new Error('boom'), '/')).toBe(true)
    await flush()
    expect(client.rpc).toHaveBeenCalledOnce()
  })
})
