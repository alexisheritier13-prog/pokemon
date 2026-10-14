import { Link } from 'react-router'
import { copy } from '@/copy/fr'

export function NotFoundPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">{copy.notFound.title}</h1>
      <p className="text-stone-700">{copy.notFound.body}</p>
      <Link to="/" className="text-stone-900 underline underline-offset-4">
        {copy.notFound.back}
      </Link>
    </section>
  )
}
