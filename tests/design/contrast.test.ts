// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const tokensCss = readFileSync(new URL('../../src/design/tokens.css', import.meta.url), 'utf8')

type Palette = Record<string, string>

function parseBlock(css: string, selector: string): Palette {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`Selector not found: ${selector}`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const body = css.slice(open + 1, close)
  const palette: Palette = {}
  for (const match of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    palette[match[1]!] = match[2]!.toLowerCase()
  }
  return palette
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const TEXT = 4.5
const UI = 3

// [foreground, background, minimum ratio]
const pairs: Array<[string, string, number]> = [
  ['ink', 'paper', TEXT],
  ['ink', 'card', TEXT],
  ['ink', 'paper-2', TEXT],
  ['ink-2', 'paper', TEXT],
  ['ink-2', 'card', TEXT],
  ['on-red', 'red', TEXT],
  ['on-yellow', 'yellow', TEXT],
  ['on-status', 'status-ok', TEXT],
  ['on-status-low', 'status-low', TEXT],
  ['on-status', 'status-out', TEXT],
  ['on-status', 'status-soon', TEXT],
  ['on-status', 'status-none', UI], // icon-only marker, never running text
  ['focus', 'paper', UI],
  ['focus', 'card', UI],
  ['red', 'paper', UI], // primary button surface against the page
  ['status-out', 'card', UI], // danger button text & error border (large/bold)
]

const themes: Array<[string, Palette]> = [
  ['light', { ...parseBlock(tokensCss, ':root {') }],
  ['dark', { ...parseBlock(tokensCss, ":root[data-theme='dark']") }],
]

describe('design tokens contrast (WCAG AA)', () => {
  for (const [themeName, palette] of themes) {
    for (const [fg, bg, min] of pairs) {
      it(`${themeName}: ${fg} on ${bg} >= ${min}:1`, () => {
        const a = palette[fg]
        const b = palette[bg]
        expect(a, `missing --${fg}`).toBeDefined()
        expect(b, `missing --${bg}`).toBeDefined()
        expect(contrast(a!, b!)).toBeGreaterThanOrEqual(min)
      })
    }
  }

  it('keeps the media-query dark block identical to the explicit dark theme', () => {
    const media = parseBlock(tokensCss, ":root:not([data-theme='light'])")
    const explicit = parseBlock(tokensCss, ":root[data-theme='dark']")
    expect(media).toEqual(explicit)
  })
})
