import type { LaunchStore } from './api'

export type MarkerStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'restock_incoming' | 'none'
export const MARKER_STATUSES: MarkerStatus[] = [
  'in_stock',
  'low_stock',
  'out_of_stock',
  'restock_incoming',
  'none',
]

// Icon paths on a 24px grid (same shapes as the status bands).
const ICONS: Record<MarkerStatus, string> = {
  in_stock: 'M5 12.5l4.5 4.5L19 7.5',
  low_stock: 'M4 9h13v6H4z M19 11v2',
  out_of_stock: 'M7 7l10 10M17 7L7 17',
  restock_incoming: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z M12 8v4.5l3 1.8',
  none: 'M7 12h10',
}

const CSS_VAR: Record<MarkerStatus, { fill: string; icon: string }> = {
  in_stock: { fill: '--status-ok', icon: '--on-status' },
  low_stock: { fill: '--status-low', icon: '--on-status-low' },
  out_of_stock: { fill: '--status-out', icon: '--on-status' },
  restock_incoming: { fill: '--status-soon', icon: '--on-status' },
  none: { fill: '--status-none', icon: '--on-status' },
}

// "Price tag" marker: rounded square with a small point, thick ink outline (front-end spec, MapMarker).
export function markerSvg(fill: string, icon: string, ink: string, path: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="60" viewBox="0 0 52 60">
  <path d="M14 4h24a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10h-6l-6 8-6-8h-6A10 10 0 0 1 4 38V14A10 10 0 0 1 14 4z" fill="${fill}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
  <g transform="translate(14 14)" fill="none" stroke="${icon}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></g>
</svg>`
}

export function markerSvgFor(status: MarkerStatus, readVar: (name: string) => string): string {
  const vars = CSS_VAR[status]
  return markerSvg(readVar(vars.fill), readVar(vars.icon), readVar('--shadow-solid'), ICONS[status])
}

export type StoreFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: { id: string; name: string; status: MarkerStatus }
  }>
}

export function storesToGeoJSON(stores: LaunchStore[]): StoreFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stores.map((store) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [store.lng, store.lat] },
      properties: { id: store.id, name: store.name, status: store.status ?? 'none' },
    })),
  }
}
