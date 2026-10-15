import { CrosshairIcon, ListBulletsIcon, MapTrifoldIcon } from '@phosphor-icons/react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { PressButton } from '@/components/ui/PressButton'
import { Sheet } from '@/components/ui/Sheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/toast-context'
import { copy } from '@/copy/fr'
import { LAUNCH_CENTER, LAUNCH_ZOOM, type LatLng } from '@/lib/geo'
import { useUiStore } from '@/lib/uiStore'
import { useLaunchStores } from './api'
import { StoreList } from './StoreList'
import { StoreSheet } from './StoreSheet'
import { useGeolocation } from './useGeolocation'
import { ZoneSearch } from './ZoneSearch'

// MapLibre (~230 kB gzip) only loads when the map view is shown.
const MapView = lazy(() => import('./MapView'))

const CONSENT_KEY = 'rr-geo-explained'

function consentGiven(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

export function MapPage() {
  const { data: stores = [], isError } = useLaunchStores()
  const { viewMode, setViewMode, zone, setZone } = useUiStore()
  const { state: geo, locate } = useGeolocation()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [consentOpen, setConsentOpen] = useState(false)

  const userPosition = geo.status === 'located' ? geo.position : null
  // Distances use the precise position when known (memory only), else the saved zone.
  const origin: LatLng = userPosition ?? zone ?? LAUNCH_CENTER
  const center: LatLng = zone ?? LAUNCH_CENTER
  const zoom = zone ? 12 : LAUNCH_ZOOM
  const selected = useMemo(
    () => stores.find((s) => s.id === selectedId) ?? null,
    [stores, selectedId],
  )

  const runLocate = async () => {
    const result = await locate()
    if (result.status === 'located') {
      setZone({ ...result.position, label: copy.map.aroundMe, source: 'gps' })
    } else if (result.status === 'denied') {
      toast.show({ message: copy.map.geoDenied })
    } else if (result.status === 'unavailable') {
      toast.show({ message: copy.map.geoUnavailable })
    }
  }

  const aroundMe = () => {
    if (consentGiven()) void runLocate()
    else setConsentOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 lg:flex-row lg:items-center lg:px-8 lg:pt-6">
        <div className="lg:w-96">
          <ZoneSearch onPick={(place) => setZone({ ...place, source: 'search' })} />
        </div>
        <div className="flex items-center justify-between gap-3 lg:flex-1">
          <p className="truncate text-small text-ink-2">
            {copy.map.from(zone?.label ?? copy.map.defaultZone)}
          </p>
          <div role="group" aria-label={copy.map.viewLabel} className="flex shrink-0 gap-2">
            <Chip
              selected={viewMode === 'map'}
              onClick={() => setViewMode('map')}
              icon={<MapTrifoldIcon weight="bold" aria-hidden="true" />}
            >
              {copy.map.viewMap}
            </Chip>
            <Chip
              selected={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              icon={<ListBulletsIcon weight="bold" aria-hidden="true" />}
            >
              {copy.map.viewList}
            </Chip>
          </div>
        </div>
      </div>

      {isError && (
        <p className="px-4 pb-3 text-small font-semibold text-status-out">{copy.map.loadError}</p>
      )}

      {viewMode === 'map' ? (
        <div className="relative min-h-[60dvh] flex-1 overflow-hidden border-y-3 border-ink lg:mx-8 lg:mb-6 lg:rounded-xl lg:border-3">
          <Suspense fallback={<Skeleton className="absolute inset-0 rounded-none" />}>
            <MapView
              stores={stores}
              center={center}
              zoom={zoom}
              userPosition={userPosition}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </Suspense>
          <div className="absolute right-3 bottom-12 z-10">
            <PressButton
              variant="secondary"
              aria-label={copy.map.aroundMe}
              loading={geo.status === 'locating'}
              onClick={aroundMe}
              className="size-13 rounded-pill px-0"
              icon={<CrosshairIcon weight="bold" className="size-6" />}
            />
          </div>
        </div>
      ) : (
        <StoreList stores={stores} origin={origin} />
      )}

      <StoreSheet store={selected} origin={origin} onClose={() => setSelectedId(null)} />

      <Sheet open={consentOpen} onOpenChange={setConsentOpen} title={copy.map.consentTitle}>
        <div className="flex flex-col gap-4">
          <p className="text-body text-ink-2">{copy.map.consentBody}</p>
          <PressButton
            fullWidth
            onClick={() => {
              try {
                localStorage.setItem(CONSENT_KEY, '1')
              } catch {
                // ignore: we will simply explain again next time
              }
              setConsentOpen(false)
              void runLocate()
            }}
          >
            {copy.map.consentAccept}
          </PressButton>
          <PressButton variant="ghost" fullWidth onClick={() => setConsentOpen(false)}>
            {copy.map.consentDecline}
          </PressButton>
        </div>
      </Sheet>
    </div>
  )
}
