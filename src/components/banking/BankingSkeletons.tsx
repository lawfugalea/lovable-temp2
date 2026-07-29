/**
 * First-load placeholders shaped like the content that replaces them, so the
 * page does not jump. Spinners stay where they belong — inside the button you
 * just pressed — rather than standing in for a whole page.
 */
import { Skeleton } from '@/components/ui/Skeleton'

export function BankingDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your banking dashboard">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_2fr]">
        <Skeleton className="h-44 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  )
}

export function ChartSkeleton({ className = 'h-52' }: { className?: string }) {
  return <Skeleton className={`${className} w-full rounded-lg`} />
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading banking analytics">
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </div>
  )
}
