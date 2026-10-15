import { MapPinIcon } from '@phosphor-icons/react'
import { useEffect, useId, useState } from 'react'
import { copy } from '@/copy/fr'
import { searchPlaces, type Place } from './geocoder'

type ZoneSearchProps = { onPick: (place: Place) => void }

// Town / postcode search (fallback when location is refused). Simple accessible list of suggestions.
export function ZoneSearch({ onPick }: ZoneSearchProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    if (query.trim().length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((found) => {
          setPlaces(found)
          setMessage(found.length ? undefined : copy.map.zoneNoResult)
        })
        .catch((error: unknown) => {
          if ((error as Error).name !== 'AbortError') setMessage(copy.map.zoneError)
        })
    }, 300)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const visible = query.trim().length >= 2

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {copy.map.zoneLabel}
      </label>
      <MapPinIcon
        weight="bold"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-2"
      />
      <input
        id={id}
        type="search"
        inputMode="search"
        autoComplete="address-level2"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.map.zonePlaceholder}
        aria-describedby={`${id}-results`}
        className="min-h-12 w-full rounded-pill border-3 border-ink bg-card pr-4 pl-11 text-body text-ink shadow-chip placeholder:text-ink-2"
      />
      <div id={`${id}-results`} aria-live="polite">
        {visible && (places.length > 0 || message) && (
          <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-md border-3 border-ink bg-card shadow-card">
            {message && <li className="px-4 py-3 text-small text-ink-2">{message}</li>}
            {places.map((place) => (
              <li key={`${place.lat},${place.lng}`}>
                <button
                  type="button"
                  className="flex min-h-12 w-full cursor-pointer flex-col items-start px-4 py-2 text-left hover:bg-paper-2 focus-visible:bg-paper-2"
                  onClick={() => {
                    onPick(place)
                    setQuery('')
                    setPlaces([])
                  }}
                >
                  <span className="font-semibold">{place.label}</span>
                  <span className="text-caption text-ink-2">{place.context}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
