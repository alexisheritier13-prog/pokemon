// Builds public/map/style-{light,dark}.json from OpenFreeMap "positron", recolored to the Classeur tokens.
//   node scripts/build-map-styles.ts
// Re-run only when updating the base style; the generated files are committed.
import { mkdirSync, writeFileSync } from 'node:fs'

type Layer = {
  id: string
  type: string
  source?: string
  paint?: Record<string, unknown>
  layout?: Record<string, unknown>
}
type Style = { sources: Record<string, unknown>; layers: Layer[]; [key: string]: unknown }

type Palette = {
  background: string
  water: string
  waterLabel: string
  green: string
  landuse: string
  building: string
  buildingOutline: string
  roadMinor: string
  roadMajor: string
  roadCasing: string
  motorway: string
  rail: string
  boundary: string
  label: string
  labelSoft: string
  halo: string
}

const light: Palette = {
  background: '#f6efdf',
  water: '#c9d9e0',
  waterLabel: '#4c6f8c',
  green: '#e4e6cc',
  landuse: '#efe6d0',
  building: '#ebe0c6',
  buildingOutline: '#dfd2b4',
  roadMinor: '#fffbf2',
  roadMajor: '#fffbf2',
  roadCasing: '#ddd0b2',
  motorway: '#f5dca8',
  rail: '#d6c9ab',
  boundary: '#b4a688',
  label: '#1b2a4a',
  labelSoft: '#4a5876',
  halo: '#f6efdf',
}

const dark: Palette = {
  background: '#0f1830',
  water: '#1b2d52',
  waterLabel: '#8fb2dd',
  green: '#132541',
  landuse: '#121d39',
  building: '#18244a',
  buildingOutline: '#1f2d58',
  roadMinor: '#22325a',
  roadMajor: '#2b3d6b',
  roadCasing: '#0a1126',
  motorway: '#4a4a6e',
  rail: '#26355f',
  boundary: '#3f4e7c',
  label: '#f3ead6',
  labelSoft: '#aeb6cb',
  halo: '#0f1830',
}

function colorFor(layer: Layer, property: string, p: Palette): string | null {
  const id = layer.id
  if (property.endsWith('halo-color')) return p.halo
  if (property === 'text-color') {
    if (id.startsWith('water')) return p.waterLabel
    if (id.startsWith('highway') || id.startsWith('airport') || id.startsWith('label_other'))
      return p.labelSoft
    return p.label
  }
  if (id === 'background' || id.startsWith('road_area_pier') || id.startsWith('road_pier'))
    return p.background
  if (id.startsWith('water')) return p.water
  if (id.startsWith('park') || id.startsWith('landcover_wood')) return p.green
  if (id.startsWith('landcover_') || id.startsWith('landuse')) return p.landuse
  if (id.startsWith('building'))
    return property.includes('outline') ? p.buildingOutline : p.building
  if (id.startsWith('aeroway')) return p.roadMinor
  if (id.includes('casing')) return p.roadCasing
  if (id.includes('motorway')) return p.motorway
  if (id.startsWith('highway_major') || id.startsWith('tunnel')) return p.roadMajor
  if (id.startsWith('highway')) return p.roadMinor
  if (id.startsWith('railway')) return p.rail
  if (id.startsWith('boundary')) return p.boundary
  return null
}

function recolor(base: Style, palette: Palette): Style {
  const style = structuredClone(base)
  // Flat look: drop the shaded relief raster.
  delete (style.sources as Record<string, unknown>).ne2_shaded
  style.layers = style.layers
    .filter((layer) => layer.source !== 'ne2_shaded')
    .map((layer) => {
      for (const [property, value] of Object.entries(layer.paint ?? {})) {
        if (!property.endsWith('color') || typeof value !== 'string') continue
        const next = colorFor(layer, property, palette)
        if (next) layer.paint![property] = next
      }
      return layer
    })
  style.name = palette === light ? 'Classeur (jour)' : 'Classeur (nuit)'
  return style
}

const response = await fetch('https://tiles.openfreemap.org/styles/positron')
if (!response.ok) throw new Error(`OpenFreeMap style: ${response.status}`)
const base = (await response.json()) as Style

mkdirSync('public/map', { recursive: true })
writeFileSync('public/map/style-light.json', JSON.stringify(recolor(base, light)))
writeFileSync('public/map/style-dark.json', JSON.stringify(recolor(base, dark)))
console.log('Styles générés : public/map/style-light.json, public/map/style-dark.json')
