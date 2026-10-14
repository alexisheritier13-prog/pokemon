import { APP_NAME, APP_VERSION } from '@/config/app'
import { copy } from '@/copy/fr'

// Temporary landing page proving the pipeline works; restyled with tokens in story 1.2.
export function CanaryPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-stone-900">{APP_NAME}</h1>
      <p className="max-w-prose text-stone-700">{copy.canary.tagline}</p>
      <p className="text-sm text-stone-600">{copy.canary.status}</p>
      <p className="text-xs text-stone-500 tabular-nums">{copy.canary.version(APP_VERSION)}</p>
    </section>
  )
}
