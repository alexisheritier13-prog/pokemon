import { createErrorLogger } from './errorLogger'
import { getSupabase } from './supabase'

export const logClientError = createErrorLogger(getSupabase)
