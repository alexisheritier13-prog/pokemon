import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Chip } from './Chip'
import { PressButton } from './PressButton'
import { ReputationBadge } from './ReputationBadge'
import { StatusBand } from './StatusBand'
import { TextField } from './TextField'
import { ToastProvider } from './Toast'
import { useToast } from './toast-context'

describe('PressButton', () => {
  it('is disabled and busy while loading', () => {
    render(<PressButton loading>Envoyer</PressButton>)
    const button = screen.getByRole('button', { name: 'Envoyer' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Chip', () => {
  it('exposes and toggles aria-pressed', async () => {
    function Harness() {
      const [on, setOn] = useState(false)
      return (
        <Chip selected={on} onClick={() => setOn((v) => !v)}>
          Display
        </Chip>
      )
    }
    render(<Harness />)
    const chip = screen.getByRole('button', { name: 'Display' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('StatusBand', () => {
  it('states the status in text and the rarity as an accessible label', () => {
    render(<StatusBand status="low_stock" rarity={2} />)
    expect(screen.getByText('Stock faible')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fiabilité 2 sur 3' })).toBeInTheDocument()
  })
})

describe('ReputationBadge', () => {
  it('names earned and locked badges for assistive tech', () => {
    render(
      <>
        <ReputationBadge badge="eclaireur" />
        <ReputationBadge badge="fiable" lockedProgress="18/30" />
      </>,
    )
    expect(screen.getByRole('img', { name: 'Éclaireur' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Fiable, pas encore obtenu (18/30)' }),
    ).toBeInTheDocument()
  })
})

describe('TextField', () => {
  it('links the error message with aria-describedby', () => {
    render(<TextField label="Pseudo" error="Trois caractères minimum." />)
    const input = screen.getByLabelText('Pseudo')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Trois caractères minimum.')
  })
})

describe('Toast', () => {
  it('announces messages in a polite live region', () => {
    let show: ReturnType<typeof useToast>['show'] = () => {}
    function Grab() {
      show = useToast().show
      return null
    }
    const { container } = render(
      <ToastProvider>
        <Grab />
      </ToastProvider>,
    )
    act(() => show({ message: 'Ajouté à tes favoris.' }))
    const region = container.querySelector('[aria-live="polite"]')
    expect(region).toHaveTextContent('Ajouté à tes favoris.')
  })
})
