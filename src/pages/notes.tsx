import React, { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import ModernAppShell from '../components/ModernAppShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import NotesSidebar from '../components/notes/NotesSidebar'
import NotesGrid from '../components/notes/NotesGrid'
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
      alert('Failed to delete note. Please try again.')
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

  return (
    <ModernAppShell title="Notes">
      <div className="flex h-screen bg-background">
        {/* Desktop sidebar */}
        <div className="hidden w-80 overflow-y-auto border-r border-border bg-card/60 md:block">
          <div className="p-4 pb-0">
            <h1 className="text-xl font-semibold text-foreground">Notes</h1>
          </div>
          <NotesSidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onCreateNote={createNewNote}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          {!selectedNote && (
            <div className="border-b border-border bg-card/60 p-4 md:hidden">
              <div className="mb-3 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Notes</h1>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotesTab)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="shared">Shared</TabsTrigger>
                  <TabsTrigger value="archived">Archive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {!selectedNote ? (
            <div className="flex-1 overflow-y-auto p-3 md:p-6">
              <NotesGrid
                notes={filteredNotes}
                loading={loading}
                searchQuery={searchQuery}
                activeTab={activeTab}
                isNoteOwner={isNoteOwner}
                canEditNote={canEditNote}
                onOpen={setSelectedNote}
                onUpdate={updateNote}
                onShare={setShareNote}
                onDelete={setDeleteTarget}
                onCreateNote={createNewNote}
              />
            </div>
          ) : (
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
          )}
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
