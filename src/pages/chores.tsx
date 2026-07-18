import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ListChecks, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import ChoreFormDialog, { type ChoreDto, type HouseholdMemberOption } from '@/components/chores/ChoreFormDialog'
import ChoreTodayList, { todayItemKey, type TodayChoreItem } from '@/components/chores/ChoreTodayList'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
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

function localDateOnly() {
  return new Date().toLocaleDateString('en-CA')
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
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<ChoreDto | null>(null)
  const [deletingChore, setDeletingChore] = useState<ChoreDto | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadToday = useCallback(async () => {
    const response = await fetch(`/api/chores/today?date=${localDateOnly()}`)
    const data = await responseJson(response)
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

  const resolveItem = useCallback(async (item: TodayChoreItem, resolveStatus: 'DONE' | 'SKIPPED') => {
    const key = todayItemKey(item)
    setBusyKey(key)
    try {
      const response = await fetch('/api/chores/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate, status: resolveStatus }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not update this chore'))
      setLogLoaded(false)
      await loadToday()
      if (resolveStatus === 'DONE') toast.success(`${item.chore.title} done`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this chore')
    } finally {
      setBusyKey(null)
    }
  }, [loadToday])

  const undoItem = useCallback(async (item: TodayChoreItem) => {
    const key = todayItemKey(item)
    setBusyKey(key)
    try {
      const response = await fetch('/api/chores/complete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate }),
      })
      if (!response.ok) throw new Error('Could not undo')
      setLogLoaded(false)
      await loadToday()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not undo')
    } finally {
      setBusyKey(null)
    }
  }, [loadToday])

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

  const pendingToday = todayItems.filter(item => item.status === 'PENDING').length

  if (status === 'unauthenticated') {
    return <ModernAppShell title="Chores"><div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Sign in to manage household chores.</div></ModernAppShell>
  }

  return (
    <ModernAppShell title="Chores">
      <Head><title>Chores – Clankeep</title></Head>
      <div className="mx-auto max-w-4xl space-y-4 pb-12">
        <header className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-soft-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Household chores</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pendingToday > 0 ? `${pendingToday} thing${pendingToday === 1 ? '' : 's'} to do today` : 'All caught up for today'}
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="min-h-11">
            <Plus />New chore
          </Button>
        </header>

        <Tabs value={tab} onValueChange={value => setTab(value as ChoresTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" className="min-h-10">Today{pendingToday > 0 && <Badge variant="outline" className="ml-2 border-module-chores/40 text-module-chores">{pendingToday}</Badge>}</TabsTrigger>
            <TabsTrigger value="all" className="min-h-10">All chores</TabsTrigger>
            <TabsTrigger value="log" className="min-h-10">Log</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map(index => <Skeleton key={index} className="h-14 rounded-xl" />)}</div>
        ) : tab === 'today' ? (
          <ChoreTodayList
            items={todayItems}
            busyKey={busyKey}
            onResolve={(item, resolveStatus) => void resolveItem(item, resolveStatus)}
            onUndo={item => void undoItem(item)}
            emptyAction={chores.length === 0 ? (
              <Button type="button" onClick={openCreate} className="min-h-11"><Plus />Create your first chore</Button>
            ) : undefined}
          />
        ) : tab === 'all' ? (
          chores.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              module="chores"
              title="No chores yet"
              description="Set up the recurring jobs your home runs on — bins, laundry, watering the plants — and tick them off together."
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
