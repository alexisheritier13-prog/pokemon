import { AppleLogoIcon, EnvelopeSimpleIcon, GoogleLogoIcon } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { PressButton } from '@/components/ui/PressButton'
import { TextField } from '@/components/ui/TextField'
import { copy } from '@/copy/fr'
import {
  AuthFlowError,
  sendEmailCode,
  signInWithProvider,
  verifyEmailCode,
  type AuthErrorCode,
} from './api'
import { useAuth } from './auth-context'
import { enabledAuthMethods } from './providers'
import { consumeReturnTo } from './returnTo'

const RESEND_DELAY_S = 60
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const errorText: Record<AuthErrorCode, string> = {
  invalid_email: copy.auth.errors.invalidEmail,
  wrong_code: copy.auth.errors.wrongCode,
  too_many: copy.auth.errors.tooMany,
  network: copy.auth.errors.network,
  unavailable: copy.auth.errors.unavailable,
  unknown: copy.auth.errors.unknown,
}

function messageFor(error: unknown): string {
  return errorText[error instanceof AuthFlowError ? error.code : 'unknown']
}

// E-mail first (6-digit code + magic link), then optional Google / Apple buttons.
export function LoginPage() {
  const auth = useAuth()
  const methods = enabledAuthMethods()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  if (auth.status === 'authenticated') return <Navigate to={consumeReturnTo()} replace />

  const requestCode = async (event?: FormEvent) => {
    event?.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError(copy.auth.errors.invalidEmail)
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await sendEmailCode(value)
      setEmail(value)
      setStep('code')
      setResendIn(RESEND_DELAY_S)
    } catch (e) {
      setError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setError(copy.auth.errors.invalidCode)
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await verifyEmailCode(email, code)
      // The auth state listener re-renders this page, which then redirects.
    } catch (e) {
      setError(messageFor(e))
      setBusy(false)
    }
  }

  const oauth = async (provider: 'google' | 'apple') => {
    setError(undefined)
    try {
      await signInWithProvider(provider)
    } catch (e) {
      setError(messageFor(e))
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="type-h1">{step === 'email' ? copy.auth.title : copy.auth.codeSentTitle}</h1>
        <p className="text-body text-ink-2">
          {step === 'email' ? copy.auth.intro : copy.auth.codeSent(email)}
        </p>
      </header>

      {step === 'email' ? (
        <form onSubmit={requestCode} noValidate className="flex flex-col gap-4">
          <TextField
            label={copy.auth.emailLabel}
            hint={copy.auth.emailHint}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            required
          />
          <PressButton
            type="submit"
            loading={busy}
            fullWidth
            icon={<EnvelopeSimpleIcon weight="bold" />}
          >
            {copy.auth.sendCode}
          </PressButton>
        </form>
      ) : (
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
          <TextField
            label={copy.auth.codeLabel}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={error}
            className="[&_input]:text-center [&_input]:text-h2 [&_input]:tracking-[0.4em]"
          />
          <PressButton type="submit" loading={busy} fullWidth>
            {copy.auth.verify}
          </PressButton>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PressButton
              variant="ghost"
              className="min-h-11 px-2"
              disabled={resendIn > 0 || busy}
              onClick={() => void requestCode()}
            >
              {resendIn > 0 ? copy.auth.resendIn(resendIn) : copy.auth.resend}
            </PressButton>
            <PressButton
              variant="ghost"
              className="min-h-11 px-2"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(undefined)
              }}
            >
              {copy.auth.changeEmail}
            </PressButton>
          </div>
        </form>
      )}

      {step === 'email' && (methods.has('google') || methods.has('apple')) && (
        <div className="flex flex-col gap-3">
          <p className="type-label flex items-center gap-3 text-ink-2 before:h-0.5 before:flex-1 before:bg-paper-2 after:h-0.5 after:flex-1 after:bg-paper-2">
            {copy.auth.or}
          </p>
          {methods.has('google') && (
            <PressButton
              variant="secondary"
              fullWidth
              icon={<GoogleLogoIcon weight="bold" />}
              onClick={() => void oauth('google')}
            >
              {copy.auth.google}
            </PressButton>
          )}
          {methods.has('apple') && (
            <PressButton
              variant="secondary"
              fullWidth
              icon={<AppleLogoIcon weight="fill" />}
              onClick={() => void oauth('apple')}
            >
              {copy.auth.apple}
            </PressButton>
          )}
        </div>
      )}
    </section>
  )
}
