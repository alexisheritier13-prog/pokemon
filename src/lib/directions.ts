import type { LatLng } from './geo'

function isApple(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent) && !/Android/.test(userAgent)
}

// Opens the native navigation app: Apple Plans on iOS/macOS, Google Maps elsewhere.
export function directionsUrl(
  destination: LatLng,
  userAgent: string = navigator.userAgent,
): string {
  const point = `${destination.lat},${destination.lng}`
  return isApple(userAgent)
    ? `https://maps.apple.com/?daddr=${point}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${point}`
}
