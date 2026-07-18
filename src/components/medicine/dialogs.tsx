import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { apiRequest } from './hooks'
import type { Child, Medicine } from './types'
import { FREQUENCY_OPTIONS, toLocalDateTimeInput } from './types'

interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  onSaved: () => void
}

const selectClass = 'w-full h-10 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ChildDialog({ open, onOpenChange, householdId, onSaved }: BaseDialogProps) {
  const [form, setForm] = useState({ name: '', dateOfBirth: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ name: '', dateOfBirth: '', notes: '' })
  }, [open])

  const submit = async () => {
    if (!form.name.trim() || !form.dateOfBirth) {
      toast.error('Name and date of birth are required')
      return
    }
    setSaving(true)
    try {
      await apiRequest('/api/medicine/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...form }),
      })
      toast.success(`${form.name.trim()} added`)
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add child')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Child</DialogTitle>
          <DialogDescription>Add a child to track their medicines and fevers.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="child-name">Name *</Label>
            <Input id="child-name" placeholder="Child's name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="child-dob">Date of birth *</Label>
            <Input id="child-dob" type="date" value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="child-notes">Notes (optional)</Label>
            <Input id="child-notes" placeholder="e.g., allergies, preferences" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Adding…' : 'Add Child'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MedicineDialogProps extends BaseDialogProps {
  /** When set, edits this medicine (template or course); otherwise creates a template. */
  medicine?: Medicine | null
}

export function MedicineDialog({ open, onOpenChange, householdId, medicine, onSaved }: MedicineDialogProps) {
  const isEditing = !!medicine
  const isCourse = !!medicine && !medicine.isTemplate
  const [form, setForm] = useState({
    name: '', description: '', dosage: '', frequency: '', startDate: '', endDate: '', notes: '',
    isPrn: false, minGapHours: '', maxDosesPer24h: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      name: medicine?.name || '',
      description: medicine?.description || '',
      dosage: medicine?.dosage || '',
      frequency: medicine?.frequency || '',
      startDate: medicine?.startDate ? new Date(medicine.startDate).toISOString().split('T')[0] : '',
      endDate: medicine?.endDate ? new Date(medicine.endDate).toISOString().split('T')[0] : '',
      notes: medicine?.notes || '',
      isPrn: medicine?.isPrn || medicine?.frequency === 'as needed' || false,
      minGapHours: medicine?.minGapHours != null ? String(medicine.minGapHours) : '',
      maxDosesPer24h: medicine?.maxDosesPer24h != null ? String(medicine.maxDosesPer24h) : '',
    })
  }, [open, medicine])

  const submit = async () => {
    if (!form.name.trim() || !form.dosage.trim() || !form.frequency) {
      toast.error('Name, dosage, and frequency are required')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description,
      dosage: form.dosage,
      frequency: form.frequency,
      notes: form.notes,
      startDate: form.startDate || undefined,
      endDate: form.endDate || null,
      isPrn: form.isPrn,
      minGapHours: form.minGapHours === '' ? null : Number(form.minGapHours),
      maxDosesPer24h: form.maxDosesPer24h === '' ? null : Number(form.maxDosesPer24h),
    }
    try {
      if (isEditing && medicine) {
        await apiRequest(`/api/medicine/medicines/${medicine.id}?householdId=${householdId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, isActive: medicine.isActive }),
        })
        toast.success(`${form.name.trim()} updated`)
      } else {
        await apiRequest(`/api/medicine/medicines?householdId=${householdId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, childId: null, isTemplate: true }),
        })
        toast.success(`Template "${form.name.trim()}" created`)
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save medicine')
    } finally {
      setSaving(false)
    }
  }

  const title = isEditing ? (isCourse ? 'Edit Medicine Course' : 'Edit Medicine Template') : 'New Medicine Template'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isCourse
              ? 'Update this active course. Changes apply to future doses.'
              : 'Templates are reusable for any child in your household.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="med-name">Medicine name *</Label>
            <Input id="med-name" placeholder="e.g., Paracetamol, Ibuprofen" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="med-desc">Description (optional)</Label>
            <Input id="med-desc" placeholder="e.g., For fever and pain relief" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="med-dosage">Dosage *</Label>
              <Input id="med-dosage" placeholder="e.g., 5ml, 1 tablet" value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-frequency">Frequency *</Label>
              <select id="med-frequency" className={selectClass} value={form.frequency}
                onChange={(e) => setForm({
                  ...form,
                  frequency: e.target.value,
                  isPrn: e.target.value === 'as needed' ? true : form.isPrn,
                })}>
                <option value="">Select frequency</option>
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="med-start">{isCourse ? 'Course starts' : 'Valid from'}</Label>
              <Input id="med-start" type="date" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-end">{isCourse ? 'Course ends (optional)' : 'Valid until (optional)'}</Label>
              <Input id="med-end" type="date" value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="med-notes">Notes (optional)</Label>
            <Input id="med-notes" placeholder="e.g., Take with food" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="rounded-md border border-border bg-secondary/40 p-3 space-y-3">
            <p className="text-sm font-medium text-foreground">Safety guardrails</p>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isPrn}
                onChange={(e) => setForm({ ...form, isPrn: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              As needed (PRN) — no fixed schedule, only gap and daily limits apply
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="med-gap">Minimum gap between doses (hours)</Label>
                <Input id="med-gap" type="number" min={0.25} max={48} step={0.25}
                  placeholder={form.isPrn ? 'e.g., 4' : 'defaults to frequency'}
                  value={form.minGapHours}
                  onChange={(e) => setForm({ ...form, minGapHours: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="med-max">Max doses per 24h (optional)</Label>
                <Input id="med-max" type="number" min={1} max={24} step={1}
                  placeholder="e.g., 4"
                  value={form.maxDosesPer24h}
                  onChange={(e) => setForm({ ...form, maxDosesPer24h: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface StartCourseDialogProps extends BaseDialogProps {
  templates: Medicine[]
  childrenList: Child[]
  initialTemplateId?: string
  initialChildId?: string
}

export function StartCourseDialog({
  open, onOpenChange, householdId, templates, childrenList, initialTemplateId, initialChildId, onSaved,
}: StartCourseDialogProps) {
  const [templateId, setTemplateId] = useState('')
  const [childId, setChildId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTemplateId(initialTemplateId || '')
      setChildId(initialChildId || '')
    }
  }, [open, initialTemplateId, initialChildId])

  const submit = async () => {
    if (!templateId || !childId) {
      toast.error('Choose a medicine template and a child')
      return
    }
    setSaving(true)
    try {
      await apiRequest(`/api/medicine/medicines?householdId=${householdId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, childId, isTemplate: false }),
      })
      const child = childrenList.find((c) => c.id === childId)
      const template = templates.find((t) => t.id === templateId)
      toast.success(`Started ${template?.name || 'course'}${child ? ` for ${child.name}` : ''}`)
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Medicine Course</DialogTitle>
          <DialogDescription>Start an active course from a template for one of your children.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="course-template">Medicine template *</Label>
            <select id="course-template" className={selectClass} value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.dosage}, {t.frequency})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course-child">Child *</Label>
            <select id="course-child" className={selectClass} value={childId}
              onChange={(e) => setChildId(e.target.value)}>
              <option value="">Select child</option>
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Starting…' : 'Start Course'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface OverrideDialogProps extends BaseDialogProps {
  medicine: Medicine | null
}

export function OverrideDialog({ open, onOpenChange, householdId, medicine, onSaved }: OverrideDialogProps) {
  const [nextDoseTime, setNextDoseTime] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setNextDoseTime(toLocalDateTimeInput())
      setReason('')
    }
  }, [open])

  const submit = async () => {
    if (!medicine || !nextDoseTime) {
      toast.error('Pick the next dose time')
      return
    }
    setSaving(true)
    try {
      await apiRequest(`/api/medicine/next-dose-override?householdId=${householdId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: medicine.id,
          nextDoseOverride: new Date(nextDoseTime).toISOString(),
          overrideReason: reason || null,
        }),
      })
      toast.success('Next dose time set')
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set next dose time')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Next Dose Timing</DialogTitle>
          <DialogDescription>
            {medicine ? `Override the automatic schedule for ${medicine.name}.` : 'Override the automatic schedule.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="override-time">Next dose time *</Label>
            <Input id="override-time" type="datetime-local" value={nextDoseTime}
              onChange={(e) => setNextDoseTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="override-reason">Reason (optional)</Label>
            <Input id="override-reason" placeholder="e.g., Sleep schedule, doctor's advice" value={reason}
              onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Set Override'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
}

export function ReportDialog({ open, onOpenChange, householdId }: ReportDialogProps) {
  const [dates, setDates] = useState({ startDate: '', endDate: '' })
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (open) setDates({ startDate: '', endDate: '' })
  }, [open])

  const submit = async () => {
    if (!dates.startDate || !dates.endDate) {
      toast.error('Pick a start and end date')
      return
    }
    setGenerating(true)
    try {
      const response = await apiRequest(
        `/api/medicine/report-pdf?householdId=${householdId}&startDate=${dates.startDate}&endDate=${dates.endDate}`
      )
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clankeep-medicine-report-${dates.startDate}-to-${dates.endDate}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Report downloaded')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate PDF Report</DialogTitle>
          <DialogDescription>
            A report of medicine doses, courses, and fever readings for the selected period.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-start">From *</Label>
            <Input id="report-start" type="date" value={dates.startDate}
              onChange={(e) => setDates({ ...dates, startDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-end">To *</Label>
            <Input id="report-end" type="date" value={dates.endDate}
              onChange={(e) => setDates({ ...dates, endDate: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={generating}>{generating ? 'Generating…' : 'Generate PDF'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
