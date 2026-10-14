import { copy } from '@/copy/fr'

export function Footer() {
  return (
    <footer className="px-4 py-6 text-center text-caption text-ink-2">
      <p className="mx-auto max-w-prose">{copy.footer.disclaimer}</p>
    </footer>
  )
}
