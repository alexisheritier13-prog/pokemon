import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { copy } from '@/copy/fr'
import type { LatLng } from '@/lib/geo'
import { useTheme } from '@/lib/useTheme'
import type { LaunchStore } from './api'
import { MARKER_STATUSES, markerSvgFor, storesToGeoJSON } from './markers'

type MapViewProps = {
  stores: LaunchStore[]
  center: LatLng
  zoom: number
  userPosition: LatLng | null
  selectedId: string | null
  onSelect: (storeId: string) => void
}

const PIXEL_RATIO = 2

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

async function loadMarkerImages(map: MapLibreMap) {
  await Promise.all(
    MARKER_STATUSES.map(
      (status) =>
        new Promise<void>((resolve) => {
          const svg = markerSvgFor(status, readVar)
          const image = new Image(52 * PIXEL_RATIO, 60 * PIXEL_RATIO)
          image.onload = () => {
            const name = `marker-${status}`
            if (map.hasImage(name)) map.removeImage(name)
            map.addImage(name, image, { pixelRatio: PIXEL_RATIO })
            resolve()
          }
          image.onerror = () => resolve()
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
        }),
    ),
  )
}

// Store layers: clustered GeoJSON source, yellow cluster pucks, price-tag markers, user position.
async function addStoreLayers(map: MapLibreMap, props: MapViewProps) {
  await loadMarkerImages(map)
  const ink = readVar('--shadow-solid')
  map.addSource('stores', {
    type: 'geojson',
    data: storesToGeoJSON(props.stores),
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 13,
  })
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'stores',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': readVar('--yellow'),
      'circle-stroke-color': ink,
      'circle-stroke-width': 3,
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 40, 27],
    },
  })
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'stores',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 14,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': readVar('--on-yellow') },
  })
  map.addLayer({
    id: 'store-markers',
    type: 'symbol',
    source: 'stores',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['concat', 'marker-', ['get', 'status']],
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-size': ['case', ['==', ['get', 'id'], props.selectedId ?? ''], 1.15, 1],
      'symbol-sort-key': ['case', ['==', ['get', 'id'], props.selectedId ?? ''], 1, 0],
    },
  })
  map.addSource('me', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'me-halo',
    type: 'circle',
    source: 'me',
    paint: { 'circle-radius': 14, 'circle-color': readVar('--status-soon'), 'circle-opacity': 0.2 },
  })
  map.addLayer({
    id: 'me-dot',
    type: 'circle',
    source: 'me',
    paint: {
      'circle-radius': 7,
      'circle-color': readVar('--status-soon'),
      'circle-stroke-color': readVar('--card'),
      'circle-stroke-width': 3,
    },
  })
  setUserPosition(map, props.userPosition)
}

function setUserPosition(map: MapLibreMap, position: LatLng | null) {
  const source = map.getSource('me') as GeoJSONSource | undefined
  source?.setData({
    type: 'FeatureCollection',
    features: position
      ? [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
            properties: {},
          },
        ]
      : [],
  })
}

export default function MapView(props: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const propsRef = useRef(props)
  const theme = useTheme()
  const initialTheme = useRef(theme)

  useEffect(() => {
    propsRef.current = props
  })

  // Create the map once.
  useEffect(() => {
    if (!container.current) return
    const { center, zoom } = propsRef.current
    const map = new maplibregl.Map({
      container: container.current,
      style: `/map/style-${initialTheme.current}.json`,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      maxZoom: 18,
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.enable()
    map.on('style.load', () => void addStoreLayers(map, propsRef.current))
    map.on('click', 'store-markers', (event) => {
      const id = event.features?.[0]?.properties?.id as string | undefined
      if (id) propsRef.current.onSelect(id)
    })
    map.on('click', 'clusters', async (event) => {
      const feature = event.features?.[0]
      const clusterId = feature?.properties?.cluster_id as number | undefined
      if (feature?.geometry.type !== 'Point' || clusterId === undefined) return
      const zoomTo = await (map.getSource('stores') as GeoJSONSource).getClusterExpansionZoom(
        clusterId,
      )
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: zoomTo })
    })
    for (const layer of ['store-markers', 'clusters']) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
    }
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Theme switch: swap the base style (layers are re-added on style.load with the new token colors).
  useEffect(() => {
    const map = mapRef.current
    if (!map || theme === initialTheme.current) return
    initialTheme.current = theme
    map.setStyle(`/map/style-${theme}.json`)
  }, [theme])

  useEffect(() => {
    const source = mapRef.current?.getSource('stores') as GeoJSONSource | undefined
    source?.setData(storesToGeoJSON(props.stores))
  }, [props.stores])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ center: [props.center.lng, props.center.lat], zoom: props.zoom, duration: 600 })
  }, [props.center.lat, props.center.lng, props.zoom])

  useEffect(() => {
    if (mapRef.current) setUserPosition(mapRef.current, props.userPosition)
  }, [props.userPosition])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('store-markers')) return
    const selected = props.selectedId ?? ''
    map.setLayoutProperty('store-markers', 'icon-size', [
      'case',
      ['==', ['get', 'id'], selected],
      1.15,
      1,
    ])
    map.setLayoutProperty('store-markers', 'symbol-sort-key', [
      'case',
      ['==', ['get', 'id'], selected],
      1,
      0,
    ])
  }, [props.selectedId])

  return (
    // MapLibre forces `position: relative` on its container, so it gets a full-size wrapper.
    <div className="absolute inset-0">
      <div
        ref={container}
        role="region"
        aria-label={copy.map.mapLabel}
        className="h-full w-full [&_.maplibregl-ctrl-attrib]:text-caption"
      />
    </div>
  )
}
