import { useCallback, useEffect, useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { moduleByKey, type ModuleKey } from '@/lib/modules'
import { cn } from '@/lib/utils'

type FeedEvent = {
  id: string
  module: string
  action: string
  summary: string
  createdAt: string
  actor: { id: string; name: string | null } | null
}

function relativeTime(iso: string, now: number): string {
  const then = new Date(iso).getTime()
  const minutes = Math.round((now - then) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Recent household activity, newest first, with "load more" pagination. */
export default function ActivityFeed({ householdId }: { householdId: string }) {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [now] = useState(() => Date.now())

  const load = useCallback(async (before: string | null) => {
    const params = new URLSearchParams({ householdId })
    if (before) params.set('before', before)
    const response = await fetch(`/api/household/activity?${params.toString()}`)
    if (!response.ok) return null
    return response.json() as Promise<{ events: FeedEvent[]; nextBefore: string | null }>
  }, [householdId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void load(null)
      .then(payload => {
        if (cancelled || !payload) return
        setEvents(payload.events)
        setNextBefore(payload.nextBefore)
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [load])

  const loadMore = async () => {
    if (!nextBefore) return
    setLoadingMore(true)
    try {
      const payload = await load(nextBefore)
      if (payload) {
        setEvents(previous => [...previous, ...payload.events])
        setNextBefore(payload.nextBefore)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" aria-hidden="true" /> Recent activity
        </CardTitle>
        <CardDescription>What the household has been up to.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading activity…
          </div>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing yet — shopping, chores, meals and medicine actions will appear here.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {events.map(event => {
                const moduleEntry = moduleByKey[event.module as ModuleKey]
                return (
                  <li key={event.id} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', moduleEntry?.barClass ?? 'bg-muted-foreground')}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{event.summary}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {moduleEntry?.name ?? event.module} · {relativeTime(event.createdAt, now)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
            {nextBefore && (
              <Button variant="ghost" size="sm" className="mt-4" disabled={loadingMore} onClick={loadMore}>
                {loadingMore && <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />}
                Show older
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
