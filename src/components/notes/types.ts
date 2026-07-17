export type NoteColor = 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray'

export type NoteRole = 'VIEWER' | 'EDITOR'

export interface NoteUserSummary {
  id: string
  name: string
  email: string
}

export interface NoteCollaborator {
  id: string
  role: NoteRole
  user: NoteUserSummary
  addedBy?: NoteUserSummary
}

export interface Note {
  id: string
  title: string
  content: string
  contentJson?: any
  contentText?: string
  isShared: boolean
  color: string
  isPinned: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  createdBy: NoteUserSummary
  collaborators: NoteCollaborator[]
  household?: {
    id: string
    name: string
  }
}

export type NotesTab = 'all' | 'personal' | 'shared' | 'archived'

export interface HouseholdMember {
  id: string
  role: string
  createdAt: string
  user: NoteUserSummary & { createdAt: string }
}
