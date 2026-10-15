import { BinocularsIcon } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { PressButton } from '@/components/ui/PressButton'
import { Sparkle } from '@/components/ui/Sparkle'
import { copy } from '@/copy/fr'

const t = copy.reportFlow

// Five sparkles bursting from the badge (directions in px).
const BURST: Array<[number, number]> = [
  [-70, -50],
  [70, -55],
  [-85, 20],
  [85, 25],
  [0, -85],
]

export function ReportSuccess({ storeId, onAnother }: { storeId: string; onAnother: () => void }) {
  return (
    <section
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center"
    >
      <div className="relative">
        <div className="grid size-24 animate-[pop_var(--dur-celebrate)_var(--ease-spring)] place-items-center rounded-xl border-3 border-ink bg-status-ok text-on-status shadow-card">
          <BinocularsIcon weight="bold" aria-hidden="true" className="size-12" />
        </div>
        {BURST.map(([dx, dy], i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -mt-3 -ml-3 animate-[sparkle-burst_var(--dur-celebrate)_ease-out_forwards] text-yellow opacity-0"
            style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties}
          >
            <Sparkle className="size-6" />
          </span>
        ))}
      </div>
      <h1 className="type-display">{t.successTitle}</h1>
      <p className="max-w-prose text-body text-ink-2">{t.successBody}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to={`/m/${storeId}`}
          className="type-button inline-flex min-h-13 items-center rounded-button border-3 border-ink bg-red px-5.5 text-on-red shadow-primary active:translate-y-1 active:shadow-pressed"
        >
          {t.seeStore}
        </Link>
        <Link
          to="/"
          className="type-button inline-flex min-h-13 items-center rounded-button border-3 border-ink bg-card px-5.5 text-ink shadow-press active:translate-y-1 active:shadow-pressed"
        >
          {t.backToMap}
        </Link>
      </div>
      <PressButton variant="ghost" onClick={onAnother}>
        {t.another}
      </PressButton>
    </section>
  )
}
