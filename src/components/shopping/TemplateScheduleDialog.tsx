import { useEffect, useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

type RecurrenceType = 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'

export interface SchedulableTemplate {
  id: string
  name: string
  recurrenceType?: RecurrenceType | null
  daysOfWeek?: number[]
  intervalDays?: number | null
  anchorDate?: string | null
  dayOfMonth?: number | null
  autoListId?: string | null
}

interface ListOption {
  id: string
  name: string
  archivedAt?: string | null
}

interface TemplateScheduleDialogProps {
  template: SchedulableTemplate | null
  lists: ListOption[]
  onClose: () => void
  onSaved: () => void
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

/**
 * Schedule a template to refill a list on its own.
 *
 * The recurrence vocabulary deliberately matches the chores editor — weekly on
 * chosen days, every N days, or a day of the month — because it is backed by
 * the same engine, and two different mental models for "repeats" in one app
 * would be worse than one shared one.
 */
export default function TemplateScheduleDialog({
  template,
  lists,
  onClose,
  onSaved,
}: TemplateScheduleDialogProps) {
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('WEEKLY')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1])
  const [intervalDays, setIntervalDays] = useState('7')
  const [anchorDate, setAnchorDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [listId, setListId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const activeLists = lists.filter(list => !list.archivedAt)
  const scheduled = Boolean(template?.recurrenceType && template?.autoListId)

  useEffect(() => {
    if (!template) return
    setError('')
    setRecurrenceType(template.recurrenceType || 'WEEKLY')
    setDaysOfWeek(template.daysOfWeek?.length ? template.daysOfWeek : [1])
    setIntervalDays(String(template.intervalDays || 7))
    setAnchorDate(template.anchorDate?.slice(0, 10) || new Date().toLocaleDateString('en-CA'))
    setDayOfMonth(String(template.dayOfMonth || 1))
    setListId(template.autoListId || activeLists[0]?.id || '')
    // activeLists is derived from props each render; keying off the template is
    // what actually decides when these fields should be reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  const save = async (clear = false) => {
    if (!template) return
    setBusy(true)
    setError('')
    try {
      const body = clear
        ? { templateId: template.id, recurrenceType: null }
        : {
            templateId: template.id,
            autoListId: listId,
            recurrenceType,
            daysOfWeek: recurrenceType === 'WEEKLY' ? daysOfWeek : undefined,
            intervalDays: recurrenceType === 'EVERY_N_DAYS' ? Number(intervalDays) : undefined,
            anchorDate: recurrenceType === 'EVERY_N_DAYS' ? anchorDate : undefined,
            dayOfMonth: recurrenceType === 'MONTHLY' ? Number(dayOfMonth) : undefined,
          }

      const response = await fetch('/api/shopping/templates/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not save this schedule')
      }
      toast.success(clear ? 'Schedule removed' : `${template.name} will refill automatically`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this schedule')
    } finally {
      setBusy(false)
    }
  }

  const toggleDay = (day: number) => {
    setDaysOfWeek(current => (
      current.includes(day) ? current.filter(value => value !== day) : [...current, day].sort((a, b) => a - b)
    ))
  }

  return (
    <Dialog open={template !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-module-shopping" aria-hidden="true" />
            Repeat {template?.name}
          </DialogTitle>
          <DialogDescription>
            Add these items to a list automatically. Anything already on the list and
            not yet bought is left alone, so quantities never creep up.
          </DialogDescription>
        </DialogHeader>

        {activeLists.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Create an active shopping list first.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="schedule-list" className="text-sm font-medium">List to fill</label>
              <select
                id="schedule-list"
                value={listId}
                onChange={event => setListId(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {activeLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="schedule-repeat" className="text-sm font-medium">Repeats</label>
              <select
                id="schedule-repeat"
                value={recurrenceType}
                onChange={event => setRecurrenceType(event.target.value as RecurrenceType)}
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="WEEKLY">On chosen weekdays</option>
                <option value="EVERY_N_DAYS">Every N days</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            {recurrenceType === 'WEEKLY' && (
              <fieldset>
                <legend className="text-sm font-medium">Days</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={daysOfWeek.includes(day.value)}
                      onClick={() => toggleDay(day.value)}
                      className={`min-h-11 min-w-11 rounded-md border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        daysOfWeek.includes(day.value)
                          ? 'border-transparent bg-module-shopping/10 text-module-shopping'
                          : 'border-input text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {recurrenceType === 'EVERY_N_DAYS' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="schedule-interval" className="text-sm font-medium">Every</label>
                  <Input
                    id="schedule-interval"
                    type="number"
                    min={1}
                    max={365}
                    value={intervalDays}
                    onChange={event => setIntervalDays(event.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="schedule-anchor" className="text-sm font-medium">Starting</label>
                  <Input
                    id="schedule-anchor"
                    type="date"
                    value={anchorDate}
                    onChange={event => setAnchorDate(event.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
              </div>
            )}

            {recurrenceType === 'MONTHLY' && (
              <div>
                <label htmlFor="schedule-day" className="text-sm font-medium">Day of the month</label>
                <Input
                  id="schedule-day"
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={event => setDayOfMonth(event.target.value)}
                  className="mt-1 h-11"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Months that are too short use their last day.
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {scheduled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void save(true)}
              disabled={busy}
              className="min-h-11 sm:mr-auto"
            >
              Stop repeating
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} className="min-h-11">Cancel</Button>
          <Button
            type="button"
            onClick={() => void save(false)}
            disabled={busy || !listId || (recurrenceType === 'WEEKLY' && daysOfWeek.length === 0)}
            className="min-h-11"
          >
            {busy && <Loader2 className="animate-spin" />}Save schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
