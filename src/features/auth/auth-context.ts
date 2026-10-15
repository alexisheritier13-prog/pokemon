import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthState =
  | { status: 'loading'; session: null }
  | { status: 'anonymous'; session: null }
  | { status: 'authenticated'; session: Session }

export const AuthContext = createContext<AuthState>({ status: 'loading', session: null })

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
