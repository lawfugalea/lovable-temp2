import React from 'react'
import { format } from 'date-fns'
import { Edit, Settings, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatTimeUntil, type MedicineSchedule } from '@/lib/medicine'
import type { Medicine } from './types'

interface CourseCardProps {
  medicine: Medicine
  schedule: MedicineSchedule
  onGiveDose: (medicine: Medicine) => void
  onStop: (medicine: Medicine) => void
  onEdit: (medicine: Medicine) => void
  onOverride: (medicine: Medicine) => void
  onClearOverride: (medicine: Medicine) => void
  busy?: boolean
}

export default function CourseCard({
  medicine, schedule, onGiveDose, onStop, onEdit, onOverride, onClearOverride, busy,
}: CourseCardProps) {
  return (
    <div className={`p-4 border rounded-lg ${schedule.isDue ? 'border-orange-200 bg-orange-50' : 'border-cozy-gray-200 bg-white'}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-cozy-text text-lg truncate">{medicine.name}</h3>
            <p className="text-sm text-cozy-text-muted">{medicine.dosage} • {medicine.frequency}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {schedule.isPrn && <Badge variant="secondary" className="text-xs">As needed</Badge>}
            {schedule.isDue && <Badge variant="destructive" className="text-xs">Due Now</Badge>}
            {schedule.dailyLimitReached && <Badge variant="destructive" className="text-xs">Daily limit</Badge>}
          </div>
        </div>

        {medicine.description && (
          <p className="text-sm text-cozy-text-muted">{medicine.description}</p>
        )}

        <div className="text-xs space-y-1">
          {schedule.lastDoseAt && (
            <p className="text-cozy-text-muted">Last dose: {format(schedule.lastDoseAt, 'MMM dd, HH:mm')}</p>
          )}
          {schedule.nextDoseTime && (
            <p className={`font-medium ${schedule.isDue ? 'text-red-600' : 'text-blue-600'}`}>
              {schedule.isDue
                ? 'Due now'
                : `Next dose in ${formatTimeUntil(schedule.msUntilNext ?? 0)}`}
              {' '}({format(schedule.nextDoseTime, 'MMM dd, HH:mm')})
            </p>
          )}
          {schedule.isPrn && !schedule.dailyLimitReached && (
            schedule.canGiveNow ? (
              <p className="font-medium text-green-600">OK to give when needed</p>
            ) : schedule.canGiveAt ? (
              <p className="font-medium text-amber-600">
                Wait {formatTimeUntil(schedule.msUntilCanGive || 0)} (safe after {format(schedule.canGiveAt, 'HH:mm')})
              </p>
            ) : null
          )}
          {medicine.maxDosesPer24h != null && (
            <p className={schedule.dailyLimitReached ? 'font-medium text-red-600' : 'text-cozy-text-muted'}>
              {schedule.dosesLast24h} of {medicine.maxDosesPer24h} doses in the last 24h
              {schedule.dailyLimitReached ? ' — limit reached' : ''}
            </p>
          )}
          {schedule.isOverride && (
            <p className="text-purple-600">
              Manual override{schedule.overrideReason ? `: ${schedule.overrideReason}` : ''}
            </p>
          )}
          {medicine.endDate && (
            <p className="text-cozy-text-muted">Course ends {format(new Date(medicine.endDate), 'MMM dd, yyyy')}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button size="sm" disabled={busy} onClick={() => onGiveDose(medicine)} className="flex-1 sm:flex-none">
            Give Now
          </Button>
          <Button
            variant="outline" size="sm" disabled={busy}
            onClick={() => onStop(medicine)}
            className="flex-1 sm:flex-none text-orange-600 hover:text-orange-700"
          >
            <Square className="w-3.5 h-3.5" /> Stop Course
          </Button>
          <div className="flex gap-1 sm:gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onEdit(medicine)} className="px-2" title="Edit course">
              <Edit className="w-4 h-4" />
            </Button>
            {schedule.isOverride ? (
              <Button
                variant="outline" size="sm" disabled={busy}
                onClick={() => onClearOverride(medicine)}
                className="px-2 text-purple-600 hover:text-purple-700"
                title="Clear next dose override"
              >
                <X className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline" size="sm" disabled={busy}
                onClick={() => onOverride(medicine)}
                className="px-2" title="Set next dose timing"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
