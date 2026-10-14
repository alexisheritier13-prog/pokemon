import { APP_VERSION } from '@/config/app'
import { copy } from '@/copy/fr'

export function Footer() {
  return (
    <footer className="flex flex-col gap-1 px-4 py-6 text-center text-caption text-ink-2">
      <p className="mx-auto max-w-prose">{copy.footer.disclaimer}</p>
      <p className="tabular-nums">{copy.footer.version(APP_VERSION)}</p>
    </footer>
  )
}
