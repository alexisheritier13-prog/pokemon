import { describe, expect, it } from 'vitest'
import { describeStatus, openStatus, parisClock, parseOpeningHours } from './openingHours'

// 2026-10-14 is a Wednesday. Paris is UTC+2 in October.
const at = (iso: string) => new Date(iso)

describe('parseOpeningHours', () => {
  it('parses day ranges and Sunday mornings', () => {
    const week = parseOpeningHours('Mo-Sa 08:30-20:00; Su 08:30-12:30')!
    expect(week[0]).toEqual([[510, 1200]])
    expect(week[5]).toEqual([[510, 1200]])
    expect(week[6]).toEqual([[510, 750]])
  })

  it('handles lunch breaks, closed days and 24/7', () => {
    const week = parseOpeningHours('Tu-Sa 10:00-12:00,14:00-19:00')!
    expect(week[0]).toEqual([])
    expect(week[1]).toEqual([
      [600, 720],
      [840, 1140],
    ])
    expect(parseOpeningHours('24/7')![3]).toEqual([[0, 1440]])
    expect(parseOpeningHours('Mo-Su 09:00-19:00; Su off')![6]).toEqual([])
  })

  it('accepts commas between rules and skips dated exceptions', () => {
    expect(parseOpeningHours('Mo-Sa 08:45-19:30, Su 09:00-12:00')![6]).toEqual([[540, 720]])
    expect(parseOpeningHours('Mo-Sa 08:30-19:45; Su 09:00-12:45; Dec 25 off')![0]).toEqual([
      [510, 1185],
    ])
  })

  it('returns null for formats it does not understand', () => {
    expect(parseOpeningHours('Mo-Fr 09:00-18:00 "sur rendez-vous"')).toBeNull()
    expect(parseOpeningHours('sunrise-sunset')).toBeNull()
    expect(parseOpeningHours('')).toBeNull()
  })
})

describe('openStatus', () => {
  const week = parseOpeningHours('Mo-Sa 08:30-20:00; Su 09:00-12:30')!

  it('reads the clock in Europe/Paris', () => {
    expect(parisClock(at('2026-10-14T08:00:00Z'))).toEqual({ day: 2, minutes: 600 })
  })

  it('is open during opening hours', () => {
    const status = openStatus(week, at('2026-10-14T08:00:00Z')) // Wednesday 10:00 Paris
    expect(describeStatus(status, 2)).toBe('Ouvert · ferme à 20 h')
  })

  it('announces the next opening, tomorrow or later', () => {
    const evening = openStatus(week, at('2026-10-14T19:00:00Z')) // Wednesday 21:00
    expect(describeStatus(evening, 2)).toBe('Fermé · ouvre demain à 8 h 30')
    const sundayAfternoon = openStatus(week, at('2026-10-18T13:00:00Z')) // Sunday 15:00
    expect(describeStatus(sundayAfternoon, 6)).toBe('Fermé · ouvre demain à 8 h 30')
    const earlyMorning = openStatus(week, at('2026-10-14T05:00:00Z')) // Wednesday 07:00
    expect(describeStatus(earlyMorning, 2)).toBe('Fermé · ouvre à 8 h 30')
  })
})
