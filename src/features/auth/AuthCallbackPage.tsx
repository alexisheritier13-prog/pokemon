import { LinkBreakIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { RouteSkeleton } from '@/app/RouteSkeleton'
import { copy } from '@/copy/fr'
import { useAuth } from './auth-context'
import { consumeReturnTo } from './returnTo'

const TIMEOUT_MS = 8000

// Landing page for magic links and OAuth. supabase-js exchanges the PKCE code on load
// (detectSessionInUrl); we wait for the session, then go back to where the visitor was heading.
export function AuthCallbackPage() {
  const auth = useAuth()
  const params = new URLSearchParams(
    window.location.search + window.location.hash.replace('#', '&'),
  )
  const providerError = params.get('error_description') ?? params.get('error')
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (auth.status === 'authenticated') return <Navigate to={consumeReturnTo()} replace />

  if (providerError || timedOut || auth.status === 'anonymous') {
    // 'anonymous' only becomes final once supabase-js has finished reading the URL.
    if (!providerError && !timedOut) return <RouteSkeleton />
    return (
      <EmptyState
        icon={<LinkBreakIcon weight="bold" />}
        title={copy.auth.callbackFailed}
        body=""
        action={
          <Link
            to="/connexion"
            className="min-h-11 content-center font-semibold underline underline-offset-4"
          >
            {copy.auth.backToLogin}
          </Link>
        }
      />
    )
  }

  return <RouteSkeleton />
}
