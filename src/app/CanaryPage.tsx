import { APP_NAME, APP_VERSION } from '@/config/app'
import { copy } from '@/copy/fr'

// Temporary landing page proving the pipeline works; replaced by the map in story 2.1.
export function CanaryPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="type-display">{APP_NAME}</h1>
      <p className="max-w-prose text-body text-ink">{copy.canary.tagline}</p>
      <p className="text-small text-ink-2">{copy.canary.status}</p>
      <p className="text-caption text-ink-2 tabular-nums">{copy.canary.version(APP_VERSION)}</p>
    </section>
  )
}
