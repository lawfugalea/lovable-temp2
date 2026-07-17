import React from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { Clock, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Child, Medicine, MedicineDose } from './types'

interface DoseHistoryProps {
  doses: MedicineDose[]
  medicines: Medicine[]
  children: Child[]
  onEdit: (dose: MedicineDose) => void
  onDelete: (dose: MedicineDose) => void
  busy?: boolean
  limit?: number
}

function doseDayLabel(takenAt: Date): string {
  if (isToday(takenAt)) return 'Today'
  if (isYesterday(takenAt)) return 'Yesterday'
  return format(takenAt, 'MMM dd')
}

export default function DoseHistory({ doses, medicines, children, onEdit, onDelete, busy, limit = 10 }: DoseHistoryProps) {
  const recent = [...doses]
    .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
    .slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Recent Doses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-cozy-text-muted">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No doses recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((dose) => {
              const medicine = medicines.find((m) => m.id === dose.medicineId)
              const child = children.find((c) => c.id === dose.childId)
              const takenAt = new Date(dose.takenAt)
              return (
                <div key={dose.id} className="flex items-center justify-between gap-3 p-4 border border-cozy-gray-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-cozy-text truncate">{medicine?.name || 'Medicine'}</h3>
                    <p className="text-sm text-cozy-text-muted">
                      {child?.name ? `${child.name} • ` : ''}{dose.dosage} • {format(takenAt, 'MMM dd, yyyy HH:mm')}
                    </p>
                    {dose.notes && <p className="text-sm text-cozy-text-muted mt-1">{dose.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline">{doseDayLabel(takenAt)}</Badge>
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => onEdit(dose)} className="px-2" title="Edit dose">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline" size="sm" disabled={busy}
                      onClick={() => onDelete(dose)}
                      className="px-2 text-red-600 hover:text-red-700" title="Delete dose"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
