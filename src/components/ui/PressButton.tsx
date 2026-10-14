import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type PressButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  icon?: ReactNode
  loading?: boolean
  /** Visually pressed (selected) state, e.g. the active vote. */
  pressed?: boolean
  fullWidth?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-red text-on-red border-ink shadow-primary',
  secondary: 'bg-card text-ink border-ink shadow-press',
  ghost: 'bg-transparent text-ink border-transparent',
  danger: 'bg-card text-status-out border-status-out shadow-press',
}

export function PressButton({
  variant = 'primary',
  icon,
  loading = false,
  pressed = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: PressButtonProps) {
  const isDisabled = disabled || loading
  // Disabled buttons lose their relief and color; loading keeps the variant look but cannot be pressed.
  const muted = disabled && !loading
  const interactive = !isDisabled && variant !== 'ghost'
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'type-button inline-flex min-h-13 items-center justify-center gap-2.5 rounded-button border-3 px-5.5',
        'transition-[translate,box-shadow] duration-(--dur-tap) ease-linear select-none',
        muted ? 'cursor-not-allowed border-paper-2 bg-paper-2 text-ink-2' : variantClass[variant],
        loading && 'cursor-progress',
        interactive && 'cursor-pointer active:translate-y-1 active:shadow-pressed',
        pressed && variant !== 'ghost' && !muted && 'translate-y-1 shadow-pressed',
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}
