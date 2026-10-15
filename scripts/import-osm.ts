// Imports relevant stores from OpenStreetMap (Overpass API) for the launch departments.
//
//   node scripts/import-osm.ts --dry-run              # fetch + classify, print a report, write nothing
//   node scripts/import-osm.ts --dept 84,13           # upsert into the database
//
// Target database: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (shell env). Defaults to the local stack.
// Idempotent: existing stores (same osm_ref) get their OSM fields refreshed, never their status or admin edits.
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import {
  classify,
  enrichWithReverse,
  overpassQuery,
  type BrandRule,
  type OsmElement,
  type ReverseGeocode,
  type StoreCandidate,
} from './osm/classify.ts'

const GEOCODER_URL = process.env.GEOCODER_URL ?? 'https://data.geopf.fr/geocodage'

// IGN Géoplateforme reverse geocoding (free, no key). Null on any failure: enrichment is best effort.
async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode | null> {
  try {
    const url = `${GEOCODER_URL}/reverse?lon=${lng}&lat=${lat}&limit=1&index=address`
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return null
    const json = (await response.json()) as { features?: Array<{ properties: ReverseGeocode }> }
    return json.features?.[0]?.properties ?? null
  } catch {
    return null
  }
}

// Completes missing city / postcode / address, 5 requests at a time.
async function enrich(stores: StoreCandidate[]): Promise<StoreCandidate[]> {
  const result = [...stores]
  const todo = result
    .map((store, index) => ({ store, index }))
    .filter(({ store }) => !store.city || !store.postcode || !store.address)
  for (let i = 0; i < todo.length; i += 5) {
    await Promise.all(
      todo.slice(i, i + 5).map(async ({ store, index }) => {
        result[index] = enrichWithReverse(store, await reverseGeocode(store.lat, store.lng))
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return result
}

// Public Overpass instances, tried in turn (the main one is often overloaded on dense areas).
const OVERPASS_URLS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
    ]
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const deptArg = args[args.indexOf('--dept') + 1]
const departments = (args.includes('--dept') && deptArg ? deptArg : '84,13')
  .split(',')
  .map((d) => d.trim())

function localStack(): { url: string; key: string } {
  const raw = execSync('npx supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const status = JSON.parse(raw.slice(raw.indexOf('{'))) as Record<string, string>
  return { url: status.API_URL!, key: (status.SECRET_KEY ?? status.SERVICE_ROLE_KEY)! }
}

async function fetchDepartment(department: string): Promise<OsmElement[]> {
  const attempts = OVERPASS_URLS.length * 2
  for (let attempt = 0; attempt < attempts; attempt++) {
    const url = OVERPASS_URLS[attempt % OVERPASS_URLS.length]!
    const host = new URL(url).host
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RestockRadar store import',
        },
        body: new URLSearchParams({ data: overpassQuery(department) }),
        signal: AbortSignal.timeout(150_000),
      })
      if (response.ok) return ((await response.json()) as { elements: OsmElement[] }).elements
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Overpass ${host} ${response.status}: ${await response.text()}`)
      }
      console.warn(`  ${host} : ${response.status}`)
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Overpass ')) throw error
      console.warn(`  ${host} : ${error instanceof Error ? error.message : error}`)
    }
    const wait = 3000 * (attempt + 1)
    console.warn(`  nouvel essai dans ${wait / 1000} s…`)
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
  throw new Error(`Overpass indisponible pour le département ${department}`)
}

async function main() {
  const target =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
      : localStack()
  const supabase = createClient(target.url, target.key, { auth: { persistSession: false } })
  console.log(`Cible : ${target.url}${dryRun ? ' (simulation, aucune écriture)' : ''}`)

  const { data: brandRows, error: brandError } = await supabase
    .from('brands')
    .select('id, slug, osm_match')
  if (brandError || !brandRows?.length)
    throw new Error(`Enseignes introuvables : ${brandError?.message ?? 'table vide'}`)
  const brands = brandRows as BrandRule[]
  const brandId = new Map(brands.map((b) => [b.slug, b.id]))

  const candidates = new Map<string, StoreCandidate>()
  const rejections: Record<string, number> = {}
  const byBrand: Record<string, number> = {}

  for (const department of departments) {
    console.log(`\nDépartement ${department} : interrogation d'Overpass…`)
    const elements = await fetchDepartment(department)
    let kept = 0
    for (const element of elements) {
      const result = classify(element, department, brands)
      if ('rejected' in result) {
        rejections[result.rejected] = (rejections[result.rejected] ?? 0) + 1
        continue
      }
      candidates.set(result.store.osm_ref, result.store)
      byBrand[result.store.brand_slug] = (byBrand[result.store.brand_slug] ?? 0) + 1
      kept++
    }
    console.log(`  ${elements.length} éléments OSM, ${kept} magasins retenus`)
    await new Promise((resolve) => setTimeout(resolve, 2000)) // be gentle with the public API
  }

  console.log('\nRetenus par enseigne :')
  for (const [slug, count] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug.padEnd(18)} ${count}`)
  }
  console.log('Écartés :', rejections)

  if (!args.includes('--no-reverse')) {
    console.log('\nComplément des adresses (géocodage inverse IGN)…')
    const enriched = await enrich([...candidates.values()])
    for (const store of enriched) candidates.set(store.osm_ref, store)
  }
  const all = [...candidates.values()]
  const pct = (key: 'postcode' | 'city' | 'address') =>
    `${Math.round((100 * all.filter((s) => s[key]).length) / Math.max(all.length, 1))} %`
  console.log(
    `Renseignés : code postal ${pct('postcode')}, ville ${pct('city')}, adresse ${pct('address')}`,
  )

  if (dryRun) {
    console.log(`\nSimulation terminée : ${candidates.size} magasins seraient importés.`)
    return
  }

  const refs = [...candidates.keys()]
  const existing = new Set<string>()
  for (let i = 0; i < refs.length; i += 300) {
    const { data, error } = await supabase
      .from('stores')
      .select('osm_ref')
      .in('osm_ref', refs.slice(i, i + 300))
    if (error) throw error
    for (const row of data ?? []) existing.add(row.osm_ref as string)
  }

  const toRow = (s: StoreCandidate) => ({
    osm_ref: s.osm_ref,
    name: s.name,
    brand_id: brandId.get(s.brand_slug) ?? null,
    address: s.address,
    city: s.city,
    postcode: s.postcode,
    department: s.department,
    location: `SRID=4326;POINT(${s.lng} ${s.lat})`,
    opening_hours: s.opening_hours,
  })

  const inserts = [...candidates.values()].filter((s) => !existing.has(s.osm_ref))
  const updates = [...candidates.values()].filter((s) => existing.has(s.osm_ref))

  for (let i = 0; i < inserts.length; i += 200) {
    const { error } = await supabase
      .from('stores')
      .insert(inserts.slice(i, i + 200).map((s) => ({ ...toRow(s), status: 'active' })))
    if (error) throw error
  }
  // Updates refresh OSM-owned fields only (status, review and admin fields are left untouched).
  for (let i = 0; i < updates.length; i += 200) {
    const { error } = await supabase
      .from('stores')
      .upsert(updates.slice(i, i + 200).map(toRow), { onConflict: 'osm_ref' })
    if (error) throw error
  }

  console.log(`\nImport terminé : ${inserts.length} créés, ${updates.length} mis à jour.`)
}

main().catch((error: unknown) => {
  console.error("\nÉchec de l'import :", error instanceof Error ? error.message : error)
  process.exit(1)
})
