// Minimal parser for common OSM `opening_hours` values ("Mo-Sa 08:30-20:00; Su 09:00-12:30",
// "Tu-Sa 10:00-12:00,14:00-19:00", "24/7", "Su off"). Anything more exotic (months, weeks, holidays
// with dates, comments) returns null and the UI shows the raw text. Replaces the 160 kB `opening_hours`
// library (architecture deviation, story 2.4).

export type Range = [startMin: number, endMin: number]
export type WeekSchedule = Range[][] // index 0 = lundi … 6 = dimanche

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const
const DAY_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 24 || m > 59) return null
  return h * 60 + m
}

function parseDays(selector: string): number[] | null {
  const days = new Set<number>()
  for (const part of selector.split(',')) {
    if (part === 'PH') continue // public holidays: ignored (best effort)
    const [from, to] = part.split('-')
    const start = DAYS.indexOf(from as (typeof DAYS)[number])
    if (start < 0) return null
    if (to === undefined) {
      days.add(start)
      continue
    }
    const end = DAYS.indexOf(to as (typeof DAYS)[number])
    if (end < 0) return null
    for (let i = start; ; i = (i + 1) % 7) {
      days.add(i)
      if (i === end) break
    }
  }
  return [...days]
}

const MONTHS = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/

export function parseOpeningHours(raw: string | null | undefined): WeekSchedule | null {
  if (!raw) return null
  // Some mappers separate rules with "," instead of ";" ("Mo-Sa 08:45-19:30, Su 09:00-12:00").
  const value = raw.trim().replace(/(\d)\s*,\s*(?=(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b)/g, '$1;')
  const week: WeekSchedule = Array.from({ length: 7 }, () => [])
  if (value === '24/7') return week.map(() => [[0, 24 * 60]])

  for (const rawRule of value.split(';')) {
    const rule = rawRule.trim()
    if (!rule) continue
    // Dated exceptions ("Dec 25 off") are one-off holidays: ignored rather than failing the whole value.
    if (MONTHS.test(rule)) continue
    const match = /^([A-Za-z,-]+)?\s*(.*)$/.exec(rule)
    if (!match) return null
    const [, daySelector, timesPart = ''] = match
    const days = daySelector ? parseDays(daySelector) : [0, 1, 2, 3, 4, 5, 6]
    if (!days) return null
    if (daySelector === 'PH' || (daySelector?.split(',').every((d) => d === 'PH') ?? false))
      continue
    const times = timesPart.trim()
    if (times === 'off' || times === 'closed') {
      for (const day of days) week[day] = []
      continue
    }
    const ranges: Range[] = []
    for (const span of times.split(',')) {
      const [from, to] = span.trim().split('-')
      const start = parseTime(from ?? '')
      const end = parseTime(to ?? '')
      if (start === null || end === null) return null
      ranges.push([start, end <= start ? end + 24 * 60 : end])
    }
    if (ranges.length === 0) return null
    for (const day of days) week[day] = ranges
  }
  return week
}

// Day index (0 = lundi) and minutes since midnight, in Europe/Paris.
export function parisClock(date: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'))
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

export function formatTime(minutes: number): string {
  const m = minutes % (24 * 60)
  const h = Math.floor(m / 60)
  const min = m % 60
  return min === 0 ? `${h} h` : `${h} h ${String(min).padStart(2, '0')}`
}

export type OpenStatus =
  | { open: true; closesAt: number }
  | { open: false; opensDay: number | null; opensAt: number | null }

export function openStatus(week: WeekSchedule, now: Date): OpenStatus {
  const { day, minutes } = parisClock(now)
  for (const [start, end] of week[day] ?? []) {
    if (minutes >= start && minutes < end) return { open: true, closesAt: end }
  }
  // Previous day ranges running past midnight.
  const prev = (day + 6) % 7
  for (const [, end] of week[prev] ?? []) {
    if (end > 24 * 60 && minutes < end - 24 * 60) return { open: true, closesAt: end - 24 * 60 }
  }
  for (let offset = 0; offset < 8; offset++) {
    const d = (day + offset) % 7
    const next = (week[d] ?? []).find(([start]) => offset > 0 || start > minutes)
    if (next) return { open: false, opensDay: d, opensAt: next[0] }
  }
  return { open: false, opensDay: null, opensAt: null }
}

export function describeStatus(status: OpenStatus, today: number): string {
  if (status.open) return `Ouvert · ferme à ${formatTime(status.closesAt)}`
  if (status.opensDay === null || status.opensAt === null) return 'Fermé'
  const when =
    status.opensDay === today
      ? ''
      : status.opensDay === (today + 1) % 7
        ? 'demain '
        : `${DAY_FR[status.opensDay]} `
  return `Fermé · ouvre ${when}à ${formatTime(status.opensAt)}`
}

export function dayName(index: number): string {
  return DAY_FR[index] ?? ''
}
