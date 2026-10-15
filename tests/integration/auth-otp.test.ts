import { randomUUID } from 'node:crypto'
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { anonClient } from './helpers.ts'

// Mailpit (local mail catcher) URL from the running stack.
function mailpitUrl(): string {
  const raw = execSync('npx supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const status = JSON.parse(raw.slice(raw.indexOf('{'))) as Record<string, string>
  const url = status.MAILPIT_URL ?? status.INBUCKET_URL
  if (!url) throw new Error('Mailpit is not running')
  return url
}

async function readCode(email: string): Promise<string> {
  const base = mailpitUrl()
  for (let attempt = 0; attempt < 20; attempt++) {
    const list = (await (
      await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as { messages?: Array<{ ID: string }> }
    const id = list.messages?.[0]?.ID
    if (id) {
      const message = (await (await fetch(`${base}/api/v1/message/${id}`)).json()) as {
        Text: string
        HTML: string
        Subject: string
      }
      expect(message.Subject).toBe('Ton code de connexion')
      const code = /\b(\d{6})\b/.exec(message.Text || message.HTML)?.[1]
      if (code) return code
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No code received for ${email}`)
}

describe('e-mail code sign-in', () => {
  it('creates the account on first sign-in and logs in with the 6-digit code', async () => {
    const email = `otp-${randomUUID()}@example.test`
    const client = anonClient()
    const { error: sendError } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: 'http://localhost:5173/auth/callback' },
    })
    expect(sendError).toBeNull()

    const code = await readCode(email)
    const { data, error } = await client.auth.verifyOtp({ email, token: code, type: 'email' })
    expect(error).toBeNull()
    expect(data.session?.user.email).toBe(email)

    const { data: me } = await client.rpc('get_me')
    expect(me.profile.pseudo).toMatch(/^Chasseur/)
  })

  it('refuses a wrong code', async () => {
    const email = `otp-${randomUUID()}@example.test`
    const client = anonClient()
    await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    await readCode(email)
    const { error } = await client.auth.verifyOtp({ email, token: '000000', type: 'email' })
    expect(error).not.toBeNull()
  })
})
