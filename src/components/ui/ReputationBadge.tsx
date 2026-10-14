import { copy } from '@/copy/fr'
import { cn } from '@/lib/cn'
import { HoloLayer } from './HoloLayer'

export type BadgeKey = 'nouveau' | 'fiable' | 'eclaireur' | 'veteran'
type Size = 'inline' | 'card' | 'showcase'

const sizeClass: Record<Size, string> = { inline: 'size-5', card: 'size-10', showcase: 'size-16' }

const badgeColor: Record<BadgeKey, string> = {
  nouveau: 'var(--status-ok)',
  fiable: 'var(--status-soon)',
  eclaireur: 'var(--yellow)',
  veteran: 'var(--red)',
}
const holoBadges: ReadonlySet<BadgeKey> = new Set(['eclaireur', 'veteran'])

const HEX_OUTER = 'M32 4l24 14v28L32 60 8 46V18z'
const HEX_INNER = 'M32 13l16 9.5v19L32 51l-16-9.5v-19z'

type ReputationBadgeProps = {
  badge: BadgeKey
  size?: Size
  /** When set, the badge is not earned yet; shows progress like "18/30". */
  lockedProgress?: string
  className?: string
}

// Collectible badge: hexagonal chip (direction C) drawn in the Classeur ink language (direction A).
export function ReputationBadge({
  badge,
  size = 'card',
  lockedProgress,
  className,
}: ReputationBadgeProps) {
  const name = copy.badges[badge]
  const locked = lockedProgress !== undefined
  const label = locked ? copy.badges.locked(name, lockedProgress) : name

  const svg = (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={label}
      className={cn(sizeClass[size], 'block', className)}
    >
      {locked ? (
        <>
          <path
            d={HEX_OUTER}
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="3"
            strokeDasharray="5 5"
            strokeLinejoin="round"
            opacity="0.55"
          />
          {size !== 'inline' && (
            <text
              x="32"
              y="37"
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill="var(--ink-2)"
            >
              {lockedProgress}
            </text>
          )}
        </>
      ) : (
        <>
          <path
            d={HEX_OUTER}
            fill={badgeColor[badge]}
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path d={HEX_INNER} fill="var(--card)" />
          <Emblem badge={badge} />
        </>
      )}
    </svg>
  )

  if (locked || !holoBadges.has(badge) || size === 'inline') return svg
  return <HoloLayer className="inline-block rounded-md leading-none">{svg}</HoloLayer>
}

function Emblem({ badge }: { badge: BadgeKey }) {
  const color = badge === 'eclaireur' ? 'var(--red)' : badgeColor[badge]
  switch (badge) {
    case 'nouveau':
      return (
        <g
          transform="translate(20 20)"
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21c0-9 5-15 18-16-.5 11-6 17-16 17" />
          <path d="M3 21l8-8" />
        </g>
      )
    case 'fiable':
      return (
        <path
          d="M24 32l6 6 11-13"
          stroke={color}
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'eclaireur':
      return (
        <g
          transform="translate(18 18)"
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinejoin="round"
        >
          <circle cx="14" cy="14" r="10.5" />
          <path d="M19 9l-3 7-7 3 3-7z" fill={color} />
        </g>
      )
    case 'veteran':
      return (
        <g fill={color}>
          <path d="M32 20c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6z" />
          <path d="M24 33c.3 2.4 1.2 3.3 3.6 3.6-2.4.3-3.3 1.2-3.6 3.6-.3-2.4-1.2-3.3-3.6-3.6 2.4-.3 3.3-1.2 3.6-3.6z" />
          <path d="M40 33c.3 2.4 1.2 3.3 3.6 3.6-2.4.3-3.3 1.2-3.6 3.6-.3-2.4-1.2-3.3-3.6-3.6 2.4-.3 3.3-1.2 3.6-3.6z" />
        </g>
      )
  }
}
