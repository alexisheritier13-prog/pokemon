// Maps Supabase/PostgREST errors to stable app codes. RPCs raise `P0001` with message = code
// and detail = JSON (architecture, "Error Handling Strategy").

export type AppError = { code: string; detail: Record<string, unknown> }

export function toAppError(error: unknown): AppError {
  const e = error as { code?: string; message?: string; details?: string | null; name?: string }
  if (e?.code === 'P0001' && e.message) {
    let detail: Record<string, unknown> = {}
    try {
      detail = e.details ? (JSON.parse(e.details) as Record<string, unknown>) : {}
    } catch {
      detail = {}
    }
    return { code: e.message, detail }
  }
  if (e?.name === 'TypeError' || /fetch|network/i.test(e?.message ?? '')) {
    return { code: 'network', detail: {} }
  }
  return { code: 'unknown', detail: {} }
}
