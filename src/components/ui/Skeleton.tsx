import { cn } from '@/lib/cn'
import { copy } from '@/copy/fr'

// Paper shimmer block; static under reduced motion.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-[shimmer_1.4s_linear_infinite] rounded-sm bg-[linear-gradient(90deg,var(--paper-2)_25%,var(--card)_50%,var(--paper-2)_75%)] bg-size-[200%_100%]',
        className,
      )}
    />
  )
}

// Skeleton matching the ReportCard anatomy (band, photo window, lines).
export function ReportCardSkeleton() {
  return (
    <div
      role="status"
      aria-label={copy.common.loading}
      className="flex w-full max-w-85 flex-col gap-2 rounded-lg border-3 border-paper-2 bg-card p-2.5"
    >
      <Skeleton className="h-9 rounded-md" />
      <Skeleton className="h-37.5 rounded-md" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
