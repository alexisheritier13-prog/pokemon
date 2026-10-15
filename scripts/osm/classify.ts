// Pure classification of OSM elements into RestockRadar stores (no network, no database).

export type OsmElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export type BrandRule = { id: string; slug: string; osm_match: string[] }

export type StoreCandidate = {
  osm_ref: string
  name: string
  brand_slug: string
  address: string | null
  city: string | null
  postcode: string | null
  department: string
  lat: number
  lng: number
  opening_hours: string | null
}

export type Rejection =
  'no_position' | 'no_name' | 'proximity_format' | 'unbranded_generalist' | 'closed'

// Specialist shops kept even without a known brand (they are the ones most likely to sell TCG).
const SPECIALIST_SHOPS = new Set([
  'games',
  'toys',
  'video_games',
  'hobby',
  'anime',
  'comics',
  'collector',
])

// Small convenience formats of big chains rarely stock TCG: excluded by default.
const PROXIMITY_FORMATS = [
  'carrefour city',
  'carrefour express',
  'carrefour contact',
  'intermarche express',
  'intermarche contact',
  'my auchan',
  'auchan piéton',
  'auchan pieton',
  'u express',
  'utile',
  'petit casino',
  'casino shop',
  'vival',
  'spar',
  'proxi',
  // Pickup points, no shelves to browse.
  'drive',
  'click and collect',
]

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `)
}

export function matchBrand(tags: Record<string, string>, brands: BrandRule[]): BrandRule | null {
  const candidates = [tags.brand, tags['brand:fr'], tags.operator, tags.name]
    .filter((v): v is string => Boolean(v))
    .map(normalize)
  for (const value of candidates) {
    for (const brand of brands) {
      // "action" is too common a word: only trust the explicit brand tag or an exact name.
      if (brand.slug === 'action' && value !== 'action') continue
      if (brand.osm_match.some((pattern) => containsWords(value, normalize(pattern)))) return brand
    }
  }
  return null
}

function isProximityFormat(tags: Record<string, string>): boolean {
  const value = normalize(`${tags.brand ?? ''} ${tags.name ?? ''}`)
  return PROXIMITY_FORMATS.some((format) => containsWords(value, normalize(format)))
}

function address(tags: Record<string, string>): string | null {
  const parts = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}

export function classify(
  element: OsmElement,
  department: string,
  brands: BrandRule[],
): { store: StoreCandidate } | { rejected: Rejection } {
  const tags = element.tags ?? {}
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (lat === undefined || lng === undefined) return { rejected: 'no_position' }
  if (tags['disused:shop'] || tags.shop === 'vacant') return { rejected: 'closed' }
  if (isProximityFormat(tags)) return { rejected: 'proximity_format' }

  const brand = matchBrand(tags, brands)
  const specialist = SPECIALIST_SHOPS.has(tags.shop ?? '')
  if (!brand && !specialist) return { rejected: 'unbranded_generalist' }

  const name = (
    tags.name ?? (brand ? brands.find((b) => b.slug === brand.slug)?.slug : undefined)
  )?.trim()
  if (!name || name.length < 2) return { rejected: 'no_name' }

  const postcode = tags['addr:postcode']?.trim()
  return {
    store: {
      osm_ref: `${element.type}/${element.id}`,
      name: name.slice(0, 120),
      brand_slug: brand?.slug ?? 'independant',
      address: address(tags),
      city: tags['addr:city']?.trim() ?? null,
      postcode: postcode && /^\d{5}$/.test(postcode) ? postcode : null,
      department,
      lat,
      lng,
      opening_hours: tags.opening_hours ?? null,
    },
  }
}

export type ReverseGeocode = {
  city?: string
  postcode?: string
  street?: string
  housenumber?: string
  distance?: number
}

// Fills only what OSM left empty. The street address is trusted only when the geocoded point is close.
export function enrichWithReverse(
  store: StoreCandidate,
  geo: ReverseGeocode | null,
): StoreCandidate {
  if (!geo) return store
  const nearby = (geo.distance ?? Infinity) <= 50
  const street = geo.street ? [geo.housenumber, geo.street].filter(Boolean).join(' ') : null
  return {
    ...store,
    city: store.city ?? geo.city ?? null,
    postcode:
      store.postcode ?? (geo.postcode && /^\d{5}$/.test(geo.postcode) ? geo.postcode : null),
    address: store.address ?? (nearby ? street : null),
  }
}

// Overpass QL for one department (ISO 3166-2 code, e.g. FR-84). `out center` gives ways a point.
export function overpassQuery(department: string): string {
  const shops =
    'supermarket|department_store|toys|games|video_games|hobby|anime|comics|collector|books|electronics|variety_store|general'
  return `[out:json][timeout:120];
area["ISO3166-2"="FR-${department}"]->.dep;
(
  nwr["shop"~"^(${shops})$"](area.dep);
);
out center tags;`
}
