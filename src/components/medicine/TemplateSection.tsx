import React from 'react'
import { Edit, Pill, Play, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Medicine } from './types'

interface TemplateSectionProps {
  templates: Medicine[]
  onAdd: () => void
  onStartCourse: (template: Medicine) => void
  onEdit: (template: Medicine) => void
  onDelete: (template: Medicine) => void
  busy?: boolean
}

export default function TemplateSection({ templates, onAdd, onStartCourse, onEdit, onDelete, busy }: TemplateSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" /> Medicine Templates
          </CardTitle>
          <Button variant="outline" size="sm" disabled={busy} onClick={onAdd}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>
        <p className="text-sm text-cozy-text-muted mt-1">
          Reusable medicines you can start as a course for any child.
        </p>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-cozy-text-muted">
            <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No medicine templates yet</p>
            <Button onClick={onAdd} variant="outline" className="mt-4" disabled={busy}>
              Create First Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {templates.map((template) => (
              <div key={template.id} className="p-4 border border-cozy-gray-200 rounded-lg bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-cozy-text truncate">{template.name}</h3>
                    <p className="text-sm text-cozy-text-muted">{template.dosage} • {template.frequency}</p>
                    {template.description && (
                      <p className="text-sm text-cozy-text-muted mt-1 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">Template</Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => onStartCourse(template)} className="flex-1">
                    <Play className="w-3.5 h-3.5" /> Start Course
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => onEdit(template)} className="px-2" title="Edit template">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={busy}
                    onClick={() => onDelete(template)}
                    className="px-2 text-red-600 hover:text-red-700" title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
