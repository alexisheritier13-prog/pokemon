import { useCallback, useState } from 'react'
import type { LatLng } from '@/lib/geo'

export type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; position: LatLng; accuracy: number }
  | { status: 'denied' }
  | { status: 'unavailable' }

// The precise position stays in memory only (never persisted, never sent except with a report or vote).
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' })

  const locate = useCallback((): Promise<GeoState> => {
    if (!('geolocation' in navigator)) {
      const next: GeoState = { status: 'unavailable' }
      setState(next)
      return Promise.resolve(next)
    }
    setState({ status: 'locating' })
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next: GeoState = {
            status: 'located',
            position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            accuracy: pos.coords.accuracy,
          }
          setState(next)
          resolve(next)
        },
        (error) => {
          const next: GeoState =
            error.code === error.PERMISSION_DENIED
              ? { status: 'denied' }
              : { status: 'unavailable' }
          setState(next)
          resolve(next)
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 120_000 },
      )
    })
  }, [])

  return { state, locate }
}
