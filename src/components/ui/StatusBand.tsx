import { copy } from '@/copy/fr'
import { cn } from '@/lib/cn'
import { Sparkle } from './Sparkle'
import { statusMeta, type Rarity, type StatusKey } from './status'

type StatusBandProps = { status: StatusKey; rarity?: Rarity; remote?: boolean; className?: string }

export function StatusBand({ status, rarity, remote = false, className }: StatusBandProps) {
  const { icon: StatusIcon, surface } = statusMeta[status]
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-md px-3 py-2',
        surface,
        className,
      )}
    >
      <span className="type-band flex items-center gap-2">
        <StatusIcon weight="bold" aria-hidden="true" className="size-4.5" />
        {copy.status[status]}
        {remote && (
          <span className="rounded-pill bg-card px-2 py-0.5 text-label font-bold tracking-normal text-ink normal-case">
            {copy.report.remote}
          </span>
        )}
      </span>
      {rarity && <RarityMeter value={rarity} />}
    </div>
  )
}

export function RarityMeter({ value }: { value: Rarity }) {
  return (
    // Dark pocket keeps the yellow sparkles readable on every status color, in both themes.
    <span
      role="img"
      aria-label={copy.report.rarity(value)}
      className="flex gap-0.5 rounded-pill bg-solid px-1.5 py-0.5 text-yellow"
    >
      {[1, 2, 3].map((i) => (
        <Sparkle key={i} className={cn('size-4', i > value && 'opacity-30')} />
      ))}
    </span>
  )
}
