import { env } from '@/config/env'
import type { LatLng } from '@/lib/geo'

export type Place = LatLng & { label: string; context: string }

type GeoFeature = {
  geometry: { coordinates: [number, number] }
  properties: { label?: string; city?: string; name?: string; postcode?: string; context?: string }
}

export function parsePlaces(json: { features?: GeoFeature[] }): Place[] {
  return (json.features ?? []).map((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    const p = feature.properties
    const name = p.city ?? p.name ?? p.label ?? ''
    return {
      lat,
      lng,
      label: p.postcode ? `${name} (${p.postcode})` : name,
      context: p.context ?? '',
    }
  })
}

// Towns and postcodes via the IGN Géoplateforme geocoder (free, no key). Fallback when location is refused.
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${env.VITE_GEOCODER_URL}/search?q=${encodeURIComponent(q)}&index=address&type=municipality&limit=5`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`geocoder ${response.status}`)
  return parsePlaces(await response.json())
}
