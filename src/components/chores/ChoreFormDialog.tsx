import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { describeRecurrence, validateRecurrenceInput } from '@/lib/chore-recurrence'
import { cn } from '@/lib/utils'
import ChoreIconPicker from '@/components/chores/ChoreIconPicker'

export interface ChoreDto {
  id: string
  title: string
  notes: string | null
  icon: string | null
  active: boolean
  assignee: { id: string; name: string | null } | null
  recurrenceType: 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'
  daysOfWeek: number[]
  intervalDays: number | null
  anchorDate: string | null
  dayOfMonth: number | null
  schedule: string
}

export interface HouseholdMemberOption {
  id: string
  name: string | null
}

interface ChoreFormDialogProps {
  open: boolean
  chore: ChoreDto | null
  members: HouseholdMemberOption[]
  onClose: () => void
  onSaved: (chore: ChoreDto, created: boolean) => void
}

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

const RECURRENCE_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'EVERY_N_DAYS', label: 'Every … days' },
  { value: 'MONTHLY', label: 'Monthly' },
] as const

function localDateOnly() {
  return new Date().toLocaleDateString('en-CA')
}

export default function ChoreFormDialog({ open, chore, members, onClose, onSaved }: ChoreFormDialogProps) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [assigneeId, setAssigneeId] = useState('')
  const [recurrenceType, setRecurrenceType] = useState<'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'>('WEEKLY')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [intervalDays, setIntervalDays] = useState('2')
  const [anchorDate, setAnchorDate] = useState(localDateOnly())
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setTitle(chore?.title || '')
    setNotes(chore?.notes || '')
    setIcon(chore?.icon ?? null)
    setAssigneeId(chore?.assignee?.id || '')
    setRecurrenceType(chore?.recurrenceType || 'WEEKLY')
    setDaysOfWeek(chore?.daysOfWeek?.length ? chore.daysOfWeek : [])
    setIntervalDays(String(chore?.intervalDays || 2))
    setAnchorDate(chore?.anchorDate || localDateOnly())
    setDayOfMonth(String(chore?.dayOfMonth || 1))
  }, [open, chore])

  const recurrenceInput = useMemo(() => ({
    recurrenceType,
    daysOfWeek,
    intervalDays: Number(intervalDays),
    anchorDate,
    dayOfMonth: Number(dayOfMonth),
  }), [recurrenceType, daysOfWeek, intervalDays, anchorDate, dayOfMonth])

  const validated = useMemo(() => validateRecurrenceInput(recurrenceInput), [recurrenceInput])
  const preview = validated.ok ? describeRecurrence(validated.recurrence) : null

  const submit = async () => {
    if (!title.trim()) { setError('Give this chore a name'); return }
    if (!validated.ok) { setError(validated.error); return }
    setBusy(true)
    setError('')
    try {
      const response = await fetch(chore ? `/api/chores/${encodeURIComponent(chore.id)}` : '/api/chores', {
        method: chore ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim(),
          icon,
          assigneeId: assigneeId || null,
          ...recurrenceInput,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not save this chore')
      onSaved(data.chore as ChoreDto, !chore)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this chore')
    } finally {
      setBusy(false)
    }
  }

  const toggleDay = (day: number) => {
    setDaysOfWeek(current => (current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => a - b)))
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{chore ? 'Edit chore' : 'New chore'}</DialogTitle>
          <DialogDescription>Recurring chores show up automatically on the days they are due.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="chore-title" className="text-sm font-medium">Chore</label>
            <Input id="chore-title" autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Take out the recycling" maxLength={200} className="mt-1 h-11" />
          </div>

          <ChoreIconPicker title={title} value={icon} onChange={setIcon} />

          <div>
            <span className="text-sm font-medium">Repeats</span>
            <div className="mt-1 grid grid-cols-3 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Recurrence type">
              {RECURRENCE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={recurrenceType === option.value}
                  onClick={() => setRecurrenceType(option.value)}
                  className={cn(
                    'min-h-10 rounded-md px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    recurrenceType === option.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {recurrenceType === 'WEEKLY' && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weekdays">
              {WEEKDAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={daysOfWeek.includes(day.value)}
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    'min-h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    daysOfWeek.includes(day.value)
                      ? 'border-module-chores/40 bg-module-chores/10 text-module-chores'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}

          {recurrenceType === 'EVERY_N_DAYS' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="chore-interval" className="text-sm font-medium">Every … days</label>
                <Input id="chore-interval" type="number" min={1} max={365} value={intervalDays} onChange={event => setIntervalDays(event.target.value)} className="mt-1 h-11" />
              </div>
              <div>
                <label htmlFor="chore-anchor" className="text-sm font-medium">Starting from</label>
                <Input id="chore-anchor" type="date" value={anchorDate} onChange={event => setAnchorDate(event.target.value)} className="mt-1 h-11" />
              </div>
            </div>
          )}

          {recurrenceType === 'MONTHLY' && (
            <div>
              <label htmlFor="chore-day" className="text-sm font-medium">Day of the month</label>
              <Input id="chore-day" type="number" min={1} max={31} value={dayOfMonth} onChange={event => setDayOfMonth(event.target.value)} className="mt-1 h-11 w-32" />
              <p className="mt-1 text-xs text-muted-foreground">Short months use their last day instead.</p>
            </div>
          )}

          {preview && (
            <p className="rounded-lg bg-module-chores/10 px-3 py-2 text-sm font-medium text-module-chores">{preview}</p>
          )}

          <div>
            <label htmlFor="chore-assignee" className="text-sm font-medium">Assigned to</label>
            <select
              id="chore-assignee"
              value={assigneeId}
              onChange={event => setAssigneeId(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Anyone in the household</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>{member.name || 'Household member'}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="chore-notes" className="text-sm font-medium">Notes (optional)</label>
            <Textarea id="chore-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={2} maxLength={2000} placeholder="Bins go out before 7am" className="mt-1" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="min-h-11">Cancel</Button>
          <Button type="button" onClick={() => void submit()} disabled={busy} className="min-h-11">
            {busy && <Loader2 className="animate-spin" />}
            {chore ? 'Save chore' : 'Create chore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
