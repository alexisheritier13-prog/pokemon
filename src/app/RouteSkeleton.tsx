import { ReportCardSkeleton, Skeleton } from '@/components/ui/Skeleton'

// Shown while a lazy route chunk loads.
export function RouteSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-8">
      <Skeleton className="h-8 w-48" />
      <ReportCardSkeleton />
    </div>
  )
}
