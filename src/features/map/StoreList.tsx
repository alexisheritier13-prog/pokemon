import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { statusMeta } from '@/components/ui/status'
import { copy } from '@/copy/fr'
import { distanceMeters, formatDistance, type LatLng } from '@/lib/geo'
import { cn } from '@/lib/cn'
import type { LaunchStore } from './api'
import { normalizeSearch } from './search'

type StoreListProps = { stores: LaunchStore[]; origin: LatLng }

// Accessible alternative to the map: same stores, sorted by distance, status always in text.
export function StoreList({ stores, origin }: StoreListProps) {
  const [query, setQuery] = useState('')
  const rows = useMemo(() => {
    const q = normalizeSearch(query)
    return stores
      .filter(
        (s) => !q || normalizeSearch(`${s.name} ${s.city ?? ''} ${s.brand_name ?? ''}`).includes(q),
      )
      .map((s) => ({ store: s, distance: distanceMeters(origin, s) }))
      .sort((a, b) => a.distance - b.distance)
  }, [stores, origin, query])

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 lg:px-8">
      <label className="relative block">
        <span className="sr-only">{copy.map.listSearch}</span>
        <MagnifyingGlassIcon
          weight="bold"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-2"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.map.listSearch}
          className="min-h-12 w-full rounded-md border-2 border-ink bg-card pr-3.5 pl-11 text-body text-ink placeholder:text-ink-2"
        />
      </label>
      <p className="text-caption text-ink-2" aria-live="polite">
        {copy.map.storesCount(rows.length)}
      </p>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-body text-ink-2">{copy.map.listEmpty}</p>
      ) : (
        <ul aria-label={copy.map.listLabel} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ store, distance }) => {
            const status = store.status ?? 'none'
            const { icon: StatusIcon, surface } = statusMeta[status]
            return (
              <li key={store.id}>
                <Link
                  to={`/m/${store.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-lg border-3 border-ink bg-card p-3 text-ink shadow-chip transition-[translate,box-shadow] duration-(--dur-tap) active:translate-y-0.5 active:shadow-pressed"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-sm border-2 border-ink',
                      surface,
                    )}
                  >
                    <StatusIcon weight="bold" className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{store.name}</span>
                    <span className="truncate text-caption text-ink-2">
                      {[store.brand_name, store.city].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end text-right">
                    <span className="text-small font-semibold tabular-nums">
                      {formatDistance(distance)}
                    </span>
                    <span className="text-caption text-ink-2">
                      {status === 'none' ? copy.map.noStatus : copy.status[status]}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
