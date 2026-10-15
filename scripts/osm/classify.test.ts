import { describe, expect, it } from 'vitest'
import {
  classify,
  enrichWithReverse,
  matchBrand,
  normalize,
  type BrandRule,
  type OsmElement,
} from './classify.ts'

const brands: BrandRule[] = [
  { id: '1', slug: 'leclerc', osm_match: ['leclerc'] },
  { id: '2', slug: 'carrefour', osm_match: ['carrefour'] },
  { id: '3', slug: 'cultura', osm_match: ['cultura'] },
  { id: '4', slug: 'joueclub', osm_match: ['joueclub'] },
  { id: '5', slug: 'action', osm_match: ['action'] },
  { id: '6', slug: 'independant', osm_match: [] },
]

function node(tags: Record<string, string>, extra: Partial<OsmElement> = {}): OsmElement {
  return { type: 'node', id: 42, lat: 43.95, lon: 4.81, tags, ...extra }
}

describe('normalize', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalize('E.Leclerc')).toBe('e leclerc')
    expect(normalize('JouéClub')).toBe('joueclub')
  })
})

describe('matchBrand', () => {
  it('recognizes chains from brand or name tags', () => {
    expect(matchBrand({ brand: 'E.Leclerc' }, brands)?.slug).toBe('leclerc')
    expect(matchBrand({ name: 'Cultura Avignon Le Pontet' }, brands)?.slug).toBe('cultura')
    expect(matchBrand({ name: 'JouéClub Pertuis' }, brands)?.slug).toBe('joueclub')
  })

  it('only trusts an exact "Action" to avoid false positives', () => {
    expect(matchBrand({ brand: 'Action' }, brands)?.slug).toBe('action')
    expect(matchBrand({ name: 'Action Jeux' }, brands)).toBeNull()
  })
})

describe('classify', () => {
  it('keeps a branded hypermarket with its address and hours', () => {
    const result = classify(
      node({
        shop: 'supermarket',
        brand: 'E.Leclerc',
        name: 'E.Leclerc Pertuis',
        'addr:housenumber': '12',
        'addr:street': 'Avenue de Verdun',
        'addr:postcode': '84120',
        'addr:city': 'Pertuis',
        opening_hours: 'Mo-Sa 08:30-20:00',
      }),
      '84',
      brands,
    )
    expect(result).toEqual({
      store: {
        osm_ref: 'node/42',
        name: 'E.Leclerc Pertuis',
        brand_slug: 'leclerc',
        address: '12 Avenue de Verdun',
        city: 'Pertuis',
        postcode: '84120',
        department: '84',
        lat: 43.95,
        lng: 4.81,
        opening_hours: 'Mo-Sa 08:30-20:00',
      },
    })
  })

  it('keeps independent game and toy shops', () => {
    const result = classify(node({ shop: 'games', name: 'Le Repaire du Joueur' }), '13', brands)
    expect('store' in result && result.store.brand_slug).toBe('independant')
  })

  it('drops drive pickup points', () => {
    expect(classify(node({ shop: 'supermarket', name: 'Auchan Drive' }), '84', brands)).toEqual({
      rejected: 'proximity_format',
    })
  })

  it('drops proximity formats and unbranded generalist shops', () => {
    expect(classify(node({ shop: 'supermarket', name: 'Carrefour City' }), '84', brands)).toEqual({
      rejected: 'proximity_format',
    })
    expect(classify(node({ shop: 'supermarket', name: 'Épicerie du coin' }), '84', brands)).toEqual(
      {
        rejected: 'unbranded_generalist',
      },
    )
    expect(classify(node({ shop: 'books', name: 'Librairie Lafontaine' }), '84', brands)).toEqual({
      rejected: 'unbranded_generalist',
    })
  })

  it('uses the center of ways and rejects elements without position', () => {
    const way: OsmElement = {
      type: 'way',
      id: 7,
      center: { lat: 43.3, lon: 5.4 },
      tags: { shop: 'department_store', name: 'Fnac Marseille', brand: 'Cultura' },
    }
    const kept = classify(way, '13', brands)
    expect('store' in kept && kept.store.osm_ref).toBe('way/7')
    expect(
      classify({ type: 'node', id: 1, tags: { shop: 'toys', name: 'X Jouets' } }, '13', brands),
    ).toEqual({
      rejected: 'no_position',
    })
  })

  it('recognizes "Joué Club" written in two words', () => {
    const rules = brands.map((b) =>
      b.slug === 'joueclub' ? { ...b, osm_match: ['joueclub', 'joue club'] } : b,
    )
    const result = classify(
      node({ shop: 'toys', name: 'Joué Club – La Passion du Jouet' }),
      '84',
      rules,
    )
    expect('store' in result && result.store.brand_slug).toBe('joueclub')
  })

  it('ignores malformed postcodes', () => {
    const result = classify(
      node({ shop: 'toys', name: 'Jouets', 'addr:postcode': '84 120' }),
      '84',
      brands,
    )
    expect('store' in result && result.store.postcode).toBeNull()
  })
})

describe('enrichWithReverse', () => {
  const base = {
    osm_ref: 'node/1',
    name: 'Level Games',
    brand_slug: 'independant',
    address: null,
    city: null,
    postcode: null,
    department: '84',
    lat: 43.9,
    lng: 4.8,
    opening_hours: null,
  }

  it('fills city and postcode, and the address only when the point is close', () => {
    const near = enrichWithReverse(base, {
      city: 'Avignon',
      postcode: '84000',
      street: 'Place de l’Horloge',
      housenumber: '15',
      distance: 8,
    })
    expect(near).toMatchObject({
      city: 'Avignon',
      postcode: '84000',
      address: '15 Place de l’Horloge',
    })
    const far = enrichWithReverse(base, {
      city: 'Avignon',
      postcode: '84000',
      street: 'Rue X',
      distance: 300,
    })
    expect(far.address).toBeNull()
  })

  it('never overrides OSM values', () => {
    const osm = { ...base, city: 'Le Pontet', postcode: '84130', address: '1 Rue A' }
    expect(
      enrichWithReverse(osm, { city: 'Avignon', postcode: '84000', street: 'Rue B', distance: 1 }),
    ).toEqual(osm)
  })
})
