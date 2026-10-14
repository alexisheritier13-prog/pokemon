import { Sparkle } from './Sparkle'

// Loading indicator: the rarity sparkle, spinning (static under reduced motion).
export function Spinner() {
  return (
    <span aria-hidden="true" className="inline-flex animate-[spin_1.1s_linear_infinite]">
      <Sparkle />
    </span>
  )
}
