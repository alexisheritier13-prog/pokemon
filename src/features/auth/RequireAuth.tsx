import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { RouteSkeleton } from '@/app/RouteSkeleton'
import { useAuth } from './auth-context'
import { rememberReturnTo } from './returnTo'

// UI guard only: every write is re-checked by RLS and RPCs on the server.
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <RouteSkeleton />
  if (auth.status === 'anonymous') {
    rememberReturnTo(location.pathname + location.search)
    return <Navigate to="/connexion" replace />
  }
  return <>{children}</>
}
