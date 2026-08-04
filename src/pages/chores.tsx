import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ListChecks, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import ChoreFormDialog, { type ChoreDto, type HouseholdMemberOption } from '@/components/chores/ChoreFormDialog'
import ChoreFairnessPanel from '@/components/chores/ChoreFairnessPanel'
import ChoreGroupedList from '@/components/chores/ChoreGroupedList'
import ChoreTodayList from '@/components/chores/ChoreTodayList'
import { localDateOnly, todayItemKey, type TodayChoreItem } from '@/lib/chore-view'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import ModuleFirstRun from '@/components/onboarding/ModuleFirstRun'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type ChoresTab = 'today' | 'all' | 'log'

interface LogEntry {
  id: string
  choreId: string
  title: string
  dueDate: string
  status: 'DONE' | 'SKIPPED'
  completedBy: { id: string; name: string | null } | null
  completedAt: string
}

function errorMessage(value: unknown, fallback: string) {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') return value.error
  return fallback
}

async function responseJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>
}

export default function ChoresPage() {
  const { status } = useSession()
  const [tab, setTab] = useState<ChoresTab>('today')
  const [todayItems, setTodayItems] = useState<TodayChoreItem[]>([])
  const [chores, setChores] = useState<ChoreDto[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [members, setMembers] = useState<HouseholdMemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [logLoaded, setLogLoaded] = useState(false)
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  /**
   * Statuses applied on click, before the server answers.
   *
   * The overlay is applied at render and cleared per key when that key's own
   * request settles, which is what stops a slow refetch from clobbering a newer
   * tap: loadToday() replaces todayItems, but an in-flight key keeps its
   * optimistic status until its own request finishes.
   */
  const [optimistic, setOptimistic] = useState<Record<string, 'DONE' | 'SKIPPED'>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<ChoreDto | null>(null)
  const [deletingChore, setDeletingChore] = useState<ChoreDto | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  /** Bumped whenever an occurrence is resolved, so the fairness panel refetches. */
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)

  /**
   * Discards a stale response if a newer loadToday() has been issued since —
   * otherwise a slower, earlier-issued request could overwrite state with
   * stale data after a faster, later request has already landed.
   */
  const loadTodayGeneration = useRef(0)

  const loadToday = useCallback(async () => {
    const generation = ++loadTodayGeneration.current
    const response = await fetch(`/api/chores/today?date=${localDateOnly()}`)
    const data = await responseJson(response)
    if (generation !== loadTodayGeneration.current) return
    if (response.ok) setTodayItems((data.items || []) as TodayChoreItem[])
  }, [])

  const loadChores = useCallback(async () => {
    const response = await fetch('/api/chores')
    const data = await responseJson(response)
    if (response.ok) setChores((data.chores || []) as ChoreDto[])
  }, [])

  const loadLog = useCallback(async () => {
    const response = await fetch('/api/chores/log')
    const data = await responseJson(response)
    if (response.ok) {
      setLogEntries((data.entries || []) as LogEntry[])
      setLogLoaded(true)
    }
  }, [])

  const loadMembers = useCallback(async () => {
    try {
      const active = await responseJson(await fetch('/api/household/active'))
      const householdId = typeof active.householdId === 'string' ? active.householdId : ''
      if (!householdId) return
      const data = await responseJson(await fetch(`/api/household/members?householdId=${encodeURIComponent(householdId)}`))
      const rows = Array.isArray(data.members) ? data.members : []
      setMembers(rows.map((row: { user?: { id?: string; name?: string | null } }) => ({
        id: row.user?.id || '',
        name: row.user?.name || null,
      })).filter((member: HouseholdMemberOption) => member.id))
    } catch {
      // assignee picker degrades to "anyone"
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setLoading(false)
      return
    }
    void (async () => {
      await Promise.all([loadToday(), loadChores(), loadMembers()])
      setLoading(false)
    })()
  }, [status, loadToday, loadChores, loadMembers])

  useEffect(() => {
    if (tab === 'log' && !logLoaded && status === 'authenticated') void loadLog()
  }, [tab, logLoaded, status, loadLog])

  const setBusy = useCallback((key: string, busy: boolean) => {
    setBusyKeys(current => {
      const next = new Set(current)
      if (busy) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const clearOptimistic = useCallback((key: string) => {
    setOptimistic(current => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])

  const resolveItem = useCallback(async (item: TodayChoreItem, resolveStatus: 'DONE' | 'SKIPPED') => {
    const key = todayItemKey(item)
    if (busyKeys.has(key)) return
    setBusy(key, true)
    // Apply first: the 200ms completion animation should not sit behind a
    // network round trip, or it reads as latency instead of feedback.
    setOptimistic(current => ({ ...current, [key]: resolveStatus }))
    try {
      const response = await fetch('/api/chores/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate, status: resolveStatus }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not update this chore'))
      setLogLoaded(false)
      setStatsRefreshKey(current => current + 1)
      await loadToday()
      if (resolveStatus === 'DONE') toast.success(`${item.chore.title} done`)
    } catch (error) {
      // Clearing the overlay reverts to server truth, which plays the mirrored
      // animation back to pending.
      toast.error(error instanceof Error ? error.message : 'Could not update this chore')
    } finally {
      clearOptimistic(key)
      setBusy(key, false)
    }
  }, [busyKeys, clearOptimistic, loadToday, setBusy])

  const undoItem = useCallback(async (item: TodayChoreItem) => {
    const key = todayItemKey(item)
    if (busyKeys.has(key)) return
    setBusy(key, true)
    try {
      const response = await fetch('/api/chores/complete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate }),
      })
      if (!response.ok) throw new Error('Could not undo')
      setLogLoaded(false)
      setStatsRefreshKey(current => current + 1)
      await Promise.all([loadToday(), logLoaded ? loadLog() : Promise.resolve()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not undo')
    } finally {
      clearOptimistic(key)
      setBusy(key, false)
    }
  }, [busyKeys, clearOptimistic, loadLog, loadToday, logLoaded, setBusy])

  const toggleActive = useCallback(async (chore: ChoreDto) => {
    const response = await fetch(`/api/chores/${encodeURIComponent(chore.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !chore.active }),
    })
    const data = await responseJson(response)
    if (!response.ok) {
      toast.error(errorMessage(data, 'Could not update this chore'))
      return
    }
    setChores(current => current.map(row => (row.id === chore.id ? (data.chore as ChoreDto) : row)))
    void loadToday()
  }, [loadToday])

  const deleteChore = useCallback(async () => {
    if (!deletingChore) return
    setDeleteBusy(true)
    try {
      const response = await fetch(`/api/chores/${encodeURIComponent(deletingChore.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not delete this chore')
      setChores(current => current.filter(row => row.id !== deletingChore.id))
      setDeletingChore(null)
      void loadToday()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this chore')
    } finally {
      setDeleteBusy(false)
    }
  }, [deletingChore, loadToday])

  const onSaved = useCallback((chore: ChoreDto, created: boolean) => {
    setChores(current => (created ? [chore, ...current] : current.map(row => (row.id === chore.id ? chore : row))))
    setLogLoaded(false)
    void loadToday()
    toast.success(created ? 'Chore created' : 'Chore updated')
  }, [loadToday])

  const openCreate = () => { setEditingChore(null); setFormOpen(true) }
  const openEdit = (chore: ChoreDto) => { setEditingChore(chore); setFormOpen(true) }

  const visibleItems = useMemo(
    () => todayItems.map(item => {
      const status = optimistic[todayItemKey(item)]
      return status ? { ...item, status } : item
    }),
    [todayItems, optimistic],
  )
  const pendingToday = visibleItems.filter(item => item.status === 'PENDING').length

  if (status === 'unauthenticated') {
    return <ModernAppShell title="Chores"><div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Sign in to manage household chores.</div></ModernAppShell>
  }

  return (
    <ModernAppShell title="Chores">
      <Head><title>Chores – Clankeep</title></Head>
      <div className="mx-auto max-w-4xl space-y-4 pb-12">
        <header className="overflow-hidden rounded-xl border bg-card shadow-soft-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">Household chores</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {pendingToday > 0 ? `${pendingToday} thing${pendingToday === 1 ? '' : 's'} to do today` : 'All caught up for today'}
              </p>
            </div>
            <Button type="button" data-tour="page-chores" onClick={openCreate} className="min-h-11">
              <Plus />New chore
            </Button>
          </div>
          <Tabs value={tab} onValueChange={value => setTab(value as ChoresTab)} className="border-t px-2 sm:px-4">
            <TabsList aria-label="Chores sections" className="grid h-auto w-full grid-cols-3 rounded-none bg-transparent p-0 sm:flex sm:w-auto sm:justify-start">
              <TabsTrigger value="today" className="min-h-12 gap-2 rounded-none border-b-2 border-transparent px-3 font-semibold hover:text-foreground data-[state=active]:border-module-chores data-[state=active]:bg-transparent data-[state=active]:text-module-chores data-[state=active]:shadow-none sm:px-4">
                Today
                {pendingToday > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-module-chores/10 px-1.5 py-0.5 text-[11px] font-bold leading-none text-module-chores">
                    {pendingToday}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="min-h-12 rounded-none border-b-2 border-transparent px-3 font-semibold hover:text-foreground data-[state=active]:border-module-chores data-[state=active]:bg-transparent data-[state=active]:text-module-chores data-[state=active]:shadow-none sm:px-4">
                All chores
              </TabsTrigger>
              <TabsTrigger value="log" className="min-h-12 rounded-none border-b-2 border-transparent px-3 font-semibold hover:text-foreground data-[state=active]:border-module-chores data-[state=active]:bg-transparent data-[state=active]:text-module-chores data-[state=active]:shadow-none sm:px-4">
                Log
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map(index => <Skeleton key={index} className="h-14 rounded-xl" />)}</div>
        ) : tab === 'today' ? (
          <>
            <ChoreGroupedList
              items={visibleItems}
              busyKeys={busyKeys}
              localDate={localDateOnly()}
              onResolve={(item, resolveStatus) => void resolveItem(item, resolveStatus)}
              onUndo={item => void undoItem(item)}
              emptyAction={chores.length === 0 ? (
                <Button type="button" onClick={openCreate} className="min-h-11"><Plus />Create your first chore</Button>
              ) : undefined}
            />
            {chores.length > 0 && <ChoreFairnessPanel refreshKey={statsRefreshKey} />}
          </>
        ) : tab === 'all' ? (
          chores.length === 0 ? (
            <ModuleFirstRun
              module="chores"
              title="No chores yet"
              action={<Button type="button" onClick={openCreate} className="min-h-11"><Plus />Create your first chore</Button>}
            />
          ) : (
            <div className="divide-y rounded-xl border bg-card">
              {chores.map(chore => (
                <div key={chore.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', !chore.active && 'text-muted-foreground line-through')}>{chore.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {chore.schedule}
                      {chore.assignee && <> · {chore.assignee.name || 'Assigned'}</>}
                      {!chore.active && <> · paused</>}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void toggleActive(chore)} className="shrink-0 text-muted-foreground">
                    {chore.active ? 'Pause' : 'Resume'}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${chore.title}`} onClick={() => openEdit(chore)} className="shrink-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${chore.title}`} onClick={() => setDeletingChore(chore)} className="shrink-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : !logLoaded ? (
          <div className="flex items-center justify-center rounded-xl border bg-card p-10 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading history…</div>
        ) : logEntries.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            module="chores"
            title="No history yet"
            description="Completed and skipped chores from the last 30 days show up here."
          />
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {logEntries.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <Badge variant="outline" className={cn('shrink-0', entry.status === 'DONE' ? 'border-module-chores/40 text-module-chores' : 'text-muted-foreground')}>
                  {entry.status === 'DONE' ? 'Done' : 'Skipped'}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(`${entry.dueDate}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    {entry.completedBy && <> · by {entry.completedBy.name || 'someone'}</>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChoreFormDialog open={formOpen} chore={editingChore} members={members} onClose={() => setFormOpen(false)} onSaved={onSaved} />

      <Dialog open={deletingChore !== null} onOpenChange={open => !open && setDeletingChore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this chore?</DialogTitle>
            <DialogDescription>
              {deletingChore?.title} and its history will be permanently removed. Pausing keeps the history instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingChore(null)} className="min-h-11">Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void deleteChore()} disabled={deleteBusy} className="min-h-11">
              {deleteBusy && <Loader2 className="animate-spin" />}Delete chore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernAppShell>
  )
}
