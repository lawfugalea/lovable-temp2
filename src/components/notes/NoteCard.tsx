import React from 'react'
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pin,
  PinOff,
  Share2,
  Trash2,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import ColorPicker from './ColorPicker'
import { formatDate, getContentTypeIndicator, getNoteColor, getSmartPreview } from './note-utils'
import type { Note, NoteColor } from './types'
import type { NotePatch } from './useNotes'

interface NoteCardProps {
  note: Note
  isOwner: boolean
  canEdit: boolean
  onOpen: (note: Note) => void
  onUpdate: (noteId: string, patch: NotePatch) => void
  onShare: (note: Note) => void
  onDelete: (note: Note) => void
}

const initials = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

export default function NoteCard({
  note,
  isOwner,
  canEdit,
  onOpen,
  onUpdate,
  onShare,
  onDelete,
}: NoteCardProps) {
  const indicator = getContentTypeIndicator(note)
  const colors = getNoteColor(note.color)
  const showMenu = canEdit || isOwner

  return (
    <div
      onClick={() => onOpen(note)}
      className={cn(
        'rounded-2xl border bg-card shadow-soft-sm group cursor-pointer border p-4 transition-all duration-200',
        'rounded-xl shadow-soft-sm hover:-translate-y-0.5 hover:shadow-soft',
        colors.card
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate font-medium text-foreground">
          {note.title || 'Untitled'}
        </h3>
        <div className="flex flex-shrink-0 items-center gap-1">
          {note.isPinned && <Pin className="h-3.5 w-3.5 text-primary" />}
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:data-[state=open]:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Note actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {canEdit && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })}
                    >
                      {note.isPinned ? (
                        <><PinOff className="mr-2 h-4 w-4" />Unpin</>
                      ) : (
                        <><Pin className="mr-2 h-4 w-4" />Pin</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdate(note.id, { isArchived: !note.isArchived })}
                    >
                      {note.isArchived ? (
                        <><ArchiveRestore className="mr-2 h-4 w-4" />Unarchive</>
                      ) : (
                        <><Archive className="mr-2 h-4 w-4" />Archive</>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                {isOwner && (
                  <DropdownMenuItem onClick={() => onShare(note)}>
                    <Share2 className="mr-2 h-4 w-4" />Share…
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Color
                    </DropdownMenuLabel>
                    <div className="px-2 pb-1.5">
                      <ColorPicker
                        size="sm"
                        value={note.color}
                        onChange={(color: NoteColor) => onUpdate(note.id, { color })}
                      />
                    </div>
                  </>
                )}
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(note)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mb-3">
        {indicator && (
          <div className="mb-1 flex items-center gap-1 text-xs text-primary">
            <indicator.icon className="h-3 w-3" />
            <span>{indicator.label}</span>
          </div>
        )}
        <div className="line-clamp-3 text-sm text-muted-foreground">
          {getSmartPreview(note)}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground/70">
        <div className="flex items-center gap-2">
          <span>by {note.createdBy.name}</span>
          {note.isShared && (
            <span className="flex items-center gap-1 text-primary">
              <Share2 className="h-3 w-3" />
              Shared
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {note.collaborators.length > 0 && (
            <div className="flex items-center -space-x-1.5" title={`${note.collaborators.length} collaborator${note.collaborators.length > 1 ? 's' : ''}`}>
              {note.collaborators.slice(0, 3).map((collaborator) => (
                <Avatar key={collaborator.id} className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[9px]">
                    {initials(collaborator.user.name || collaborator.user.email)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {note.collaborators.length > 3 && (
                <span className="flex items-center gap-0.5 pl-2 text-muted-foreground/70">
                  <Users className="h-3 w-3" />+{note.collaborators.length - 3}
                </span>
              )}
            </div>
          )}
          <span>{formatDate(note.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
