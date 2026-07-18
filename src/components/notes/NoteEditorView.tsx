import React, { useCallback, useRef } from 'react'
import { ChevronLeft, Eye, Lock, Share2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import ClientOnly from '@/components/ClientOnly'
import NoteEditor from './NoteEditor'
import ColorPicker from './ColorPicker'
import { getNoteColor } from './note-utils'
import type { Note, NoteColor } from './types'
import type { NotePatch, SaveState } from './useNotes'

interface NoteEditorViewProps {
  note: Note
  isOwner: boolean
  canEdit: boolean
  saveState: SaveState
  lastSaved: Date | null
  onBack: () => void
  onUpdate: (noteId: string, patch: NotePatch) => void
  onContentUpdate: (noteId: string, contentJson: any, contentText: string) => void
  onShare: (note: Note) => void
  onDelete: (note: Note) => void
}

export default function NoteEditorView({
  note,
  isOwner,
  canEdit,
  saveState,
  lastSaved,
  onBack,
  onUpdate,
  onContentUpdate,
  onShare,
  onDelete,
}: NoteEditorViewProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className={cn('flex items-center justify-between border-b border-border p-3 md:p-4', getNoteColor(note.color).accent)}>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-primary transition-colors hover:text-brand-purple md:gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden text-sm font-medium sm:inline">All Notes</span>
          <span className="text-sm font-medium sm:hidden">Back</span>
        </button>

        <div className="flex items-center gap-1.5 md:gap-2">
          {!canEdit && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              View only
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => onShare(note)}>
            {note.isShared ? (
              <Share2 className="h-4 w-4 text-primary" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">
              {note.isShared ? 'Shared' : 'Private'}
            </span>
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(note)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Delete</span>
            </Button>
          )}
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="sm" className="font-medium text-primary" onClick={onBack}>
            Done
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="border-b border-border p-3 md:p-4">
        <textarea
          ref={titleRef}
          value={note.title}
          readOnly={!canEdit}
          onChange={(e) => {
            onUpdate(note.id, { title: e.target.value })
            autoResize(e.target)
          }}
          placeholder="Title"
          rows={1}
          className="w-full resize-none border-0 bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none md:text-3xl"
          style={{ minHeight: '40px' }}
        />
      </div>

      {/* Save state + controls */}
      <div className="border-b border-border bg-muted/30 px-3 py-2 md:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saveState === 'saving' && (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-primary" />
                <span>Saving…</span>
              </>
            )}
            {saveState === 'saved' && lastSaved && (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>
                  Saved · {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
            {saveState === 'error' && (
              <>
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span>Save failed</span>
              </>
            )}
          </div>

          <ColorPicker
            value={note.color}
            disabled={!canEdit}
            onChange={(color: NoteColor) => onUpdate(note.id, { color })}
          />
        </div>
      </div>

      {/* Content editor */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <ClientOnly
          fallback={
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-muted/30">
              <div className="text-muted-foreground">Loading editor…</div>
            </div>
          }
        >
          <NoteEditor
            key={note.id}
            noteId={note.id}
            content={note.contentJson || note.content}
            onUpdate={(contentJson, contentText) => onContentUpdate(note.id, contentJson, contentText)}
            placeholder="Start writing your note…"
            editable={canEdit}
            className="h-full"
          />
        </ClientOnly>
      </div>
    </div>
  )
}
