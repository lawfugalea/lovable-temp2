import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { checkDoseSafety, describeDoseSafetyWarning } from '@/lib/medicine'
import { apiRequest, ApiError } from './hooks'
import type { Child, Medicine, MedicineDose } from './types'
import { toLocalDateTimeInput } from './types'

const selectClass = 'w-full h-10 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const NEW_MEDICINE = '__new_medicine__'

interface GiveDoseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  childrenList: Child[]
  medicines: Medicine[]
  doses: MedicineDose[]
  episodeId?: string | null
  initialChildId?: string | null
  /** Pre-select this medicine when opening from its saved card / due banner. */
  initialMedicine?: Medicine | null
  /** When set, edits an existing dose record instead of creating one. */
  dose?: MedicineDose | null
  onSaved: () => void
}

export default function GiveDoseDialog({
  open, onOpenChange, householdId, childrenList, medicines, doses, episodeId, initialChildId, initialMedicine, dose, onSaved,
}: GiveDoseDialogProps) {
  const isEditing = !!dose
  const [form, setForm] = useState({ childId: '', medicineId: '', medicineName: '', dosage: '', notes: '', takenAt: '' })
  const [saving, setSaving] = useState(false)
  const [serverBlocked, setServerBlocked] = useState(false)

  useEffect(() => {
    if (!open) return
    if (dose) {
      setForm({
        childId: dose.childId,
        medicineId: dose.medicineId,
        medicineName: '',
        dosage: dose.dosage,
        notes: dose.notes || '',
        takenAt: toLocalDateTimeInput(new Date(dose.takenAt)),
      })
    } else {
      const childId = initialMedicine?.childId || initialChildId || ''
      const savedForChild = medicines.filter((medicine) => (
        !medicine.isTemplate && medicine.isActive && medicine.childId === childId
      ))
      const defaultMedicine = initialMedicine || (savedForChild.length === 1 ? savedForChild[0] : null)
      setForm({
        childId,
        medicineId: defaultMedicine?.id || (savedForChild.length ? '' : NEW_MEDICINE),
        medicineName: '',
        dosage: defaultMedicine?.dosage || '',
        notes: '',
        takenAt: toLocalDateTimeInput(),
      })
    }
    setServerBlocked(false)
  }, [open, dose, initialMedicine, initialChildId, medicines])

  const savedMedicines = medicines.filter(
    (medicine) => !medicine.isTemplate && medicine.isActive && (!form.childId || medicine.childId === form.childId)
  )
  const isNewMedicine = form.medicineId === NEW_MEDICINE

  // Live timing checks are available only for a parent-verified schedule.
  const selectedMedicine = medicines.find((medicine) => medicine.id === form.medicineId) || null
  const proposedTime = form.takenAt ? new Date(form.takenAt) : null
  const safety = selectedMedicine?.scheduleVerifiedAt && proposedTime && !Number.isNaN(proposedTime.getTime())
    ? checkDoseSafety(selectedMedicine, doses, proposedTime, dose?.id)
    : null

  const submit = async (force = false) => {
    const takenAt = form.takenAt ? new Date(form.takenAt) : null
    if (!form.dosage.trim()) {
      toast.error('Enter the amount that was given')
      return
    }
    if (!takenAt || Number.isNaN(takenAt.getTime())) {
      toast.error('Enter a valid date and time')
      return
    }
    if (!isEditing && (!form.childId || !form.medicineId || !episodeId)) {
      toast.error('Select the child and medicine')
      return
    }
    if (!isEditing && isNewMedicine && !form.medicineName.trim()) {
      toast.error('Enter the medicine name')
      return
    }
    setSaving(true)
    try {
      if (isEditing && dose) {
        await apiRequest(`/api/medicine/doses/${dose.id}?householdId=${householdId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            takenAt: takenAt.toISOString(),
            dosage: form.dosage,
            notes: form.notes || '',
            episodeId: dose.episodeId,
            force,
          }),
        })
        toast.success('Dose record updated')
      } else {
        await apiRequest('/api/medicine/doses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            householdId,
            childId: form.childId,
            medicineId: isNewMedicine ? undefined : form.medicineId,
            medicineName: isNewMedicine ? form.medicineName : undefined,
            episodeId,
            dosage: form.dosage,
            notes: form.notes,
            takenAt: takenAt.toISOString(),
            force,
          }),
        })
        const child = childrenList.find((c) => c.id === form.childId)
        toast.success(`Dose recorded${child ? ` for ${child.name}` : ''}`)
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerBlocked(true)
        toast.warning('Timing check needs your attention')
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to save dose')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit dose record' : 'Record a dose'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update what was recorded in the journal.' : 'Log what was given. A reminder schedule is optional.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isEditing && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="dose-child">Child *</Label>
                <select id="dose-child" className={selectClass} value={form.childId}
                  onChange={(e) => {
                    const childId = e.target.value
                    const savedForChild = medicines.filter((medicine) => (
                      !medicine.isTemplate && medicine.isActive && medicine.childId === childId
                    ))
                    const onlyMedicine = savedForChild.length === 1 ? savedForChild[0] : null
                    setForm({
                      ...form,
                      childId,
                      medicineId: onlyMedicine?.id || (savedForChild.length ? '' : NEW_MEDICINE),
                      medicineName: '',
                      dosage: onlyMedicine?.dosage || '',
                    })
                  }}>
                  <option value="">Select child</option>
                  {childrenList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dose-medicine">Medicine *</Label>
                <select id="dose-medicine" className={selectClass} value={form.medicineId}
                  onChange={(e) => {
                    const medicine = medicines.find((item) => item.id === e.target.value)
                    setForm({
                      ...form,
                      medicineId: e.target.value,
                      medicineName: '',
                      childId: medicine?.childId || form.childId,
                      dosage: medicine?.dosage || '',
                    })
                  }}>
                  <option value="">Choose a saved medicine</option>
                  {savedMedicines.map((medicine) => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} · {medicine.dosage}{medicine.scheduleVerifiedAt ? '' : ' · schedule not set'}
                    </option>
                  ))}
                  <option value={NEW_MEDICINE}>＋ Record a different medicine</option>
                </select>
              </div>
              {isNewMedicine && <div className="space-y-1.5">
                <Label htmlFor="dose-medicine-name">Medicine or product name *</Label>
                <Input id="dose-medicine-name" maxLength={100} placeholder="e.g., Calpol Infant Suspension" value={form.medicineName}
                  onChange={(e) => setForm({ ...form, medicineName: e.target.value })} />
                <p className="text-xs text-muted-foreground">We will save this medicine for next time. You can add timing and reminder details later.</p>
              </div>}
              {selectedMedicine?.scheduleVerifiedAt && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Timing checks are on</p>
                <p className="mt-1 text-emerald-800">Saved schedule: {selectedMedicine.dosage} · {selectedMedicine.frequency}</p>
              </div>}
              {selectedMedicine && !selectedMedicine.scheduleVerifiedAt && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> No schedule set</p>
                <p className="mt-1 text-amber-800">This dose will be recorded, but timing checks and reminders are unavailable until the product schedule is added.</p>
              </div>}
              {isNewMedicine && <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium"><Plus className="h-4 w-4" /> Journal first</p>
                <p className="mt-1 text-muted-foreground">Recording this dose will not create a due-time reminder or suggest when another dose can be given.</p>
              </div>}
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dose-dosage">Amount given *</Label>
            <Input id="dose-dosage" maxLength={120} placeholder="e.g., 5 mL, 1 tablet" value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dose-time">When was it taken?</Label>
            <Input id="dose-time" type="datetime-local" value={form.takenAt}
              onChange={(e) => setForm({ ...form, takenAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dose-notes">Notes (optional)</Label>
            <Input id="dose-notes" placeholder="e.g., taken with food" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {safety && !safety.ok && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" /> Safety warning
              </p>
              {safety.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-800">{describeDoseSafetyWarning(w)}</p>
              ))}
              <p className="text-xs text-amber-700">
                If this was already administered, you can still preserve the factual record after reviewing the warning.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {(safety && !safety.ok) || serverBlocked ? (
            <Button variant="destructive" onClick={() => submit(true)} disabled={saving}>
              {saving ? 'Saving…' : 'Record with warning'}
            </Button>
          ) : (
            <Button onClick={() => submit(false)} disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Update record' : 'Record dose'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
