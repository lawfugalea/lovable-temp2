import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Child, Medicine } from './types'

interface DueNowBannerProps {
  dueMedicines: Medicine[]
  children: Child[]
  onGiveDose: (medicine: Medicine) => void
}

export default function DueNowBanner({ dueMedicines, children, onGiveDose }: DueNowBannerProps) {
  if (dueMedicines.length === 0) return null
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-orange-800">Medicines due now</h3>
            <p className="text-sm text-orange-700">
              {dueMedicines.length} medicine{dueMedicines.length === 1 ? ' is' : 's are'} due for administration
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {dueMedicines.map((medicine) => {
            const child = children.find((c) => c.id === medicine.childId)
            return (
              <div key={medicine.id} className="flex items-center justify-between gap-3 p-3 bg-white/70 border border-orange-200 rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{medicine.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {child?.name ? `${child.name} • ` : ''}{medicine.dosage} • {medicine.frequency}
                  </p>
                </div>
                <Button size="sm" onClick={() => onGiveDose(medicine)}>Give now</Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
