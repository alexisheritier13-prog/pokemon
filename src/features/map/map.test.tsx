import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { directionsUrl } from '@/lib/directions'
import type { LaunchStore } from './api'
import { parsePlaces } from './geocoder'
import { markerSvg, storesToGeoJSON } from './markers'
import { StoreList } from './StoreList'

const avignon = { lat: 43.9493, lng: 4.8055 }

function store(
  partial: Partial<LaunchStore> & Pick<LaunchStore, 'id' | 'name' | 'lat' | 'lng'>,
): LaunchStore {
  return {
    brand_slug: null,
    brand_name: null,
    brand_kind: null,
    category_color: null,
    address: null,
    city: null,
    postcode: null,
    ...partial,
  }
}

const stores: LaunchStore[] = [
  store({
    id: 'far',
    name: 'Cultura Marseille',
    city: 'Marseille',
    brand_name: 'Cultura',
    lat: 43.2965,
    lng: 5.3698,
  }),
  store({ id: 'near', name: 'Level Games', city: 'Avignon', lat: 43.9495, lng: 4.806 }),
  store({
    id: 'mid',
    name: 'JouéClub Le Pontet',
    city: 'Le Pontet',
    brand_name: 'JouéClub',
    lat: 43.96,
    lng: 4.86,
  }),
]

describe('storesToGeoJSON', () => {
  it('builds points with lng/lat order and a default "none" status', () => {
    const geo = storesToGeoJSON([stores[1]!])
    expect(geo.features[0]).toEqual({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.806, 43.9495] },
      properties: { id: 'near', name: 'Level Games', status: 'none' },
    })
  })

  it('draws an outlined price-tag marker with the given colors', () => {
    const svg = markerSvg('#237a46', '#ffffff', '#1b2a4a', 'M5 12.5l4.5 4.5L19 7.5')
    expect(svg).toContain('fill="#237a46"')
    expect(svg).toContain('stroke="#1b2a4a"')
  })
})

describe('parsePlaces', () => {
  it('maps Géoplateforme features to labelled places', () => {
    const places = parsePlaces({
      features: [
        {
          geometry: { coordinates: [4.8055, 43.9493] },
          properties: { city: 'Avignon', postcode: '84000', context: '84, Vaucluse' },
        },
      ],
    })
    expect(places).toEqual([
      { lat: 43.9493, lng: 4.8055, label: 'Avignon (84000)', context: '84, Vaucluse' },
    ])
  })
})

describe('directionsUrl', () => {
  it('opens Apple Plans on iPhone and Google Maps elsewhere', () => {
    expect(directionsUrl(avignon, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)')).toContain(
      'maps.apple.com',
    )
    expect(directionsUrl(avignon, 'Mozilla/5.0 (Linux; Android 15)')).toContain(
      'google.com/maps/dir',
    )
  })
})

function renderList() {
  const router = createMemoryRouter([
    { path: '/', element: <StoreList stores={stores} origin={avignon} /> },
  ])
  render(<RouterProvider router={router} />)
}

describe('StoreList', () => {
  it('sorts stores by distance and shows the status in text', () => {
    renderList()
    const items = within(
      screen.getByRole('list', { name: 'Magasins triés par distance' }),
    ).getAllByRole('link')
    expect(items.map((a) => a.textContent)).toEqual([
      expect.stringContaining('Level Games'),
      expect.stringContaining('JouéClub Le Pontet'),
      expect.stringContaining('Cultura Marseille'),
    ])
    expect(items[0]).toHaveAttribute('href', '/m/near')
    expect(items[0]).toHaveTextContent('Rien de récent')
    expect(items[2]).toHaveTextContent('86 km')
  })

  it('filters by name or town, ignoring accents and case', async () => {
    renderList()
    await userEvent.type(screen.getByRole('searchbox'), 'joueclub')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText('1 magasin')).toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('Aucun magasin ne correspond.')).toBeInTheDocument()
  })
})
