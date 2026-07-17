import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Note, NoteCollaborator, NotesTab } from './types'
import { extractTextFromJson } from './note-utils'

interface NotesState {
  notes: Note[]
  loading: boolean
  error: string | null
}

type NotesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }

const notesReducer = (state: NotesState, action: NotesAction): NotesState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null }
    case 'SET_NOTES':
      return { ...state, notes: action.payload, loading: false, error: null }
    case 'ADD_NOTE':
      return { ...state, notes: [action.payload, ...state.notes], loading: false, error: null }
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(note =>
          note.id === action.payload.id ? action.payload : note
        ),
        loading: false,
        error: null
      }
    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter(note => note.id !== action.payload),
        loading: false,
        error: null
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    default:
      return state
  }
}

const initialState: NotesState = {
  notes: [],
  loading: true,
  error: null
}

export type SaveState = 'saved' | 'saving' | 'error'

export type NotePatch = Partial<Pick<Note,
  'title' | 'content' | 'contentJson' | 'contentText' | 'isShared' | 'isPinned' | 'isArchived' | 'color'
>>

export function useNotes() {
  const { data: session } = useSession()
  const [notesState, dispatch] = useReducer(notesReducer, initialState)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<NotesTab>('all')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const loadingRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const notesRef = useRef<Note[]>(notesState.notes)
  useEffect(() => {
    notesRef.current = notesState.notes
  }, [notesState.notes])

  const isNoteOwner = useCallback(
    (note: Note) => note.createdBy.id === session?.user?.id,
    [session?.user?.id]
  )
  const canEditNote = useCallback(
    (note: Note) => (
      isNoteOwner(note)
      || note.collaborators.some(collaborator =>
        collaborator.user.id === session?.user?.id && collaborator.role === 'EDITOR')
    ),
    [isNoteOwner, session?.user?.id]
  )

  const loadNotes = useCallback(async () => {
    if (loadingRef.current || !session?.user?.id) {
      return
    }

    loadingRef.current = true
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await fetch('/api/notes')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch notes')
      }

      const data = await response.json()

      // Backfill contentText and color for legacy notes
      const processedNotes = (data.notes || []).map((note: Note) => {
        if (!note.contentText && note.contentJson) {
          note.contentText = extractTextFromJson(note.contentJson)
            || note.content?.replace(/<[^>]*>/g, '') || ''
        } else if (!note.contentText) {
          note.contentText = note.content?.replace(/<[^>]*>/g, '') || ''
        }
        if (!note.color) {
          note.color = 'yellow'
        }
        return note
      })

      dispatch({ type: 'SET_NOTES', payload: processedNotes })
    } catch (error) {
      console.error('Error loading notes:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load notes' })
    } finally {
      loadingRef.current = false
    }
  }, [session?.user?.id])

  // Debounced save; keeps the timeout in a ref so rapid edits reuse one timer.
  const scheduleSave = useCallback((note: Note) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setSaveState('saving')

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: note.title,
            content: note.content,
            contentJson: note.contentJson,
            contentText: note.contentText,
            isShared: note.isShared,
            color: note.color,
            isPinned: note.isPinned,
            isArchived: note.isArchived
          })
        })

        if (!response.ok) throw new Error('Failed to save note')

        const data = await response.json()
        dispatch({ type: 'UPDATE_NOTE', payload: data.note })
        setSaveState('saved')
        setLastSaved(new Date())
      } catch (error) {
        console.error('Error auto-saving note:', error)
        setSaveState('error')
      }
    }, 800)
  }, [])

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  }, [])

  // Optimistically apply a patch to a note and schedule a save.
  const updateNote = useCallback((noteId: string, patch: NotePatch) => {
    const note = notesRef.current.find(n => n.id === noteId)
    if (!note || !canEditNote(note)) return

    const updatedNote: Note = { ...note, ...patch, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote })
    setSelectedNote(prev => (prev?.id === noteId ? updatedNote : prev))
    scheduleSave(updatedNote)
  }, [scheduleSave, canEditNote])

  // Rich text editor updates: keep contentText and legacy content in sync.
  const updateNoteContent = useCallback((noteId: string, contentJson: any, contentText: string) => {
    const extractedText = extractTextFromJson(contentJson) || contentText
    updateNote(noteId, {
      contentJson,
      contentText: extractedText,
      content: extractedText,
    })
  }, [updateNote])

  // Replace a note's collaborators locally (after ShareDialog changes).
  const setNoteCollaborators = useCallback((noteId: string, collaborators: NoteCollaborator[]) => {
    const note = notesRef.current.find(n => n.id === noteId)
    if (!note) return
    const updatedNote: Note = { ...note, collaborators }
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote })
    setSelectedNote(prev => (prev?.id === noteId ? updatedNote : prev))
  }, [])

  const createNewNote = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Note',
          content: '',
          contentJson: null,
          contentText: '',
          isShared: false,
          color: 'yellow'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create note')
      }

      const data = await response.json()
      dispatch({ type: 'ADD_NOTE', payload: data.note })
      setSelectedNote(data.note)
    } catch (error) {
      console.error('Error creating note:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create note' })
    }
  }, [session?.user?.id])

  const deleteNote = useCallback(async (noteId: string) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || 'Failed to delete note')
    }

    dispatch({ type: 'DELETE_NOTE', payload: noteId })
    setSelectedNote(prev => (prev?.id === noteId ? null : prev))
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  const filteredNotes = useMemo(() => {
    let filtered = notesState.notes

    if (activeTab === 'archived') {
      filtered = filtered.filter(note => note.isArchived)
    } else {
      filtered = filtered.filter(note => !note.isArchived)
      if (activeTab === 'personal') {
        filtered = filtered.filter(note => !note.isShared)
      } else if (activeTab === 'shared') {
        filtered = filtered.filter(note => note.isShared)
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        (note.contentText || note.content).toLowerCase().includes(query)
      )
    }

    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [notesState.notes, activeTab, searchQuery])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  return {
    session,
    notes: notesState.notes,
    loading: notesState.loading,
    error: notesState.error,
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
  }
}
