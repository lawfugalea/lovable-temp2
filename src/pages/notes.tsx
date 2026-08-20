import React, { useState } from 'react'
import { toast } from 'sonner'
import { FileText, Plus, Search } from 'lucide-react'
import ModernAppShell from '../components/ModernAppShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import NotesList from '../components/notes/NotesList'
import NoteEditorView from '../components/notes/NoteEditorView'
import ShareDialog from '../components/notes/ShareDialog'
import DeleteNoteDialog from '../components/notes/DeleteNoteDialog'
import { useNotes } from '../components/notes/useNotes'
import type { Note, NotesTab } from '../components/notes/types'

export default function NotesPage() {
  const {
    session,
    loading,
    error,
    filteredNotes,
    selectedNote,
    setSelectedNote,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    saveState,
    lastSaved,
    isNoteOwner,
    canEditNote,
    loadNotes,
    createNewNote,
    deleteNote,
    updateNote,
    updateNoteContent,
    setNoteCollaborators,
    clearError,
  } = useNotes()

  const [shareNote, setShareNote] = useState<Note | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)

  // Keep the share dialog in sync with optimistic note updates
  const shareNoteCurrent = shareNote
    ? filteredNotes.find(note => note.id === shareNote.id)
      ?? (selectedNote?.id === shareNote.id ? selectedNote : shareNote)
    : null

  const handleConfirmDelete = async (note: Note) => {
    try {
      await deleteNote(note.id)
    } catch (err) {
      console.error('Error deleting note:', err)
      toast.error('Failed to delete note. Please try again.')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (!session) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-foreground">Please sign in</h2>
            <p className="text-muted-foreground">You need to be signed in to view your notes.</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (error) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-destructive">Error</h2>
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button onClick={() => { clearError(); loadNotes() }}>Try Again</Button>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  const listProps = {
    notes: filteredNotes,
    loading,
    searchQuery,
    activeTab,
    isNoteOwner,
    canEditNote,
    onOpen: setSelectedNote,
    onUpdate: updateNote,
    onShare: setShareNote,
    onDelete: setDeleteTarget,
    onCreateNote: createNewNote,
  }

  const editor = selectedNote && (
    <NoteEditorView
      note={selectedNote}
      isOwner={isNoteOwner(selectedNote)}
      canEdit={canEditNote(selectedNote)}
      saveState={saveState}
      lastSaved={lastSaved}
      onBack={() => setSelectedNote(null)}
      onUpdate={updateNote}
      onContentUpdate={updateNoteContent}
      onShare={setShareNote}
      onDelete={setDeleteTarget}
    />
  )

  return (
    <ModernAppShell title="Notes">
      {/* At lg the panes own the scrolling, so the page itself must not add any. */}
      <div className="space-y-4 pb-12 lg:pb-0">
        <header className="rounded-xl border bg-card p-3 shadow-soft-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center justify-between gap-3 lg:w-56 lg:shrink-0">
              <h1 className="font-display text-xl font-bold tracking-tight">Notes</h1>
              <Button size="sm" data-tour="page-notes" onClick={createNewNote} className="lg:hidden">
                <Plus className="mr-1.5 h-4 w-4" />
                New
              </Button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search notes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotesTab)}>
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="shared">Shared</TabsTrigger>
                <TabsTrigger value="archived">Archive</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button data-tour="page-notes" onClick={createNewNote} className="hidden lg:inline-flex">
              <Plus className="mr-1.5 h-4 w-4" />
              New note
            </Button>
          </div>
        </header>

        {/* Below lg: browse, then the editor takes over. */}
        <div className="lg:hidden">
          {selectedNote ? editor : <NotesList variant="board" {...listProps} />}
        </div>

        {/* lg and up: the rail and the editor sit side by side, each scrolling on its own. */}
        <div className="hidden gap-4 lg:grid lg:h-[calc(100vh-15rem)] lg:grid-cols-[minmax(300px,22rem)_1fr]">
          <div className="min-h-0 overflow-y-auto pr-1">
            <NotesList variant="rail" selectedNoteId={selectedNote?.id ?? null} {...listProps} />
          </div>
          <div className="min-h-0">
            {editor ?? (
              <EmptyState
                className="h-full justify-center"
                icon={FileText}
                module="notes"
                title="Nothing open"
                description="Pick a note from the list, or start a new one."
                action={
                  <Button onClick={createNewNote}>
                    <Plus className="mr-2 h-4 w-4" />
                    New note
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <ShareDialog
        note={shareNoteCurrent}
        isOwner={shareNoteCurrent ? isNoteOwner(shareNoteCurrent) : false}
        onClose={() => setShareNote(null)}
        onToggleShared={(noteId, isShared) => updateNote(noteId, { isShared })}
        onCollaboratorsChange={setNoteCollaborators}
      />

      <DeleteNoteDialog
        note={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Floating mobile create button */}
      {!selectedNote && (
        <button
          onClick={createNewNote}
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft-lg transition-all duration-200 hover:scale-105 hover:bg-brand-purple active:scale-95 sm:hidden"
          title="Create new note"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </ModernAppShell>
  )
}
