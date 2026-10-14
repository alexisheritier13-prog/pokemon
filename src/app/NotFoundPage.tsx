import { Link } from 'react-router'
import { copy } from '@/copy/fr'

export function NotFoundPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="type-h1">{copy.notFound.title}</h1>
      <p className="text-body text-ink-2">{copy.notFound.body}</p>
      <Link
        to="/"
        className="min-h-11 content-center font-semibold text-ink underline underline-offset-4"
      >
        {copy.notFound.back}
      </Link>
    </section>
  )
}
