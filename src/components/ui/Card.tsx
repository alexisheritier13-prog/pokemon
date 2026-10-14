import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

// The "pochette" surface: thick ink frame and solid colored shadow.
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border-3 border-ink bg-card p-2.5 text-ink shadow-card', className)}
      {...rest}
    />
  )
}
