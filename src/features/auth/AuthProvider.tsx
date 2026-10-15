import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { getSupabase } from '@/lib/supabase'
import { AuthContext, type AuthState } from './auth-context'

// Tracks the Supabase session. supabase-js loads after first paint, so the initial bundle stays small.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null })
  const queryClient = useQueryClient()

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    void getSupabase().then(async (supabase) => {
      if (cancelled) return
      if (!supabase) {
        setState({ status: 'anonymous', session: null })
        return
      }
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setState(
        data.session
          ? { status: 'authenticated', session: data.session }
          : { status: 'anonymous', session: null },
      )
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        setState(
          session ? { status: 'authenticated', session } : { status: 'anonymous', session: null },
        )
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
          void queryClient.invalidateQueries({ queryKey: ['me'] })
        }
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [queryClient])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
