/**
 * First-load placeholders shaped like the content that replaces them, so the
 * page does not jump. Spinners stay where they belong — inside the button you
 * just pressed — rather than standing in for a whole page.
 */
import { Skeleton } from '@/components/ui/Skeleton'

/** A placeholder that sweeps, which reads as work in progress rather than a blink. */
function Block({ className }: { className: string }) {
  return <Skeleton className={`shimmer ${className}`} />
}

export function BankingDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your banking dashboard">
      <div className="space-y-2">
        <Block className="h-4 w-40" />
        <Block className="h-9 w-72" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_2fr]">
        <Block className="h-44 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Block className="h-20 rounded-lg" />
          <Block className="h-20 rounded-lg" />
          <Block className="h-20 rounded-lg" />
          <Block className="h-20 rounded-lg" />
        </div>
      </div>
      <Block className="h-64 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Block className="h-56 rounded-lg" />
        <Block className="h-56 rounded-lg" />
      </div>
    </div>
  )
}

export function ChartSkeleton({ className = 'h-52' }: { className?: string }) {
  return <Skeleton className={`shimmer ${className} w-full rounded-lg`} />
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading banking analytics">
      <Block className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <Block key={index} className="h-24 rounded-lg" />)}
      </div>
      <Block className="h-64 rounded-lg" />
      <Block className="h-80 rounded-lg" />
    </div>
  )
}
