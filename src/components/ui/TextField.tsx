import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  hint?: string
  error?: string
}

// Visible label always (never placeholder-as-label); hint and error wired with aria-describedby.
export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-small font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-12 rounded-md border-2 bg-card px-3.5 text-body text-ink placeholder:text-ink-2',
          'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
          error ? 'border-status-out' : 'border-ink',
          'disabled:cursor-not-allowed disabled:bg-paper-2',
        )}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-caption text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption font-semibold text-status-out">
          {error}
        </p>
      )}
    </div>
  )
}
