import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, BellRing, CalendarClock, Check, Loader2, Plus, RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

type AccountOption = { id: string; displayName: string; currency: string }

type Subscription = {
  id: string | null
  accountId: string
  merchantKey: string
  displayName: string
  status: 'CANDIDATE' | 'CONFIRMED' | 'DISMISSED'
  cadence: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  intervalDays: number | null
  expectedAmount: string | number | null
  amountTolerance: string | number | null
  currency: string
  nextExpectedDate: string | null
  lastSeenAt: string | null
  reminderDays: number
  occurrenceCount: number
  confidence: number
  manual: boolean
  detectionSource: 'KNOWN_SERVICE' | 'RECURRING_PATTERN' | 'MANUAL'
  detectionReason: string
  serviceCategory: string | null
  priceChanged: boolean
  previousTypicalAmount: number | null
  latestAmount: number | null
  dueState: 'UPCOMING' | 'DUE' | 'OVERDUE' | null
  account: { id: string; displayName: string } | null
}

type Props = {
  householdId: string
  accountId: string
  accounts: AccountOption[]
  canManage: boolean
  reloadKey: number
  onError: (message: string) => void
  onNotice: (message: string) => void
}

function money(amount: string | number | null, currency: string): string {
  if (amount === null || !Number.isFinite(Number(amount))) return 'Amount varies'
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency }).format(Number(amount))
}

function dateLabel(value: string | null): string {
  if (!value) return 'Date not set'
  return new Intl.DateTimeFormat('en-MT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00Z`))
}

const cadenceLabels = { WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly', CUSTOM: 'Custom' }

export default function FinanceSubscriptionsPanel({ householdId, accountId, accounts, canManage, reloadKey, onError, onNotice }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [reminders, setReminders] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [filter, setFilter] = useState<'CANDIDATE' | 'CONFIRMED' | 'DISMISSED'>('CANDIDATE')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [form, setForm] = useState({ accountId: accountId || accounts[0]?.id || '', displayName: '', cadence: 'MONTHLY', expectedAmount: '', nextExpectedDate: '', reminderDays: '3' })

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const query = new URLSearchParams({ householdId })
      if (accountId) query.set('accountId', accountId)
      const response = await fetch(`/api/finance/subscriptions?${query}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load subscriptions')
      setSubscriptions(payload.subscriptions || [])
      setReminders(payload.reminders || [])
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [accountId, householdId, onError])

  useEffect(() => { void load() }, [load, reloadKey])
  useEffect(() => {
    const interval = setInterval(() => void load(true), 5 * 60_000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return
    for (const reminder of reminders) {
      const key = `finance-reminder:${reminder.id || `${reminder.accountId}:${reminder.merchantKey}`}:${reminder.nextExpectedDate}`
      if (sessionStorage.getItem(key)) continue
      new Notification(reminder.dueState === 'OVERDUE' ? 'Subscription may be overdue' : 'Subscription coming up', {
        body: `${reminder.displayName} · ${money(reminder.expectedAmount, reminder.currency)} · ${dateLabel(reminder.nextExpectedDate)}`,
        icon: '/logo.png',
      })
      sessionStorage.setItem(key, '1')
    }
  }, [reminders])

  const requestNotifications = async () => {
    if (!('Notification' in window)) return onError('This browser does not support notifications')
    const permission = await Notification.requestPermission()
    if (permission === 'granted') onNotice('Browser subscription reminders are enabled while HouseFlow is open.')
    else onError('Browser notification permission was not granted.')
  }

  const saveCandidate = async (subscription: Subscription, status: Subscription['status']) => {
    setAction(`${status}:${subscription.accountId}:${subscription.merchantKey}`)
    try {
      const response = await fetch('/api/finance/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...subscription, status }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update subscription')
      await load(true)
      onNotice(status === 'CONFIRMED' ? `${subscription.displayName} is now being tracked.` : `${subscription.displayName} was dismissed.`)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to update subscription')
    } finally { setAction('') }
  }

  const updateStored = async (subscription: Subscription, changes: Record<string, unknown>) => {
    if (!subscription.id) return saveCandidate({ ...subscription, ...changes } as Subscription, (changes.status as Subscription['status']) || subscription.status)
    setAction(`edit:${subscription.id}`)
    try {
      const response = await fetch(`/api/finance/subscriptions/${encodeURIComponent(subscription.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ householdId, ...changes }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update subscription')
      setEditing(null)
      await load(true)
      onNotice('Subscription updated.')
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to update subscription') }
    finally { setAction('') }
  }

  const addManual = async () => {
    setAction('add')
    try {
      const response = await fetch('/api/finance/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...form, manual: true, status: 'CONFIRMED', currency: accounts.find(item => item.id === form.accountId)?.currency || 'EUR' }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to add subscription')
      setShowAdd(false)
      setForm({ accountId: accountId || accounts[0]?.id || '', displayName: '', cadence: 'MONTHLY', expectedAmount: '', nextExpectedDate: '', reminderDays: '3' })
      setFilter('CONFIRMED')
      await load(true)
      onNotice('Subscription added.')
    } catch (error) { onError(error instanceof Error ? error.message : 'Unable to add subscription') }
    finally { setAction('') }
  }

  const visible = useMemo(() => subscriptions.filter(subscription => subscription.status === filter), [filter, subscriptions])
  const counts = useMemo(() => ({
    CANDIDATE: subscriptions.filter(item => item.status === 'CANDIDATE').length,
    CONFIRMED: subscriptions.filter(item => item.status === 'CONFIRMED').length,
    DISMISSED: subscriptions.filter(item => item.status === 'DISMISSED').length,
  }), [subscriptions])

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-2 text-sm font-medium text-cozy-primary"><CalendarClock className="h-4 w-4" /> Recurring payments</div><h2 className="mt-1 text-2xl font-bold">Subscriptions manager</h2><p className="mt-1 text-sm text-cozy-text-muted">Detected locally from timing and amount patterns. You stay in control of every result.</p></div>
        {canManage && <div className="flex gap-2"><Button variant="outline" onClick={requestNotifications}><Bell className="mr-2 h-4 w-4" />Enable reminders</Button><Button onClick={() => setShowAdd(value => !value)}><Plus className="mr-2 h-4 w-4" />Add subscription</Button></div>}
      </div>

      {reminders.length > 0 && <Card className="border-amber-200 bg-amber-50/60 hover:-translate-y-0"><CardContent className="p-4"><div className="flex gap-3"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold text-amber-900">{reminders.length} payment{reminders.length === 1 ? '' : 's'} need attention</p><p className="text-sm text-amber-800">{reminders.map(item => item.displayName).join(', ')}</p></div></div></CardContent></Card>}

      {showAdd && <Card className="hover:-translate-y-0"><CardHeader><CardTitle className="text-lg">Add a subscription</CardTitle><CardDescription>Useful when there is not enough history for automatic detection.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><select className="h-10 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm" value={form.accountId} onChange={event => setForm({ ...form, accountId: event.target.value })}>{accounts.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select><Input placeholder="Subscription name" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} /><select className="h-10 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm" value={form.cadence} onChange={event => setForm({ ...form, cadence: event.target.value })}>{Object.entries(cadenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Input type="number" min="0" step="0.01" placeholder="Expected amount" value={form.expectedAmount} onChange={event => setForm({ ...form, expectedAmount: event.target.value })} /><Input type="date" value={form.nextExpectedDate} onChange={event => setForm({ ...form, nextExpectedDate: event.target.value })} /><Button disabled={!form.accountId || !form.displayName || action === 'add'} onClick={addManual}>{action === 'add' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></CardContent></Card>}

      <div className="flex flex-wrap gap-2">{(['CANDIDATE', 'CONFIRMED', 'DISMISSED'] as const).map(status => <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-lg border px-4 py-2 text-sm font-medium ${filter === status ? 'border-cozy-primary bg-cozy-primary text-white' : 'border-cozy-gray-200 bg-white text-cozy-text-muted'}`}>{status === 'CANDIDATE' ? 'Suggestions' : status === 'CONFIRMED' ? 'Tracked' : 'Dismissed'} <span className="ml-1 opacity-75">{counts[status]}</span></button>)}</div>

      {loading ? <Card><CardContent className="flex min-h-52 items-center justify-center text-sm text-cozy-text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Finding recurring patterns…</CardContent></Card> : visible.length === 0 ? <Card><CardContent className="py-14 text-center"><Sparkles className="mx-auto mb-3 h-8 w-8 text-cozy-text-muted" /><p className="font-medium">Nothing in this view</p><p className="mt-1 text-sm text-cozy-text-muted">New recurring patterns will appear automatically as transactions build up.</p></CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{visible.map(subscription => <Card key={`${subscription.accountId}:${subscription.merchantKey}`} className={`hover:-translate-y-0 ${subscription.dueState === 'OVERDUE' ? 'border-red-200' : subscription.priceChanged ? 'border-amber-200' : ''}`}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{subscription.displayName}</h3><Badge variant="outline">{cadenceLabels[subscription.cadence]}</Badge>{subscription.manual ? <Badge variant="outline">Manual</Badge> : subscription.detectionSource === 'KNOWN_SERVICE' ? <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">Known service</Badge> : <Badge variant="outline">Recurring pattern</Badge>}</div><p className="mt-1 text-xs text-cozy-text-muted">{subscription.account?.displayName} · {subscription.occurrenceCount || 'Manual'} occurrence{subscription.occurrenceCount === 1 ? '' : 's'}</p>{subscription.detectionReason && <p className="mt-2 text-xs text-cozy-text-muted">{subscription.detectionReason}</p>}</div><p className="whitespace-nowrap text-lg font-bold">{money(subscription.expectedAmount, subscription.currency)}</p></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-cozy-warm/50 p-3 text-sm"><div><p className="text-xs text-cozy-text-muted">Next expected</p><p className="mt-1 font-medium">{dateLabel(subscription.nextExpectedDate)}</p></div><div><p className="text-xs text-cozy-text-muted">Confidence</p><p className="mt-1 font-medium">{subscription.manual ? 'Manual' : `${Math.round(subscription.confidence * 100)}%`}</p></div></div>{subscription.priceChanged && <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />Latest payment {money(subscription.latestAmount, subscription.currency)} is above the previous typical {money(subscription.previousTypicalAmount, subscription.currency)}.</div>}{subscription.dueState && subscription.dueState !== 'UPCOMING' && <div className={`mt-3 rounded-lg p-3 text-sm ${subscription.dueState === 'OVERDUE' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>{subscription.dueState === 'OVERDUE' ? 'Expected date has passed — check whether it was charged under another name.' : `Expected within ${subscription.reminderDays} days.`}</div>}
        {editing?.merchantKey === subscription.merchantKey ? <div className="mt-4 grid gap-2 sm:grid-cols-2"><Input value={editing.displayName} onChange={event => setEditing({ ...editing, displayName: event.target.value })} /><Input type="number" min="0" step="0.01" value={String(editing.expectedAmount || '')} onChange={event => setEditing({ ...editing, expectedAmount: event.target.value })} /><Input type="date" value={editing.nextExpectedDate || ''} onChange={event => setEditing({ ...editing, nextExpectedDate: event.target.value })} /><Input type="number" min="0" max="30" value={editing.reminderDays} onChange={event => setEditing({ ...editing, reminderDays: Number(event.target.value) })} /><div className="flex gap-2 sm:col-span-2"><Button size="sm" onClick={() => updateStored(subscription, { displayName: editing.displayName, expectedAmount: editing.expectedAmount, nextExpectedDate: editing.nextExpectedDate, reminderDays: editing.reminderDays })}>Save changes</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div></div> : canManage && <div className="mt-4 flex flex-wrap gap-2">{subscription.status === 'CANDIDATE' && <><Button size="sm" onClick={() => saveCandidate(subscription, 'CONFIRMED')} disabled={Boolean(action)}><Check className="mr-1 h-3 w-3" />Track</Button><Button size="sm" variant="outline" onClick={() => saveCandidate(subscription, 'DISMISSED')} disabled={Boolean(action)}><X className="mr-1 h-3 w-3" />Not a subscription</Button></>}{subscription.status === 'CONFIRMED' && <><Button size="sm" variant="outline" onClick={() => setEditing({ ...subscription })}>Edit</Button><Button size="sm" variant="ghost" onClick={() => updateStored(subscription, { status: 'DISMISSED' })}>Dismiss</Button></>}{subscription.status === 'DISMISSED' && <Button size="sm" variant="outline" onClick={() => subscription.id ? updateStored(subscription, { status: 'CANDIDATE' }) : saveCandidate(subscription, 'CANDIDATE')}><RotateCcw className="mr-1 h-3 w-3" />Restore</Button>}</div>}</CardContent></Card>)}</div>}

      <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => load()} disabled={loading}><RefreshCw className="mr-2 h-3 w-3" />Recheck patterns</Button></div>
    </section>
  )
}
