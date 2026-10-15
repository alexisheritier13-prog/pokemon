import { CaretRightIcon, NavigationArrowIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Sheet } from '@/components/ui/Sheet'
import { StatusBand } from '@/components/ui/StatusBand'
import { copy } from '@/copy/fr'
import { directionsUrl } from '@/lib/directions'
import { distanceMeters, formatDistance, type LatLng } from '@/lib/geo'
import type { LaunchStore } from './api'

type StoreSheetProps = {
  store: LaunchStore | null
  origin: LatLng
  onClose: () => void
}

const actionClass =
  'type-button inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-button border-3 border-ink px-4 shadow-press active:translate-y-1 active:shadow-pressed'

// Quick preview when a marker is tapped; the full store page is /m/:id (story 2.4).
export function StoreSheet({ store, origin, onClose }: StoreSheetProps) {
  return (
    <Sheet
      open={store !== null}
      onOpenChange={(open) => !open && onClose()}
      title={store?.name ?? ''}
      description={
        store
          ? [store.brand_name, store.city, formatDistance(distanceMeters(origin, store))]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
    >
      {store && (
        <div className="flex flex-col gap-4">
          <StatusBand status={store.status ?? 'none'} />
          {store.address && (
            <p className="text-small text-ink-2">
              {store.address}
              {store.postcode ? `, ${store.postcode}` : ''} {store.city ?? ''}
            </p>
          )}
          <div className="flex gap-3">
            <a
              href={directionsUrl(store)}
              target="_blank"
              rel="noreferrer"
              className={`${actionClass} bg-card text-ink`}
            >
              <NavigationArrowIcon weight="bold" aria-hidden="true" />
              {copy.map.directions}
            </a>
            <Link
              to={`/m/${store.id}`}
              className={`${actionClass} bg-red text-on-red shadow-primary`}
            >
              {copy.map.openStore}
              <CaretRightIcon weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </Sheet>
  )
}
