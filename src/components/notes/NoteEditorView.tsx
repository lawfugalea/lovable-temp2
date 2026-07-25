import React, { useCallback, useRef } from 'react'
import { ChevronLeft, Eye, Lock, Share2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
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
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Title, over the note's own colour wash. */}
      <div className={cn('flex items-start gap-2 px-4 py-3', getNoteColor(note.color).tint)}>
        {/* The rail is right there on desktop, so back is only useful below lg. */}
        <button
          onClick={onBack}
          className="mt-1.5 flex shrink-0 items-center gap-1 text-primary transition-colors hover:text-brand-purple lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <span className={cn('mt-3.5 h-2.5 w-2.5 shrink-0 rounded-full', getNoteColor(note.color).dot)} aria-hidden="true" />
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
          className="w-full resize-none border-0 bg-transparent font-display text-2xl font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none md:text-3xl"
        />
      </div>

      {/* One meta row: state on the left, everything you can do on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-y border-border bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saveState === 'saving' && (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-primary" />
              <span>Saving…</span>
            </>
          )}
          {saveState === 'saved' && lastSaved && (
            <>
              <div className="h-2 w-2 rounded-full bg-brand-green" />
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
          {!canEdit && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              View only
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <ColorPicker
            value={note.color}
            disabled={!canEdit}
            onChange={(color: NoteColor) => onUpdate(note.id, { color })}
          />
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
              aria-label="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Below lg the card sizes to content, so claim the viewport; at lg the pane bounds it.
          The editor scrolls internally, so this wrapper just gives it a box to fill. */}
      <div className="min-h-[60vh] flex-1 overflow-hidden p-3 md:p-4 lg:min-h-0">
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
    </Card>
  )
}
