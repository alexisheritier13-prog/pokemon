export type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000

// Great-circle distance in meters (haversine). Good to a few meters at city scale.
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

const kmFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

// "450 m", "4,2 km", "37 km".
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`
  const km = meters / 1000
  return `${km < 10 ? kmFormat.format(km) : Math.round(km)} km`
}

// Rounds to a ~1 km grid (0.01°): the only precision ever persisted on the device (privacy).
export function roundToGrid(point: LatLng): LatLng {
  return { lat: Math.round(point.lat * 100) / 100, lng: Math.round(point.lng * 100) / 100 }
}

// Center of the launch zone (Vaucluse + Bouches-du-Rhône).
export const LAUNCH_CENTER: LatLng = { lat: 43.72, lng: 5.1 }
export const LAUNCH_ZOOM = 8.2
