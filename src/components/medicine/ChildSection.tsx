import React from 'react'
import { format } from 'date-fns'
import { Baby, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { MedicineSchedule } from '@/lib/medicine'
import type { Child, Medicine } from './types'
import CourseCard from './CourseCard'
import { getChildAge } from './types'

interface ChildSectionProps {
  child: Child
  courses: { medicine: Medicine; schedule: MedicineSchedule }[]
  onStartCourse: (child: Child) => void
  onGiveDose: (medicine: Medicine) => void
  onStop: (medicine: Medicine) => void
  onEdit: (medicine: Medicine) => void
  onOverride: (medicine: Medicine) => void
  onClearOverride: (medicine: Medicine) => void
  busy?: boolean
}

export default function ChildSection({
  child, courses, onStartCourse, onGiveDose, onStop, onEdit, onOverride, onClearOverride, busy,
}: ChildSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 min-w-0">
            <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Baby className="h-4 w-4 text-blue-600" />
            </span>
            <span className="truncate">{child.name}</span>
            <span className="text-sm font-normal text-cozy-text-muted whitespace-nowrap">
              {getChildAge(child.dateOfBirth)} • Born {format(new Date(child.dateOfBirth), 'MMM dd, yyyy')}
            </span>
          </CardTitle>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onStartCourse(child)}>
            <Plus className="h-4 w-4" /> Start Course
          </Button>
        </div>
        {child.notes && <p className="text-sm text-cozy-text-muted mt-1">{child.notes}</p>}
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="text-center py-6 text-cozy-text-muted">
            <p className="text-sm">No active medicine courses for {child.name}</p>
            <Button variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => onStartCourse(child)}>
              Start a course
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {courses.map(({ medicine, schedule }) => (
              <CourseCard
                key={medicine.id}
                medicine={medicine}
                schedule={schedule}
                onGiveDose={onGiveDose}
                onStop={onStop}
                onEdit={onEdit}
                onOverride={onOverride}
                onClearOverride={onClearOverride}
                busy={busy}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
