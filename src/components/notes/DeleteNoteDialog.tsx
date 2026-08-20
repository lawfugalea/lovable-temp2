import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Note } from './types'

interface DeleteNoteDialogProps {
  note: Note | null
  onCancel: () => void
  onConfirm: (note: Note) => void
}

export default function DeleteNoteDialog({ note, onCancel, onConfirm }: DeleteNoteDialogProps) {
  return (
    <AlertDialog open={!!note} onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete note?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{' '}
            <strong className="text-foreground">&ldquo;{note?.title || 'Untitled'}&rdquo;</strong>{' '}
            and all its content. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => note && onConfirm(note)}
          >
            Delete Note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
