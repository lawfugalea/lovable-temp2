import React, { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Button } from '../components/ui/Button'
import { 
  Plus, 
  FileText, 
  Trash2,
  Search,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Share2,
  Users,
  Edit3,
  Eye,
  Palette,
  MoreVertical,
  X,
  Save,
  Lock,
  Unlock
} from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  isShared: boolean
  color: string
  isPinned: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  collaborators: Array<{
    id: string
    role: 'VIEWER' | 'EDITOR'
    user: {
      id: string
      name: string
      email: string
    }
  }>
  household?: {
    id: string
    name: string
  }
}

interface NotesState {
  notes: Note[]
  loading: boolean
  error: string | null
}

// Action types for reducer
type NotesAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }

// Reducer function
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

export default function NotesPage() {
  const { data: session, status } = useSession()
  const [householdId, setHouseholdId] = useState<string>('')
  const [notesState, dispatch] = useReducer(notesReducer, {
    notes: [],
    loading: true,
    error: null
  })
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'shared'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const [householdMembers, setHouseholdMembers] = useState<any[]>([])
  const loadingRef = useRef(false)

  // Get household ID and members
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/household/active')
        .then(res => res.json())
        .then(data => {
          if (data.householdId) {
            setHouseholdId(data.householdId)
            // Load household members for sharing
            fetch(`/api/household/members?householdId=${data.householdId}`)
              .then(res => res.json())
              .then(membersData => {
                if (membersData.members) {
                  setHouseholdMembers(membersData.members)
                }
              })
              .catch(console.error)
          }
        })
        .catch(console.error)
    }
  }, [status])

  // Load notes
  useEffect(() => {
    if (status === 'authenticated') {
      loadNotes()
    }
  }, [status, householdId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            setIsCreating(true)
            break
          case 'k':
            e.preventDefault()
            // Focus search
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
            searchInput?.focus()
            break
          case 's':
            if (editingNote) {
              e.preventDefault()
              // Save current note
              console.log('Save shortcut triggered')
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingNote])

  const loadNotes = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current) {
      console.log('Already loading notes, skipping...')
      return
    }

    try {
      loadingRef.current = true
      console.log('Loading notes...', { householdId, activeTab })
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Always load all notes (no type filter) and filter locally
      const params = new URLSearchParams()
      if (householdId) params.append('householdId', householdId)
      
      const url = `/api/notes?${params}`
      console.log('Fetching from:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('API response:', { ok: response.ok, data })
      
      if (response.ok) {
        // Ensure we have the right data structure
        const notesArray = Array.isArray(data.notes) ? data.notes : []
        dispatch({ type: 'SET_NOTES', payload: notesArray })
      } else {
        console.log('API error:', data.error)
        dispatch({ type: 'SET_ERROR', payload: data.error })
      }
    } catch (error) {
      console.error('Error loading notes:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load notes' })
    } finally {
      loadingRef.current = false
    }
  }, [householdId, activeTab])

  const createNote = async (noteData: Partial<Note>) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteData.title || 'Untitled Note',
          content: noteData.content || 'No content',
          isShared: noteData.isShared || false,
          color: noteData.color || 'yellow',
          householdId: noteData.isShared ? householdId : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        dispatch({ type: 'ADD_NOTE', payload: data.note })
        setIsCreating(false)
      } else {
        const errorData = await response.json()
        console.error('Error creating note:', errorData.error)
        dispatch({ type: 'SET_ERROR', payload: errorData.error || 'Failed to create note' })
      }
    } catch (error) {
      console.error('Error creating note:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create note' })
    }
  }

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        
        dispatch({ type: 'UPDATE_NOTE', payload: data.note })
        // Don't set editingNote - let the form close after saving
      }
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        dispatch({ type: 'DELETE_NOTE', payload: noteId })
        if (editingNote?.id === noteId) {
          setEditingNote(null)
        }
        if (selectedNote?.id === noteId) {
          setSelectedNote(null)
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const addCollaborator = async (noteId: string, userId: string, role: 'VIEWER' | 'EDITOR') => {
    try {
      const response = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      })

      if (response.ok) {
        // Reload the note to get updated collaborators
        const noteResponse = await fetch(`/api/notes/${noteId}`)
        if (noteResponse.ok) {
          const noteData = await noteResponse.json()
          dispatch({ type: 'UPDATE_NOTE', payload: noteData.note })
          // Update editingNote if it's the same note being edited
          if (editingNote?.id === noteId) {
            setEditingNote(noteData.note)
          }
        }
      }
    } catch (error) {
      console.error('Error adding collaborator:', error)
    }
  }

  const removeCollaborator = async (noteId: string, userId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        // Reload the note to get updated collaborators
        const noteResponse = await fetch(`/api/notes/${noteId}`)
        if (noteResponse.ok) {
          const noteData = await noteResponse.json()
          dispatch({ type: 'UPDATE_NOTE', payload: noteData.note })
          // Update editingNote if it's the same note being edited
          if (editingNote?.id === noteId) {
            setEditingNote(noteData.note)
          }
        }
      }
    } catch (error) {
      console.error('Error removing collaborator:', error)
    }
  }

  const filteredNotes = useMemo(() => {
    return notesState.notes.filter(note => {
      // Filter by tab first
      if (activeTab === 'personal' && note.isShared) return false
      if (activeTab === 'shared' && !note.isShared) return false
      
      // Then filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return note.title.toLowerCase().includes(query) || 
               note.content.toLowerCase().includes(query)
      }
      return true
    })
  }, [notesState.notes, activeTab, searchQuery])

  // Performance monitoring
  const performanceMetrics = useMemo(() => ({
    totalNotes: notesState.notes.length,
    filteredNotes: filteredNotes.length,
    personalNotes: notesState.notes.filter(n => !n.isShared).length,
    sharedNotes: notesState.notes.filter(n => n.isShared).length,
    loading: notesState.loading,
    hasError: !!notesState.error
  }), [notesState, filteredNotes])

  // Debug logging
  console.log('Notes loaded:', notesState.notes.length, 'Filtered:', filteredNotes.length)

  const getNoteColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      yellow: '!bg-yellow-100 !border-yellow-200',
      pink: '!bg-pink-100 !border-pink-200',
      blue: '!bg-blue-100 !border-blue-200',
      green: '!bg-green-100 !border-green-200',
      purple: '!bg-purple-100 !border-purple-200',
      orange: '!bg-orange-100 !border-orange-200',
      red: '!bg-red-100 !border-red-200',
      indigo: '!bg-indigo-100 !border-indigo-200'
    }
    return colorMap[color] || colorMap.yellow
  }


  const NoteCard = ({ note }: { note: Note }) => (
    <div 
      className={`cozy-card p-4 cursor-pointer transition-all duration-200 hover:shadow-cozy-md hover:scale-105 ${getNoteColorClasses(note.color)} ${
        note.isPinned ? 'ring-2 ring-cozy-primary ring-opacity-50' : ''
      }`}
      onClick={() => setEditingNote(note)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-cozy-text truncate flex-1">
          {note.title}
        </h3>
        <div className="flex items-center gap-1 ml-2">
          {note.isPinned && <Pin className="w-4 h-4 text-cozy-primary" />}
          {note.isShared && <Share2 className="w-4 h-4 text-cozy-primary" />}
          {note.isArchived && <Archive className="w-4 h-4 text-cozy-text-muted" />}
        </div>
      </div>
      
      <div className="text-sm text-cozy-text-muted mb-3 line-clamp-3">
        {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}
        {note.content.length > 100 && '...'}
      </div>
      
      <div className="flex items-center justify-between text-xs text-cozy-text-soft">
        <span>by {note.createdBy.name}</span>
        <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  )



  const NoteEditor = ({ note, onSave, onCancel }: {
    note?: Note
    onSave: (data: Partial<Note>) => void
    onCancel: () => void
  }) => {
    const [title, setTitle] = useState(note?.title || '')
    const [content, setContent] = useState(note?.content || '')
    const [color, setColor] = useState(note?.color || 'yellow')
    const [isShared, setIsShared] = useState(note?.isShared || false)
    const [isPinned, setIsPinned] = useState(note?.isPinned || false)
    const [showCollaboratorModal, setShowCollaboratorModal] = useState(false)
    const contentRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
      if (contentRef.current) {
        contentRef.current.focus()
      }
    }, [])

    // Simple keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key) {
            case 's':
              e.preventDefault()
              handleSave()
              break
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Reset form when note changes (for new notes)
    useEffect(() => {
      if (!note) {
        setTitle('')
        setContent('')
        setColor('yellow')
        setIsShared(false)
        setIsPinned(false)
      }
    }, [note])

    const handleSave = () => {
      const trimmedTitle = title.trim() || 'Untitled Note'
      const trimmedContent = content.trim() || 'No content'
      
      onSave({
        title: trimmedTitle,
        content: trimmedContent,
        color,
        isShared,
        isPinned
      })
    }

    const colors = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange', 'red', 'indigo']

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-cozy-surface rounded-cozy-lg shadow-cozy-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-cozy-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-cozy-text">
                {note ? 'Edit Note' : 'New Note'}
              </h2>
              <button
                onClick={onCancel}
                className="text-cozy-text-muted hover:text-cozy-text"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full p-3 border border-cozy-gray-200 rounded-cozy bg-cozy-surface text-cozy-text placeholder-cozy-text-muted focus:outline-none focus:ring-2 focus:ring-cozy-primary"
            />
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your note..."
              className="w-full h-64 p-3 border border-cozy-gray-200 rounded-cozy bg-cozy-surface text-cozy-text placeholder-cozy-text-muted focus:outline-none focus:ring-2 focus:ring-cozy-primary resize-none"
              style={{ minHeight: '200px' }}
            />
          </div>

          <div className="p-6 border-t border-cozy-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-cozy text-sm transition-colors ${
                    isPinned 
                      ? 'bg-cozy-primary text-cozy-surface' 
                      : 'bg-cozy-gray-100 text-cozy-text hover:bg-cozy-gray-200'
                  }`}
                >
                  {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                  {isPinned ? 'Pinned' : 'Pin'}
                </button>

                <button
                  onClick={() => setIsShared(!isShared)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-cozy text-sm transition-colors ${
                    isShared 
                      ? 'bg-cozy-primary text-cozy-surface' 
                      : 'bg-cozy-gray-100 text-cozy-text hover:bg-cozy-gray-200'
                  }`}
                >
                  {isShared ? <Share2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isShared ? 'Shared' : 'Personal'}
                </button>

                {note && note.isShared && (
                  <button
                    onClick={() => setShowCollaboratorModal(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-cozy text-sm bg-cozy-gray-100 text-cozy-text hover:bg-cozy-gray-200 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Manage ({note.collaborators.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      color === c ? 'border-cozy-text' : 'border-cozy-gray-300'
                    } ${getNoteColorClasses(c).split(' ')[0]}`}
                    title={`Set color to ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                className="bg-cozy-surface border-cozy-gray-200 text-cozy-text hover:bg-cozy-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-cozy-primary hover:bg-cozy-primary-deep text-cozy-surface"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Note
              </Button>
            </div>
          </div>
        </div>

        {/* Collaborator Management Modal */}
        {showCollaboratorModal && note && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-cozy-surface rounded-cozy-lg shadow-cozy-lg w-full max-w-md">
              <div className="p-6 border-b border-cozy-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-cozy-text">Manage Collaborators</h3>
                  <button
                    onClick={() => setShowCollaboratorModal(false)}
                    className="text-cozy-text-muted hover:text-cozy-text"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-cozy-text">Current Collaborators</h4>
                  {note.collaborators.map((collab) => (
                    <div key={collab.id} className="flex items-center justify-between p-3 bg-cozy-gray-100 rounded-cozy">
                      <div>
                        <div className="font-medium text-cozy-text">{collab.user.name}</div>
                        <div className="text-sm text-cozy-text-muted">{collab.role}</div>
                      </div>
                      <button
                        onClick={() => removeCollaborator(note.id, collab.user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="border-t border-cozy-gray-200 pt-4">
                    <h4 className="font-medium text-cozy-text mb-3">Add Collaborator</h4>
                    <div className="space-y-2">
                      {householdMembers
                        .filter(member => 
                          member.user.id !== note.createdBy.id && 
                          !note.collaborators.some(c => c.user.id === member.user.id)
                        )
                        .map((member) => (
                          <div key={member.user.id} className="flex items-center justify-between p-2 border border-cozy-gray-200 rounded-cozy">
                            <span className="text-cozy-text">{member.user.name}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => addCollaborator(note.id, member.user.id, 'VIEWER')}
                                className="px-2 py-1 text-xs bg-cozy-gray-100 text-cozy-text rounded hover:bg-cozy-gray-200"
                              >
                                Viewer
                              </button>
                              <button
                                onClick={() => addCollaborator(note.id, member.user.id, 'EDITOR')}
                                className="px-2 py-1 text-xs bg-cozy-primary text-cozy-surface rounded hover:bg-cozy-primary-deep"
                              >
                                Editor
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (status === 'loading' || notesState.loading) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your notes...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Authentication Required</h2>
            <p className="text-cozy-text-muted mb-4">
              You need to be logged in to access your notes.
            </p>
            <Button 
              onClick={() => window.location.href = '/api/auth/signin'}
              className="bg-cozy-primary hover:bg-cozy-primary/90 text-white"
            >
              Sign In to Continue
            </Button>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Notes">
      <div className="min-h-screen bg-cozy-bg">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cozy-primary rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-normal text-cozy-text">Notes</h1>
            </div>
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-cozy-primary hover:bg-cozy-primary-deep text-cozy-surface"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>

          {/* Search and Tabs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-cozy-text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-cozy-gray-200 rounded-cozy bg-cozy-surface text-sm placeholder-cozy-text-muted focus:outline-none focus:ring-2 focus:ring-cozy-primary focus:border-transparent"
              />
            </div>
            
            <div className="flex bg-cozy-gray-100 rounded-cozy p-1">
              {[
                { key: 'all', label: 'All Notes' },
                { key: 'personal', label: 'Personal' },
                { key: 'shared', label: 'Shared' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-cozy text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-cozy-primary text-cozy-surface'
                      : 'text-cozy-text-muted hover:text-cozy-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
          </div>

          {/* Error Display */}
          {notesState.error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-cozy">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-700 font-medium">Error loading notes</p>
                  <p className="text-red-600 text-sm mt-1">{notesState.error}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadNotes()}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes Grid */}
          <div className="min-h-[400px]">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-normal text-cozy-text mb-2">
                  {searchQuery ? 'No notes found' : 'No notes yet'}
                </h3>
                <p className="text-cozy-text-muted mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'Start by creating your first note!'
                  }
                </p>
                {!searchQuery && (
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => setIsCreating(true)}
                      className="bg-cozy-primary hover:bg-cozy-primary-deep text-cozy-surface"
                      title="Create new note (Ctrl+N)"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Note
                    </Button>
                    
                    
                    {/* Keyboard shortcuts help */}
                    <div className="text-xs text-cozy-text-muted">
                      <span className="hidden sm:inline">Shortcuts: </span>
                      <kbd className="px-1 py-0.5 bg-cozy-gray-100 rounded text-xs">Ctrl+N</kbd> New
                      <kbd className="px-1 py-0.5 bg-cozy-gray-100 rounded text-xs ml-1">Ctrl+K</kbd> Search
                      <kbd className="px-1 py-0.5 bg-cozy-gray-100 rounded text-xs ml-1">Ctrl+S</kbd> Save
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredNotes.map((note) => (
                  <NoteCard key={`${note.id}-${note.color}-${note.updatedAt}`} note={note} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Note Editor Modal */}
      {isCreating && (
        <NoteEditor
          onSave={createNote}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {editingNote && (
        <NoteEditor
          note={editingNote}
          onSave={(data) => {
            updateNote(editingNote.id, data)
            setEditingNote(null)
          }}
          onCancel={() => setEditingNote(null)}
        />
      )}


      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-cozy-surface rounded-cozy-lg shadow-cozy-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-cozy-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getNoteColorClasses(selectedNote.color).split(' ')[0]}`} />
                  <h2 className="text-xl font-semibold text-cozy-text">{selectedNote.title}</h2>
                  {selectedNote.isPinned && <Pin className="w-5 h-5 text-cozy-primary" />}
                  {selectedNote.isShared && <Share2 className="w-5 h-5 text-cozy-primary" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="text-cozy-text-muted hover:text-cozy-text"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div 
                className="prose prose-cozy max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedNote.content }}
              />
            </div>

            <div className="p-6 border-t border-cozy-gray-200">
              <div className="flex items-center justify-between text-sm text-cozy-text-muted">
                <div className="flex items-center gap-4">
                  <span>Created by {selectedNote.createdBy.name}</span>
                  <span>Updated {new Date(selectedNote.updatedAt).toLocaleDateString()}</span>
                  {selectedNote.household && (
                    <span>Shared in {selectedNote.household.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedNote.collaborators.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{selectedNote.collaborators.length} collaborator{selectedNote.collaborators.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModernAppShell>
  )
}
