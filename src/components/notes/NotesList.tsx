import React from 'react'
import { FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import ModuleFirstRun from '@/components/onboarding/ModuleFirstRun'
import { Skeleton } from '@/components/ui/Skeleton'
import NoteCard from './NoteCard'
import type { Note, NotesTab } from './types'
import type { NotePatch } from './useNotes'

interface NotesListProps {
  notes: Note[]
  /** `board` fills the page below lg; `rail` is the narrow desktop column beside the editor. */
  variant: 'board' | 'rail'
  loading?: boolean
  searchQuery: string
  activeTab: NotesTab
  selectedNoteId?: string | null
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
      {children}
    </p>
  )
}

export default function NotesList({
  notes,
  variant,
  loading,
  searchQuery,
  activeTab,
  selectedNoteId,
  isNoteOwner,
  canEditNote,
  onOpen,
  onUpdate,
  onShare,
  onDelete,
  onCreateNote,
}: NotesListProps) {
  const compact = variant === 'rail'

  if (loading) {
    return (
      <div className={cn(compact ? 'space-y-2' : 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
        {Array.from({ length: compact ? 6 : 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
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
    // The unfiltered "all" tab with nothing in it is the only genuine first run.
    // The other tabs are empty for a reason the user already knows (they have
    // not shared anything, nothing is archived), so they get no explainer.
    if (!searchQuery && activeTab === 'all') {
      return (
        <ModuleFirstRun
          className="animate-fade-in"
          module="notes"
          title="No notes yet"
          action={
            <Button onClick={onCreateNote}>
              <Plus className="mr-2 h-4 w-4" />
              Create note
            </Button>
          }
        />
      )
    }

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

  // `filteredNotes` already sorts pinned first, so the split is just where that run ends.
  const pinned = notes.filter(note => note.isPinned)
  const rest = notes.filter(note => !note.isPinned)

  const card = (note: Note) => (
    <NoteCard
      key={note.id}
      note={note}
      compact={compact}
      selected={note.id === selectedNoteId}
      isOwner={isNoteOwner(note)}
      canEdit={canEditNote(note)}
      onOpen={onOpen}
      onUpdate={onUpdate}
      onShare={onShare}
      onDelete={onDelete}
    />
  )

  // Multi-column below lg so cards keep their own height instead of stretching to a grid row.
  const group = (items: Note[]) => (
    <div className={cn(compact ? 'space-y-2' : 'gap-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid')}>
      {items.map(card)}
    </div>
  )

  return (
    <div className="animate-fade-in space-y-4">
      {pinned.length > 0 && rest.length > 0 ? (
        <>
          <section>
            <SectionLabel>Pinned</SectionLabel>
            {group(pinned)}
          </section>
          <section>
            <SectionLabel>Others</SectionLabel>
            {group(rest)}
          </section>
        </>
      ) : (
        group(notes)
      )}
    </div>
  )
}
