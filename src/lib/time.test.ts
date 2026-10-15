import { describe, expect, it } from 'vitest'
import { timeAgo } from './time'

const now = new Date('2026-10-15T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

describe('timeAgo', () => {
  it('speaks French at every scale', () => {
    expect(timeAgo(ago(20_000), now)).toBe('à l’instant')
    expect(timeAgo(ago(12 * 60_000), now)).toBe('il y a 12 min')
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('il y a 3 h')
    expect(timeAgo(ago(30 * 3_600_000), now)).toBe('hier')
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe('il y a 4 jours')
  })
})
