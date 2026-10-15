import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from './auth-context'

export type AuthErrorCode =
  'invalid_email' | 'wrong_code' | 'too_many' | 'network' | 'unavailable' | 'unknown'

export class AuthFlowError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
  }
}

function toAuthError(error: unknown): AuthFlowError {
  const e = error as { status?: number; code?: string; message?: string; name?: string }
  if (
    e?.status === 429 ||
    e?.code === 'over_email_send_rate_limit' ||
    e?.code === 'over_request_rate_limit'
  ) {
    return new AuthFlowError('too_many')
  }
  if (e?.code === 'otp_expired' || e?.code === 'invalid_credentials' || e?.status === 403) {
    return new AuthFlowError('wrong_code')
  }
  if (e?.code === 'validation_failed' || e?.code === 'email_address_invalid') {
    return new AuthFlowError('invalid_email')
  }
  if (e?.name === 'AuthRetryableFetchError' || e?.message?.includes('Failed to fetch')) {
    return new AuthFlowError('network')
  }
  return new AuthFlowError('unknown')
}

async function client() {
  const supabase = await getSupabase()
  if (!supabase) throw new AuthFlowError('unavailable')
  return supabase
}

export function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`
}

export async function sendEmailCode(email: string) {
  const supabase = await client()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
  })
  if (error) throw toAuthError(error)
}

export async function verifyEmailCode(email: string, token: string) {
  const supabase = await client()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw toAuthError(error)
}

export async function signInWithProvider(provider: 'google' | 'apple') {
  const supabase = await client()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl() },
  })
  if (error) throw toAuthError(error)
}

export async function signOut() {
  const supabase = await client()
  await supabase.auth.signOut()
}

export type Me = {
  profile: {
    id: string
    pseudo: string
    avatar_key: string
    role: 'user' | 'admin'
    reputation_score: number
    banned: boolean
    badges: Array<'nouveau' | 'fiable' | 'eclaireur' | 'veteran'>
  }
}

export function useMe() {
  const auth = useAuth()
  return useQuery({
    queryKey: ['me', auth.session?.user.id ?? null],
    enabled: auth.status === 'authenticated',
    queryFn: async (): Promise<Me> => {
      const supabase = await client()
      const { data, error } = await supabase.rpc('get_me')
      if (error) throw error
      return data as Me
    },
  })
}

export type PseudoErrorCode = 'pseudo_taken' | 'pseudo_format' | 'unknown'

export async function updatePseudo(userId: string, pseudo: string) {
  const supabase = await client()
  const { error } = await supabase.from('profiles').update({ pseudo }).eq('id', userId)
  if (!error) return
  if (error.code === '23505') throw new Error('pseudo_taken')
  if (error.code === '23514') throw new Error('pseudo_format')
  throw new Error('unknown')
}
