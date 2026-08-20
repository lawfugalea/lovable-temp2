import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { apiRequest } from './hooks'
import type { Child, FeverReading, HealthEpisode, Medicine } from './types'
import { toLocalDateTimeInput } from './types'

const selectClass = 'w-full h-10 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type BaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  onSaved: () => void
}

export function EpisodeDecisionDialog({
  open, onOpenChange, householdId, child, previousEpisode, onResolved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  child: Child | null
  previousEpisode: HealthEpisode | null
  onResolved: (episode: HealthEpisode) => void
}) {
  const [saving, setSaving] = useState(false)
  const resolve = async (mode: 'new' | 'continue') => {
    if (!child) return
    setSaving(true)
    try {
      const response = mode === 'continue' && previousEpisode
        ? await apiRequest(`/api/medicine/episodes?householdId=${encodeURIComponent(householdId)}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId: previousEpisode.id, action: 'continue' }),
          })
        : await apiRequest('/api/medicine/episodes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ householdId, childId: child.id, title: 'Illness episode', startedAt: new Date().toISOString() }),
          })
      const episode = await response.json()
      onOpenChange(false)
      onResolved(episode)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to choose episode')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Is this a new sick episode?</DialogTitle>
          <DialogDescription>
            {previousEpisode
              ? `It has been more than 72 hours since ${child?.name || 'this child'} had a journal entry.`
              : `Start ${child?.name || 'this child'}’s first illness episode before recording health events.`}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Episode grouping keeps doses, temperatures, and notes together. It does not diagnose an illness.
        </div>
        <DialogFooter>
          {previousEpisode && <Button variant="outline" disabled={saving} onClick={() => void resolve('continue')}>Continue previous</Button>}
          <Button disabled={saving} onClick={() => void resolve('new')}>{saving ? 'Saving…' : 'Start new episode'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TemperatureDialog({ open, onOpenChange, householdId, child, episode, reading, onSaved }: BaseProps & {
  child: Child | null
  episode: HealthEpisode | null
  reading?: FeverReading | null
}) {
  const [form, setForm] = useState({ temperature: '', unit: 'C', method: 'ear', takenAt: '', notes: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setForm(reading ? {
      temperature: String(reading.temperature), unit: reading.unit, method: reading.method,
      takenAt: toLocalDateTimeInput(new Date(reading.takenAt)), notes: reading.notes || '',
    } : { temperature: '', unit: 'C', method: 'ear', takenAt: toLocalDateTimeInput(), notes: '' })
  }, [open, reading])
  const submit = async () => {
    if (!child || !episode || !form.temperature || !form.takenAt) return toast.error('Temperature, child, episode, and time are required')
    setSaving(true)
    try {
      await apiRequest('/api/medicine/fever-readings', {
        method: reading ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId, id: reading?.id, childId: child.id, episodeId: episode.id,
          temperature: Number(form.temperature), unit: form.unit, method: form.method,
          takenAt: new Date(form.takenAt).toISOString(), notes: form.notes,
        }),
      })
      toast.success(reading ? 'Temperature updated' : 'Temperature recorded')
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save temperature')
    } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{reading ? 'Edit temperature' : 'Record temperature'}</DialogTitle><DialogDescription>Add an observed reading to this episode.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1.5"><Label htmlFor="journal-temperature">Temperature *</Label><Input id="journal-temperature" type="number" step="0.1" min={form.unit === 'C' ? 30 : 86} max={form.unit === 'C' ? 45 : 113} value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="journal-unit">Unit</Label><select id="journal-unit" className={selectClass} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}><option value="C">°C</option><option value="F">°F</option></select></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="journal-method">Method</Label><select id="journal-method" className={selectClass} value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>{['oral', 'rectal', 'axillary', 'ear', 'forehead'].map((method) => <option key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="journal-temp-time">Taken at</Label><Input id="journal-temp-time" type="datetime-local" value={form.takenAt} onChange={(event) => setForm({ ...form, takenAt: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="journal-temp-notes">Notes</Label><Textarea id="journal-temp-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Symptoms, comfort, fluids…" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Save reading'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function WeightDialog({ open, onOpenChange, householdId, child, onSaved }: BaseProps & { child: Child | null }) {
  const [form, setForm] = useState({ weightKg: '', measuredAt: '', notes: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setForm({ weightKg: '', measuredAt: toLocalDateTimeInput(), notes: '' }) }, [open])
  const submit = async () => {
    if (!child || !form.weightKg) return toast.error('Enter a weight')
    setSaving(true)
    try {
      await apiRequest('/api/medicine/weights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, childId: child.id, weightKg: Number(form.weightKg), measuredAt: new Date(form.measuredAt).toISOString(), notes: form.notes }),
      })
      toast.success('Weight recorded')
      onOpenChange(false)
      onSaved()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to save weight') } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
      <DialogHeader><DialogTitle>Record weight</DialogTitle><DialogDescription>Weight history stays inside Clankeep and is not used to prescribe a dose.</DialogDescription></DialogHeader>
      <div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="weight-kg">Weight (kg)</Label><Input id="weight-kg" type="number" min="0.5" max="250" step="0.1" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="weight-time">Measured at</Label><Input id="weight-time" type="datetime-local" value={form.measuredAt} onChange={(event) => setForm({ ...form, measuredAt: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="weight-notes">Notes</Label><Input id="weight-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div></div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Save weight'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

export function RegimenDialog({ open, onOpenChange, householdId, child, episode, medicine, onSaved }: BaseProps & {
  child: Child | null
  episode: HealthEpisode | null
  medicine?: Medicine | null
}) {
  const [form, setForm] = useState({
    name: '', activeIngredient: '', formulation: 'oral liquid', concentration: '', doseAmount: '', doseUnit: 'mL',
    intervalHours: '', maxDosesPer24h: '', isPrn: true, scheduleSource: 'PACKAGING', scheduleSourceNotes: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setForm({
      name: medicine?.name || '', activeIngredient: medicine?.activeIngredient || '', formulation: medicine?.formulation || 'oral liquid',
      concentration: medicine?.concentration || '', doseAmount: medicine?.doseAmount != null ? String(medicine.doseAmount) : '',
      doseUnit: medicine?.doseUnit || 'mL', intervalHours: medicine?.minGapHours != null ? String(medicine.minGapHours) : '',
      maxDosesPer24h: medicine?.maxDosesPer24h != null ? String(medicine.maxDosesPer24h) : '', isPrn: medicine?.isPrn ?? true,
      scheduleSource: medicine?.scheduleSource || 'PACKAGING', scheduleSourceNotes: medicine?.scheduleSourceNotes || '', notes: medicine?.notes || '',
    })
  }, [open, medicine])
  const submit = async () => {
    if (!child || !episode || !form.name.trim() || !form.activeIngredient.trim() || !form.formulation.trim() || !form.doseAmount || !form.doseUnit.trim() || !form.intervalHours || !form.maxDosesPer24h) {
      return toast.error('Complete the product and schedule details from the label, leaflet, or clinician instruction')
    }
    setSaving(true)
    const payload = {
      name: form.name, activeIngredient: form.activeIngredient, formulation: form.formulation, concentration: form.concentration,
      doseAmount: Number(form.doseAmount), doseUnit: form.doseUnit, dosage: `${form.doseAmount} ${form.doseUnit}`,
      frequency: form.isPrn ? 'as needed' : `every ${form.intervalHours} hours`, minGapHours: Number(form.intervalHours),
      maxDosesPer24h: Number(form.maxDosesPer24h), isPrn: form.isPrn, scheduleSource: form.scheduleSource,
      scheduleSourceNotes: form.scheduleSourceNotes, notes: form.notes, episodeId: episode.id, childId: child.id,
      isTemplate: false, startDate: medicine?.startDate || new Date().toISOString(), isActive: true,
    }
    try {
      await apiRequest(medicine ? `/api/medicine/medicines/${medicine.id}?householdId=${encodeURIComponent(householdId)}` : `/api/medicine/medicines?householdId=${encodeURIComponent(householdId)}`, {
        method: medicine ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      toast.success(medicine ? 'Medicine schedule updated' : 'Medicine schedule added')
      onOpenChange(false)
      onSaved()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to save medicine schedule') } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{medicine ? 'Edit medicine schedule' : 'Add medicine schedule'}</DialogTitle><DialogDescription>This is optional for journal entries. Copy these values from the exact packaging, leaflet, or clinician instruction to enable timing checks and reminders.</DialogDescription></DialogHeader>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" />Check the exact formulation and concentration. Different products with the same brand can have different strengths.</div>
      <div className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="regimen-name">Product name *</Label><Input id="regimen-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g., Calpol Infant Suspension" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="regimen-ingredient">Active ingredient *</Label><Input id="regimen-ingredient" value={form.activeIngredient} onChange={(event) => setForm({ ...form, activeIngredient: event.target.value })} placeholder="e.g., paracetamol" /></div><div className="space-y-1.5"><Label htmlFor="regimen-form">Formulation *</Label><Input id="regimen-form" value={form.formulation} onChange={(event) => setForm({ ...form, formulation: event.target.value })} placeholder="oral liquid, tablet…" /></div></div>
        <div className="space-y-1.5"><Label htmlFor="regimen-concentration">Concentration / strength</Label><Input id="regimen-concentration" value={form.concentration} onChange={(event) => setForm({ ...form, concentration: event.target.value })} placeholder="e.g., 120 mg / 5 mL" /></div>
        <div className="grid grid-cols-[1fr_120px] gap-3"><div className="space-y-1.5"><Label htmlFor="regimen-dose">Dose amount *</Label><Input id="regimen-dose" type="number" step="0.1" min="0.01" value={form.doseAmount} onChange={(event) => setForm({ ...form, doseAmount: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="regimen-unit">Unit *</Label><Input id="regimen-unit" value={form.doseUnit} onChange={(event) => setForm({ ...form, doseUnit: event.target.value })} /></div></div>
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input className="mt-1" type="checkbox" checked={form.isPrn} onChange={(event) => setForm({ ...form, isPrn: event.target.checked })} /><span><strong>As needed</strong><span className="block text-muted-foreground">Show when another dose becomes eligible, but do not send an automatic due reminder.</span></span></label>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="regimen-gap">Minimum hours between doses *</Label><Input id="regimen-gap" type="number" min="0.25" max="48" step="0.25" value={form.intervalHours} onChange={(event) => setForm({ ...form, intervalHours: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="regimen-max">Maximum doses in 24h *</Label><Input id="regimen-max" type="number" min="1" max="24" value={form.maxDosesPer24h} onChange={(event) => setForm({ ...form, maxDosesPer24h: event.target.value })} /></div></div>
        <div className="space-y-1.5"><Label htmlFor="regimen-source">Verified source *</Label><select id="regimen-source" className={selectClass} value={form.scheduleSource} onChange={(event) => setForm({ ...form, scheduleSource: event.target.value })}><option value="PACKAGING">Product packaging</option><option value="LEAFLET">Leaflet</option><option value="CLINICIAN">Clinician instruction</option></select></div>
        <div className="space-y-1.5"><Label htmlFor="regimen-source-notes">Source details</Label><Input id="regimen-source-notes" value={form.scheduleSourceNotes} onChange={(event) => setForm({ ...form, scheduleSourceNotes: event.target.value })} placeholder="Leaflet revision, clinician, date…" /></div>
        <div className="space-y-1.5"><Label htmlFor="regimen-notes">Notes</Label><Textarea id="regimen-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Save schedule'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}
