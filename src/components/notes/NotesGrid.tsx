import React from 'react'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import NoteCard from './NoteCard'
import type { Note, NotesTab } from './types'
import type { NotePatch } from './useNotes'

interface NotesGridProps {
  notes: Note[]
  loading?: boolean
  searchQuery: string
  activeTab: NotesTab
  isNoteOwner: (note: Note) => boolean
  canEditNote: (note: Note) => boolean
  onOpen: (note: Note) => void
  onUpdate: (noteId: string, patch: NotePatch) => void
  onShare: (note: Note) => void
  onDelete: (note: Note) => void
  onCreateNote: () => void
}

const EMPTY_COPY: Record<NotesTab, { title: string; description: string }> = {
  all: { title: 'No notes yet', description: 'Start by creating your first note!' },
  personal: { title: 'No personal notes', description: 'Notes you keep private will show up here.' },
  shared: { title: 'No shared notes yet', description: 'Share a note with your household to see it here.' },
  archived: { title: 'Nothing archived', description: 'Archived notes are tucked away here.' },
}

export default function NotesGrid({
  notes,
  loading,
  searchQuery,
  activeTab,
  isNoteOwner,
  canEditNote,
  onOpen,
  onUpdate,
  onShare,
  onDelete,
  onCreateNote,
}: NotesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="mb-3 h-5 w-2/3" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="mb-2 h-3 w-5/6" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (notes.length === 0) {
    const copy = EMPTY_COPY[activeTab]
    return (
      <EmptyState
        className="animate-fade-in"
        icon={FileText}
        module="notes"
        title={searchQuery ? 'No notes found' : copy.title}
        description={searchQuery ? 'Try adjusting your search terms' : copy.description}
        action={
          !searchQuery && activeTab !== 'archived' ? (
            <Button onClick={onCreateNote}>
              <Plus className="mr-2 h-4 w-4" />
              Create Note
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 animate-fade-in sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          isOwner={isNoteOwner(note)}
          canEdit={canEditNote(note)}
          onOpen={onOpen}
          onUpdate={onUpdate}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
