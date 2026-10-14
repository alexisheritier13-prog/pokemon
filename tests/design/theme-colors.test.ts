// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_THEME } from '../../src/config/app.ts'

const tokensCss = readFileSync(new URL('../../src/design/tokens.css', import.meta.url), 'utf8')

function paperIn(selector: string): string | undefined {
  const start = tokensCss.indexOf(selector)
  const body = tokensCss.slice(tokensCss.indexOf('{', start), tokensCss.indexOf('}', start))
  return body.match(/--paper:\s*(#[0-9a-f]{6})/i)?.[1]?.toLowerCase()
}

describe('browser chrome colors', () => {
  it('match the --paper token in both themes (manifest, theme-color, splash screens)', () => {
    expect(APP_THEME.light).toBe(paperIn(':root {'))
    expect(APP_THEME.dark).toBe(paperIn(":root[data-theme='dark']"))
  })
})
