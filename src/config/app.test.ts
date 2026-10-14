import { describe, expect, it } from 'vitest'
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from './app'

describe('app config', () => {
  it('exposes a non-empty name and description', () => {
    expect(APP_NAME.trim()).not.toBe('')
    expect(APP_DESCRIPTION.trim()).not.toBe('')
  })

  it('exposes a semver version injected at build time', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})
