import { CardsIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { copy } from '@/copy/fr'

// Placeholder until story 3.1.
export function FeedPage() {
  const t = copy.placeholders.feed
  return (
    <EmptyState
      icon={<CardsIcon weight="bold" />}
      title={t.title}
      body={t.body}
      action={
        <Link to="/" className="min-h-11 content-center font-semibold underline underline-offset-4">
          {t.action}
        </Link>
      }
    />
  )
}
