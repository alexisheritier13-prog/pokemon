// Client error journal: stored in our own database (RPC log_client_error), no third-party tracker (NFR7).
// The RPC ships with story 1.5; until then calls fail and are ignored.

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }>
}

const MAX_PER_WINDOW = 5
const WINDOW_MS = 60_000
const MAX_MESSAGE = 500
const MAX_STACK = 4000

export function createErrorLogger(
  getClient: () => Promise<RpcClient | null>,
  now: () => number = Date.now,
) {
  let sent: number[] = []

  return function logClientError(error: unknown, url: string = location.pathname): boolean {
    const t = now()
    sent = sent.filter((at) => t - at < WINDOW_MS)
    if (sent.length >= MAX_PER_WINDOW) return false
    sent.push(t)

    const { message, stack } = describe(error)
    const args = {
      p_message: message.slice(0, MAX_MESSAGE),
      p_stack: stack?.slice(0, MAX_STACK) ?? null,
      // Never log query strings: they could carry personal data.
      p_url: url.split('?')[0]!.slice(0, 300),
    }
    void getClient()
      .then((client) => client?.rpc('log_client_error', args))
      .catch(() => undefined)
    return true
  }
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message || error.name, stack: error.stack }
  if (typeof error === 'string') return { message: error }
  try {
    return { message: JSON.stringify(error) }
  } catch {
    return { message: String(error) }
  }
}

export function installGlobalErrorHandlers(log: (error: unknown) => boolean) {
  window.addEventListener('error', (event) => log(event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => log(event.reason))
}
