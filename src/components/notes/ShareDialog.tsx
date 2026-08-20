import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Crown, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/Label'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useHouseholdId } from '@/lib/useHouseholdId'
import type { HouseholdMember, Note, NoteCollaborator, NoteRole } from './types'

interface ShareDialogProps {
  note: Note | null
  isOwner: boolean
  onClose: () => void
  onToggleShared: (noteId: string, isShared: boolean) => void
  onCollaboratorsChange: (noteId: string, collaborators: NoteCollaborator[]) => void
}

const initials = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

const ROLE_LABELS: Record<NoteRole, string> = {
  VIEWER: 'Viewer',
  EDITOR: 'Editor',
}

export default function ShareDialog({
  note,
  isOwner,
  onClose,
  onToggleShared,
  onCollaboratorsChange,
}: ShareDialogProps) {
  const { householdId: activeHouseholdId } = useHouseholdId()
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([])
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const householdId = note?.household?.id || activeHouseholdId
  const noteId = note?.id

  useEffect(() => {
    if (!noteId) return
    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        const requests: [Promise<Response>, Promise<Response> | null] = [
          fetch(`/api/notes/${noteId}/collaborators`),
          householdId ? fetch(`/api/household/members?householdId=${householdId}`) : null,
        ]
        const [collabRes, membersRes] = await Promise.all(requests)

        if (collabRes.ok) {
          const data = await collabRes.json()
          if (!cancelled) setCollaborators(data.collaborators || [])
        }
        if (membersRes?.ok) {
          const data = await membersRes.json()
          if (!cancelled) setMembers(data.members || [])
        }
      } catch (error) {
        console.error('Error loading share info:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [noteId, householdId])

  const availableMembers = useMemo(() => {
    if (!note) return []
    return members.filter(member =>
      member.user.id !== note.createdBy.id &&
      !collaborators.some(collaborator => collaborator.user.id === member.user.id)
    )
  }, [members, collaborators, note])

  const syncCollaborators = useCallback((next: NoteCollaborator[]) => {
    setCollaborators(next)
    if (noteId) onCollaboratorsChange(noteId, next)
  }, [noteId, onCollaboratorsChange])

  const addOrUpdateCollaborator = useCallback(async (userId: string, role: NoteRole) => {
    if (!noteId) return
    setPendingUserId(userId)
    try {
      const response = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update collaborator')
      }
      const next = [
        ...collaborators.filter(collaborator => collaborator.user.id !== userId),
        data.collaborator as NoteCollaborator,
      ]
      syncCollaborators(next)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update collaborator')
    } finally {
      setPendingUserId(null)
    }
  }, [noteId, collaborators, syncCollaborators])

  const removeCollaborator = useCallback(async (userId: string) => {
    if (!noteId) return
    setPendingUserId(userId)
    try {
      const response = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to remove collaborator')
      }
      syncCollaborators(collaborators.filter(collaborator => collaborator.user.id !== userId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove collaborator')
    } finally {
      setPendingUserId(null)
    }
  }, [noteId, collaborators, syncCollaborators])

  if (!note) return null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share note</DialogTitle>
          <DialogDescription>
            Share &ldquo;{note.title || 'Untitled'}&rdquo; with your household and manage collaborators.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div>
            <Label htmlFor="share-toggle" className="font-medium">
              Share with household
            </Label>
            <p className="text-xs text-muted-foreground">
              Household members can see this note.
            </p>
          </div>
          <Switch
            id="share-toggle"
            checked={note.isShared}
            disabled={!isOwner}
            onCheckedChange={(checked) => onToggleShared(note.id, checked)}
          />
        </div>

        <div className={note.isShared ? '' : 'pointer-events-none opacity-50'}>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Collaborators</h4>
            {isOwner && note.isShared && availableMembers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableMembers.map(member => (
                    <DropdownMenuItem
                      key={member.user.id}
                      onClick={() => addOrUpdateCollaborator(member.user.id, 'VIEWER')}
                    >
                      <Avatar className="mr-2 h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {initials(member.user.name || member.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{member.user.name || member.user.email}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {!note.isShared && (
            <p className="mb-2 text-xs text-muted-foreground">
              Share the note with your household to add collaborators.
            </p>
          )}

          <div className="space-y-2">
            {/* Owner row */}
            <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {initials(note.createdBy.name || note.createdBy.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{note.createdBy.name || note.createdBy.email}</p>
                <p className="truncate text-xs text-muted-foreground">{note.createdBy.email}</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" />
                Owner
              </Badge>
            </div>

            {loading && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading collaborators…
              </div>
            )}

            {!loading && collaborators.map(collaborator => (
              <div key={collaborator.user.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {initials(collaborator.user.name || collaborator.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {collaborator.user.name || collaborator.user.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{collaborator.user.email}</p>
                </div>
                {isOwner ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingUserId === collaborator.user.id}
                        >
                          {ROLE_LABELS[collaborator.role]}
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(Object.keys(ROLE_LABELS) as NoteRole[]).map(role => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => role !== collaborator.role && addOrUpdateCollaborator(collaborator.user.id, role)}
                          >
                            {ROLE_LABELS[role]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={pendingUserId === collaborator.user.id}
                      onClick={() => removeCollaborator(collaborator.user.id)}
                      aria-label={`Remove ${collaborator.user.name || collaborator.user.email}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Badge variant="secondary">{ROLE_LABELS[collaborator.role]}</Badge>
                )}
              </div>
            ))}

            {!loading && note.isShared && collaborators.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No collaborators yet. Everyone in the household can view; add someone to let them edit.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
