import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {
  selected: boolean
  icon?: ReactNode
  count?: number
}

// Toggle chip for multi-select (products, brands, filters). Always exposes aria-pressed.
export function Chip({
  selected,
  icon,
  count,
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill border-2 border-ink px-3.5 text-small font-semibold',
        'transition-colors duration-(--dur-fast)',
        selected ? 'bg-yellow text-on-yellow' : 'bg-card text-ink',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {count !== undefined && <span className="tabular-nums text-caption">({count})</span>}
    </button>
  )
}
