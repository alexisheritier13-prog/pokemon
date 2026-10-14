import { MapTrifoldIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'
import { copy } from '@/copy/fr'

// Placeholder until story 2.1 (MapLibre, lazy chunk).
export function MapPage() {
  const t = copy.placeholders.map
  return (
    <EmptyState
      icon={<MapTrifoldIcon weight="bold" />}
      title={t.title}
      body={t.body}
      action={
        <Link
          to="/fil"
          className="min-h-11 content-center font-semibold underline underline-offset-4"
        >
          {t.action}
        </Link>
      }
    />
  )
}
