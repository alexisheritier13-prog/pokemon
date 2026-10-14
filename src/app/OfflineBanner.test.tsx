import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OfflineBanner } from './OfflineBanner'

function setOnline(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

afterEach(() => vi.restoreAllMocks())

describe('OfflineBanner', () => {
  it('appears when the connection drops and disappears when it comes back', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    act(() => setOnline(false))
    expect(screen.getByRole('status')).toHaveTextContent('Pas de réseau')
    act(() => setOnline(true))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
