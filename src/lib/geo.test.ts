import { describe, expect, it } from 'vitest'
import { distanceMeters, formatDistance, roundToGrid } from './geo'

describe('distanceMeters', () => {
  it('measures Avignon → Marseille at about 86 km', () => {
    const avignon = { lat: 43.9493, lng: 4.8055 }
    const marseille = { lat: 43.2965, lng: 5.3698 }
    expect(distanceMeters(avignon, marseille) / 1000).toBeCloseTo(86, 0)
  })

  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: 43.9, lng: 4.8 }, { lat: 43.9, lng: 4.8 })).toBe(0)
  })
})

describe('formatDistance', () => {
  it('uses meters under 1 km and French decimals above', () => {
    expect(formatDistance(4)).toBe('10 m')
    expect(formatDistance(447)).toBe('450 m')
    expect(formatDistance(4230)).toBe('4,2 km')
    expect(formatDistance(37_400)).toBe('37 km')
  })
})

describe('roundToGrid', () => {
  it('rounds to 0.01°', () => {
    expect(roundToGrid({ lat: 43.94931, lng: 4.80553 })).toEqual({ lat: 43.95, lng: 4.81 })
  })
})
