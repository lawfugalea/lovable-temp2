import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Activity, AlertTriangle, Baby, Bell, BellOff, CheckCircle2, ChevronRight, Clock3,
  FileText, HeartPulse, Pencil, Pill, Plus, Scale, Thermometer, Trash2, Lock } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import ModuleFirstRun from '@/components/onboarding/ModuleFirstRun'
import { useHouseholdId } from '@/lib/useHouseholdId'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { getMedicineSchedule, needsEpisodeDecision, formatTimeUntil } from '@/lib/medicine'
import { apiRequest } from '@/components/medicine/hooks'
import { ChildDialog, ReportDialog } from '@/components/medicine/dialogs'
import GiveDoseDialog from '@/components/medicine/GiveDoseDialog'
import {
  EpisodeDecisionDialog, RegimenDialog, TemperatureDialog, WeightDialog,
} from '@/components/medicine/JournalDialogs'
import type {
  Child, FeverReading, HealthEpisode, Medicine, MedicineDose, WeightMeasurement,
} from '@/components/medicine/types'
import { getChildAge } from '@/components/medicine/types'

type JournalEvent =
  | { type: 'dose'; at: string; data: MedicineDose & { medicine: Medicine; episode: HealthEpisode }; recordedBy?: string | null }
  | { type: 'temperature'; at: string; data: FeverReading & { episode: HealthEpisode }; recordedBy?: string | null }

type JournalPayload = {
  children: Child[]
  episodes: Array<HealthEpisode & { _count?: { doses: number; feverReadings: number } }>
  medicines: Medicine[]
  doses: MedicineDose[]
  temperatures: FeverReading[]
  weights: WeightMeasurement[]
  events: JournalEvent[]
}

const emptyJournal: JournalPayload = { children: [], episodes: [], medicines: [], doses: [], temperatures: [], weights: [], events: [] }

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
}

function temperatureLabel(reading: FeverReading): string {
  return `${reading.temperature.toFixed(1)}°${reading.unit}`
}

export default function MedicinePage() {
  const { status } = useSession()
  const router = useRouter()
  const { householdId, loading: householdLoading } = useHouseholdId()
  const confirm = useConfirm()
  const [journal, setJournal] = useState<JournalPayload>(emptyJournal)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('')
  const [pendingAction, setPendingAction] = useState<'dose' | 'temperature' | 'regimen' | null>(null)
  const [showEpisodeDecision, setShowEpisodeDecision] = useState(false)
  const [showChild, setShowChild] = useState(false)
  const [showDose, setShowDose] = useState(false)
  const [showTemperature, setShowTemperature] = useState(false)
  const [showWeight, setShowWeight] = useState(false)
  const [showRegimen, setShowRegimen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [editingDose, setEditingDose] = useState<MedicineDose | null>(null)
  const [editingTemperature, setEditingTemperature] = useState<FeverReading | null>(null)
  const [pushState, setPushState] = useState<{ configured: boolean; publicKey: string | null; activeDevices: number; entitled?: boolean } | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const loadJournal = useCallback(async () => {
    if (!householdId) return
    try {
      const response = await apiRequest(`/api/medicine/journal?householdId=${encodeURIComponent(householdId)}`)
      const data = await response.json() as JournalPayload
      setJournal(data)
      setSelectedChildId((current) => {
        const requested = typeof router.query.childId === 'string' ? router.query.childId : ''
        if (requested && data.children.some((child) => child.id === requested)) return requested
        if (current && data.children.some((child) => child.id === current)) return current
        return data.children[0]?.id || ''
      })
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load the health journal')
    } finally {
      setLoading(false)
    }
  }, [householdId, router.query.childId])

  const loadPushState = useCallback(async () => {
    if (!householdId) return
    try {
      const response = await apiRequest(`/api/medicine/push-subscriptions?householdId=${encodeURIComponent(householdId)}`)
      setPushState(await response.json())
    } catch {
      setPushState(null)
    }
  }, [householdId])

  useEffect(() => { if (householdId) void Promise.all([loadJournal(), loadPushState()]) }, [householdId, loadJournal, loadPushState])
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer) }, [])

  const selectedChild = journal.children.find((child) => child.id === selectedChildId) || null
  const childEpisodes = useMemo(() => journal.episodes.filter((episode) => episode.childId === selectedChildId), [journal.episodes, selectedChildId])
  useEffect(() => {
    setSelectedEpisodeId((current) => current && childEpisodes.some((episode) => episode.id === current) ? current : childEpisodes[0]?.id || '')
  }, [childEpisodes])
  const selectedEpisode = childEpisodes.find((episode) => episode.id === selectedEpisodeId) || childEpisodes[0] || null
  const childEvents = useMemo(() => journal.events.filter((event) => event.data.childId === selectedChildId), [journal.events, selectedChildId])
  const episodeEvents = useMemo(() => selectedEpisode ? childEvents.filter((event) => event.data.episodeId === selectedEpisode.id) : [], [childEvents, selectedEpisode])
  const latestEpisode = childEpisodes[0] || null
  const childMedicines = useMemo(() => journal.medicines.filter((medicine) => medicine.childId === selectedChildId && medicine.isActive), [journal.medicines, selectedChildId])
  const childDoses = useMemo(() => journal.doses.filter((dose) => dose.childId === selectedChildId), [journal.doses, selectedChildId])
  const childWeights = useMemo(() => journal.weights.filter((weight) => weight.childId === selectedChildId), [journal.weights, selectedChildId])

  const schedules = useMemo(() => new Map(childMedicines.map((medicine) => [medicine.id, getMedicineSchedule(medicine, childDoses, now)])), [childMedicines, childDoses, now])
  const dueMedicines = childMedicines.filter((medicine) => medicine.scheduleVerifiedAt && schedules.get(medicine.id)?.isDue)

  const openAction = (action: 'dose' | 'temperature' | 'regimen') => {
    if (action === 'dose') setShowDose(true)
    if (action === 'temperature') setShowTemperature(true)
    if (action === 'regimen') setShowRegimen(true)
  }
  const beginAction = (action: 'dose' | 'temperature' | 'regimen', medicine?: Medicine | null) => {
    if (!selectedChild) return toast.error('Add or select a child first')
    setEditingMedicine(medicine || null)
    const lastActivity = childEvents[0]?.at || latestEpisode?.startedAt || null
    if (!latestEpisode || needsEpisodeDecision(lastActivity)) {
      setPendingAction(action)
      setShowEpisodeDecision(true)
      return
    }
    setSelectedEpisodeId(latestEpisode.id)
    openAction(action)
  }
  const episodeResolved = async (episode: HealthEpisode) => {
    setSelectedEpisodeId(episode.id)
    await loadJournal()
    const action = pendingAction
    setPendingAction(null)
    if (action) openAction(action)
  }

  const stopMedicine = async (medicine: Medicine) => {
    if (!householdId || !(await confirm({ title: 'Archive medicine', description: `Archive ${medicine.name}? Existing journal entries will remain.`, confirmText: 'Archive' }))) return
    try {
      await apiRequest(`/api/medicine/medicines?householdId=${encodeURIComponent(householdId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId: medicine.id, action: 'stop' }),
      })
      toast.success('Medicine archived')
      await loadJournal()
    } catch (actionError) { toast.error(actionError instanceof Error ? actionError.message : 'Failed to archive medicine') }
  }

  const deleteDose = async (dose: MedicineDose) => {
    if (!householdId || !(await confirm({ title: 'Delete dose', description: 'Delete this dose record? Due times will be recalculated.', confirmText: 'Delete', destructive: true }))) return
    try {
      await apiRequest(`/api/medicine/doses/${dose.id}?householdId=${encodeURIComponent(householdId)}`, { method: 'DELETE' })
      toast.success('Dose deleted')
      await loadJournal()
    } catch (actionError) { toast.error(actionError instanceof Error ? actionError.message : 'Failed to delete dose') }
  }

  const deleteTemperature = async (reading: FeverReading) => {
    if (!householdId || !(await confirm({ title: 'Delete reading', description: 'Delete this temperature reading?', confirmText: 'Delete', destructive: true }))) return
    try {
      await apiRequest(`/api/medicine/fever-readings?id=${reading.id}&householdId=${encodeURIComponent(householdId)}`, { method: 'DELETE' })
      toast.success('Temperature deleted')
      await loadJournal()
    } catch (actionError) { toast.error(actionError instanceof Error ? actionError.message : 'Failed to delete temperature') }
  }

  const enablePush = async () => {
    if (!householdId || !pushState?.publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Notification permission was not granted')
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushState.publicKey) as BufferSource,
      })
      await apiRequest('/api/medicine/push-subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, subscription: subscription.toJSON() }),
      })
      toast.success('Medicine reminders enabled on this device')
      await loadPushState()
    } catch (pushError) { toast.error(pushError instanceof Error ? pushError.message : 'Failed to enable reminders') } finally { setPushBusy(false) }
  }

  const disablePush = async () => {
    if (!householdId || !('serviceWorker' in navigator)) return
    setPushBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await apiRequest('/api/medicine/push-subscriptions', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ householdId, endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      toast.success('Reminders disabled on this device')
      await loadPushState()
    } catch (pushError) { toast.error(pushError instanceof Error ? pushError.message : 'Failed to disable reminders') } finally { setPushBusy(false) }
  }

  if (status === 'unauthenticated') return <div>Please sign in to access the health journal.</div>
  if (status === 'loading' || householdLoading || loading) {
    return <ModernAppShell title="Health journal"><div className="grid min-h-[420px] place-items-center text-muted-foreground">Loading health journal…</div></ModernAppShell>
  }

  return (
    <ModernAppShell title="Health journal">
      <div className="space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-soft-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><HeartPulse className="h-4 w-4" /> Child health journal</div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Doses, temperatures and context—in one timeline.</h1>
              <p className="mt-3 text-muted-foreground">Record what was actually given first. A schedule is optional and can be added from the exact packaging, leaflet, or clinician instruction when you want timing checks and reminders.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pushState?.configured && pushState.entitled === false && <Button variant="outline" onClick={() => void router.push('/settings?tab=billing')} title="Push reminders are part of the Family plan"><Lock className="h-4 w-4" /> Reminders — Family plan</Button>}
              {pushState?.configured && pushState.entitled !== false && pushState.activeDevices === 0 && <Button variant="outline" disabled={pushBusy} onClick={() => void enablePush()}><Bell className="h-4 w-4" /> Enable reminders</Button>}
              {pushState?.configured && pushState.activeDevices > 0 && <Button variant="outline" disabled={pushBusy} onClick={() => void disablePush()}><BellOff className="h-4 w-4" /> Disable this device</Button>}
              <Button variant="outline" onClick={() => setShowReport(true)}><FileText className="h-4 w-4" /> PDF report</Button>
            </div>
          </div>
        </section>

        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Journal unavailable</AlertTitle><AlertDescription className="flex items-center justify-between gap-4"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void loadJournal()}>Retry</Button></AlertDescription></Alert>}
        {!pushState?.configured && <Alert><Bell className="h-4 w-4" /><AlertTitle>Background reminders are not configured</AlertTitle><AlertDescription>Add VAPID keys and the reminder worker to enable private due-time push notifications. The in-app schedule remains available.</AlertDescription></Alert>}

        <section>
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Children</h2><p className="text-sm text-muted-foreground">Choose whose journal you are updating.</p></div><Button size="sm" variant="outline" onClick={() => setShowChild(true)}><Plus className="h-4 w-4" /> Add child</Button></div>
          {journal.children.length ? <div className="flex gap-2 overflow-x-auto pb-2">{journal.children.map((child) => <button key={child.id} onClick={() => setSelectedChildId(child.id)} className={`min-w-fit rounded-xl border px-4 py-3 text-left transition-colors ${child.id === selectedChildId ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}><span className="block font-semibold">{child.name}</span><span className={`text-xs ${child.id === selectedChildId ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{getChildAge(child.dateOfBirth)}</span></button>)}</div> : <Card><CardContent className="py-12 text-center"><Baby className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-medium">Add a child to begin</p><Button className="mt-4" onClick={() => setShowChild(true)}>Add child</Button></CardContent></Card>}
        </section>

        {selectedChild && <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.6fr)]">
            <Card>
              <CardHeader className="pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>{selectedEpisode?.title || 'No illness episode yet'}</CardTitle><CardDescription>{selectedEpisode ? `${format(new Date(selectedEpisode.startedAt), 'dd MMM yyyy, HH:mm')}${selectedEpisode.endedAt ? ` – ${format(new Date(selectedEpisode.endedAt), 'dd MMM, HH:mm')}` : ' · ongoing'}` : 'The first journal entry will ask whether to start an episode.'}</CardDescription></div>{childEpisodes.length > 0 && <select aria-label="Select illness episode" className="h-9 rounded-md border bg-background px-3 text-sm" value={selectedEpisode?.id || ''} onChange={(event) => setSelectedEpisodeId(event.target.value)}>{childEpisodes.map((episode) => <option key={episode.id} value={episode.id}>{format(new Date(episode.startedAt), 'dd MMM yyyy')}{episode.isInferred ? ' · imported' : ''}</option>)}</select>}</div></CardHeader>
              <CardContent><div className="grid gap-3 sm:grid-cols-3"><Button className="h-20 flex-col" onClick={() => beginAction('dose')}><Pill className="h-5 w-5" /> Record dose</Button><Button className="h-20 flex-col" variant="outline" onClick={() => beginAction('temperature')}><Thermometer className="h-5 w-5" /> Record temperature</Button><Button className="h-20 flex-col" variant="outline" onClick={() => setShowWeight(true)}><Scale className="h-5 w-5" /> Record weight</Button></div></CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">At a glance</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Saved medicines</span><strong>{childMedicines.length}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Due now</span><strong className={dueMedicines.length ? 'text-amber-700' : ''}>{dueMedicines.length}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Latest weight</span><strong>{childWeights[0] ? `${childWeights[0].weightKg.toFixed(1)} kg` : 'Not recorded'}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Episode entries</span><strong>{episodeEvents.length}</strong></div></CardContent></Card>
          </section>

          {dueMedicines.length > 0 && <Alert variant="warning"><Clock3 className="h-4 w-4" /><AlertTitle>{dueMedicines.length} scheduled medicine {dueMedicines.length === 1 ? 'is' : 'are'} due</AlertTitle><AlertDescription>Review the saved schedule before recording an administration. No repeat push is sent while overdue.</AlertDescription></Alert>}

          <section>
            <div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Saved medicines</h2><p className="text-sm text-muted-foreground">A schedule is optional. Add one when you want label-based timing checks and reminders.</p></div><Button size="sm" variant="outline" onClick={() => beginAction('regimen')}><Plus className="h-4 w-4" /> Add schedule</Button></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {childMedicines.map((medicine) => {
                const schedule = schedules.get(medicine.id)!
                return <Card key={medicine.id} className={!medicine.scheduleVerifiedAt ? 'border-amber-300' : schedule.isDue ? 'border-orange-300' : ''}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{medicine.name}</CardTitle><CardDescription>{medicine.activeIngredient || 'Schedule not set'}{medicine.concentration ? ` · ${medicine.concentration}` : ''}</CardDescription></div>{medicine.scheduleVerifiedAt ? <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3" /> Schedule on</Badge> : <Badge variant="outline">Journal only</Badge>}</div></CardHeader><CardContent className="space-y-4"><div><p className="font-medium">{medicine.dosage}</p>{medicine.scheduleVerifiedAt && <p className="text-sm text-muted-foreground">{medicine.isPrn ? `As needed · minimum ${medicine.minGapHours || '—'}h gap` : medicine.frequency}</p>}</div>{medicine.scheduleVerifiedAt ? <div className="rounded-lg bg-muted/60 p-3 text-sm">{medicine.isPrn ? (schedule.canGiveNow ? 'Eligible now if needed' : schedule.dailyLimitReached ? '24-hour limit reached' : schedule.canGiveAt ? `Eligible after ${format(schedule.canGiveAt, 'HH:mm')}` : 'Eligible if needed') : schedule.isDue ? <span className="font-semibold text-amber-800">Due now</span> : schedule.nextDoseTime ? `Next due in ${formatTimeUntil(schedule.msUntilNext || 0)} · ${format(schedule.nextDoseTime, 'HH:mm')}` : 'No scheduled dose'}</div> : <p className="text-sm text-amber-800">Doses can be recorded. Add the product schedule to turn on timing checks and reminders.</p>}<div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { setEditingDose(null); beginAction('dose', medicine) }}>Record dose</Button><Button size="sm" variant="outline" onClick={() => beginAction('regimen', medicine)}><Pencil className="h-3.5 w-3.5" /> {medicine.scheduleVerifiedAt ? 'Edit schedule' : 'Set up schedule'}</Button><Button size="sm" variant="ghost" onClick={() => void stopMedicine(medicine)}>Archive</Button></div></CardContent></Card>
              })}
              {!childMedicines.length && (
                <ModuleFirstRun
                  className="md:col-span-2 xl:col-span-3"
                  module="medicine"
                  title="No saved medicines yet"
                  description="Record a dose and enter the medicine name — it is saved automatically for next time, and everyone in the household sees the same record."
                  action={<Button size="sm" onClick={() => beginAction('dose')}>Record first dose</Button>}
                />
              )}
            </div>
          </section>

          <section>
            <div className="mb-3"><h2 className="text-xl font-semibold">Episode timeline</h2><p className="text-sm text-muted-foreground">A shared chronological record showing who added each entry.</p></div>
            <Card><CardContent className="p-0"><div className="divide-y">{episodeEvents.map((event) => event.type === 'dose' ? <div key={`dose-${event.data.id}`} className="flex gap-3 p-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Pill className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{event.data.medicine.name} · {event.data.dosage}</p><p className="text-sm text-muted-foreground">{format(new Date(event.at), 'dd MMM yyyy, HH:mm')}{event.recordedBy ? ` · recorded by ${event.recordedBy}` : ''}</p></div><div className="flex"><Button size="icon" variant="ghost" aria-label="Edit dose" onClick={() => { setEditingDose(event.data); setEditingMedicine(null); setShowDose(true) }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete dose" onClick={() => void deleteDose(event.data)}><Trash2 className="h-4 w-4" /></Button></div></div>{event.data.notes && <p className="mt-2 text-sm">{event.data.notes}</p>}{event.data.safetyWarnings && <p className="mt-2 text-sm font-medium text-amber-800"><AlertTriangle className="mr-1 inline h-4 w-4" />Safety warning was acknowledged when this dose was recorded.</p>}</div></div> : <div key={`temp-${event.data.id}`} className="flex gap-3 p-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><Thermometer className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">Temperature · {temperatureLabel(event.data)}</p><p className="text-sm text-muted-foreground">{format(new Date(event.at), 'dd MMM yyyy, HH:mm')} · {event.data.method}{event.recordedBy ? ` · recorded by ${event.recordedBy}` : ''}</p></div><div className="flex"><Button size="icon" variant="ghost" aria-label="Edit temperature" onClick={() => { setEditingTemperature(event.data); setSelectedEpisodeId(event.data.episodeId); setShowTemperature(true) }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete temperature" onClick={() => void deleteTemperature(event.data)}><Trash2 className="h-4 w-4" /></Button></div></div>{event.data.notes && <p className="mt-2 text-sm">{event.data.notes}</p>}</div></div>)}{!episodeEvents.length && (
              // Transient: the episode exists and is simply empty so far.
              <EmptyState
                className="border-0 bg-transparent"
                module="medicine"
                icon={Activity}
                title="No entries in this episode"
                description="Record a dose or temperature to begin the timeline."
              />
            )}</div></CardContent></Card>
          </section>

          {childWeights.length > 0 && <section><h2 className="mb-3 text-xl font-semibold">Weight history</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{childWeights.slice(0, 6).map((weight) => <Card key={weight.id}><CardContent className="flex items-center justify-between p-4"><div><p className="text-lg font-semibold">{weight.weightKg.toFixed(1)} kg</p><p className="text-xs text-muted-foreground">{format(new Date(weight.measuredAt), 'dd MMM yyyy')}</p></div><Scale className="h-5 w-5 text-muted-foreground" /></CardContent></Card>)}</div></section>}
        </>}
      </div>

      {householdId && <>
        <ChildDialog open={showChild} onOpenChange={setShowChild} householdId={householdId} onSaved={loadJournal} />
        <EpisodeDecisionDialog open={showEpisodeDecision} onOpenChange={setShowEpisodeDecision} householdId={householdId} child={selectedChild} previousEpisode={latestEpisode} onResolved={(episode) => void episodeResolved(episode)} />
        <GiveDoseDialog open={showDose} onOpenChange={(open) => { setShowDose(open); if (!open) { setEditingDose(null); setEditingMedicine(null) } }} householdId={householdId} childrenList={journal.children} medicines={journal.medicines} doses={journal.doses} episodeId={selectedEpisode?.id} initialChildId={selectedChild?.id} initialMedicine={editingMedicine} dose={editingDose} onSaved={loadJournal} />
        <TemperatureDialog open={showTemperature} onOpenChange={(open) => { setShowTemperature(open); if (!open) setEditingTemperature(null) }} householdId={householdId} child={selectedChild} episode={selectedEpisode} reading={editingTemperature} onSaved={loadJournal} />
        <WeightDialog open={showWeight} onOpenChange={setShowWeight} householdId={householdId} child={selectedChild} onSaved={loadJournal} />
        <RegimenDialog open={showRegimen} onOpenChange={(open) => { setShowRegimen(open); if (!open) setEditingMedicine(null) }} householdId={householdId} child={selectedChild} episode={selectedEpisode} medicine={editingMedicine} onSaved={loadJournal} />
        <ReportDialog open={showReport} onOpenChange={setShowReport} householdId={householdId} />
      </>}
    </ModernAppShell>
  )
}
