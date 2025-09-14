import React, { useState, useEffect, useCallback, useMemo, useReducer } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import ModernAppShell from '../../components/ModernAppShell'
import { Button } from '../../components/ui/Button'
import { 
  Plus, 
  Search,
  Filter,
  Grid3X3,
  List,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Share2,
  Lock,
  Trash2,
  Palette,
  MoreVertical,
  CheckSquare,
  Square,
  Users,
  Eye,
  Edit3,
  Calendar,
  Clock,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Type,
  List as ListIcon
} from 'lucide-react'
// import { generateCollabDocId } from '../../lib/collaboration' // Temporarily disabled

interface Note {
  id: string
  title: string
  content: string
  contentJson?: any
  contentText?: string
  isShared: boolean
  color: string
  isPinned: boolean
  isArchived: boolean
  collabDocId?: string
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

export default function NotesIndexPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [notesState, dispatch] = useReducer(notesReducer, initialState)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'personal' | 'shared' | 'pinned' | 'archived'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; noteId: string | null; noteTitle: string }>({
    show: false,
    noteId: null,
    noteTitle: ''
  })

  // Load notes
  const loadNotes = useCallback(async () => {
    if (!session?.user?.id) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await fetch('/api/notes')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch notes')
      }
      
      const data = await response.json()
      
      // Ensure all notes have proper contentText and color
      const processedNotes = (data.notes || []).map((note: any) => {
        if (!note.contentText && note.contentJson) {
          const extractedText = extractTextFromJson(note.contentJson)
          note.contentText = extractedText || note.content?.replace(/<[^>]*>/g, '') || ''
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
    }
  }, [session?.user?.id])

  // Check if current user can edit a note
  const canEditNote = useCallback((note: Note): boolean => {
    if (!session?.user?.id) return false
    
    // Owner can always edit
    if (note.createdBy.id === session.user.id) return true
    
    // If note is shared, all household members can edit it
    if (note.isShared && note.household) {
      return true
    }
    
    // Check if user is a collaborator with EDITOR role
    const userCollaboration = note.collaborators.find(
      collab => collab.user.id === session.user.id && collab.role === 'EDITOR'
    )
    
    return !!userCollaboration
  }, [session?.user?.id])

  // Create new note
  const createNewNote = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      // Get household ID for potential sharing
      let householdId = null
      try {
        const householdRes = await fetch('/api/household/active')
        const householdData = await householdRes.json()
        if (householdData.householdId) {
          householdId = householdData.householdId
        }
      } catch (error) {
        console.error('Failed to get household ID for new note:', error)
      }

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Note',
          content: '',
          contentJson: null,
          contentText: '',
          isShared: false,
          color: 'yellow',
          householdId: householdId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create note')
      }
      
      const data = await response.json()
      dispatch({ type: 'ADD_NOTE', payload: data.note })
      
      // Navigate to the note editor
      router.push(`/notes/${data.note.id}`)
    } catch (error) {
      console.error('Error creating note:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create note' })
    }
  }, [session?.user?.id, router])

  // Handle note updates
  const handleNoteUpdate = useCallback(async (noteId: string, field: string, value: any) => {
    const note = notesState.notes.find(n => n.id === noteId)
    if (!note || !canEditNote(note)) return

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update note')
      }
      
      const data = await response.json()
      dispatch({ type: 'UPDATE_NOTE', payload: data.note })
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }, [notesState.notes, canEditNote])

  // Handle note deletion
  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete note')
      }

      dispatch({ type: 'DELETE_NOTE', payload: noteId })
      setDeleteConfirm({ show: false, noteId: null, noteTitle: '' })
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note. Please try again.')
    }
  }, [])

  // Extract text from TipTap JSON content
  const extractTextFromJson = useCallback((contentJson: any): string => {
    if (!contentJson || !contentJson.content) return ''
    
    const extractText = (node: any): string => {
      if (!node) return ''
      
      if (node.type === 'text') {
        return node.text || ''
      }
      
      if (node.type === 'taskItem') {
        const checkbox = node.attrs?.checked ? '☑' : '☐'
        const text = node.content ? node.content.map(extractText).join('') : ''
        return `${checkbox} ${text}`
      }
      
      if (node.type === 'taskList') {
        return node.content ? node.content.map(extractText).join('\n') : ''
      }
      
      if (node.type === 'bulletList' || node.type === 'orderedList') {
        return node.content ? node.content.map(extractText).join('\n') : ''
      }
      
      if (node.type === 'listItem') {
        return node.content ? node.content.map(extractText).join('') : ''
      }
      
      if (node.type === 'paragraph') {
        const text = node.content ? node.content.map(extractText).join('') : ''
        return text ? `${text}\n` : '\n'
      }
      
      if (node.type === 'heading') {
        const text = node.content ? node.content.map(extractText).join('') : ''
        return text ? `${text}\n` : '\n'
      }
      
      if (node.type === 'blockquote') {
        const text = node.content ? node.content.map(extractText).join('') : ''
        return text ? `> ${text}\n` : '\n'
      }
      
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('')
      }
      
      return ''
    }
    
    return contentJson.content.map(extractText).join('').trim()
  }, [])

  // Get content type indicator for note cards
  const getContentTypeIndicator = useCallback((note: Note): React.ReactNode | null => {
    const content = note.contentText || note.content?.replace(/<[^>]*>/g, '') || ''
    
    if (content.includes('☑') || content.includes('☐')) {
      const checkedCount = (content.match(/☑/g) || []).length
      const totalCount = (content.match(/[☑☐]/g) || []).length
      return (
        <div className="flex items-center gap-1 text-xs text-cozy-primary">
          <CheckSquare className="w-3 h-3" />
          <span>{checkedCount}/{totalCount}</span>
        </div>
      )
    }
    
    if (content.includes('•') || /^\d+\./.test(content)) {
      const listCount = content.split('\n').filter(line => 
        line.trim().startsWith('•') || /^\d+\./.test(line.trim())
      ).length
      return (
        <div className="flex items-center gap-1 text-xs text-cozy-sage">
          <ListIcon className="w-3 h-3" />
          <span>{listCount} items</span>
        </div>
      )
    }
    
    if (content.includes('#')) {
      const headingCount = (content.match(/^#+\s/gm) || []).length
      return (
        <div className="flex items-center gap-1 text-xs text-cozy-terracotta">
          <Type className="w-3 h-3" />
          <span>{headingCount} headings</span>
        </div>
      )
    }
    
    // Check for rich content in JSON
    if (note.contentJson) {
      const hasImages = JSON.stringify(note.contentJson).includes('"type":"image"')
      const hasLinks = JSON.stringify(note.contentJson).includes('"type":"link"')
      
      if (hasImages) {
        return (
          <div className="flex items-center gap-1 text-xs text-cozy-terracotta">
            <ImageIcon className="w-3 h-3" />
            <span>Images</span>
          </div>
        )
      }
      
      if (hasLinks) {
        return (
          <div className="flex items-center gap-1 text-xs text-cozy-primary">
            <LinkIcon className="w-3 h-3" />
            <span>Links</span>
          </div>
        )
      }
    }
    
    return null
  }, [])

  // Generate smart preview for note cards
  const getSmartPreview = useCallback((note: Note): string => {
    const content = note.contentText || note.content?.replace(/<[^>]*>/g, '') || ''
    
    if (!content.trim()) {
      return 'Empty note'
    }

    // Check if it's a checklist
    if (content.includes('☑') || content.includes('☐')) {
      const checklistItems = content.split('\n').filter(line => 
        line.includes('☑') || line.includes('☐')
      ).slice(0, 3)
      
      if (checklistItems.length > 0) {
        const preview = checklistItems.join(' • ')
        return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
      }
    }

    // Check if it's a list
    if (content.includes('•') || /^\d+\./.test(content)) {
      const listItems = content.split('\n').filter(line => 
        line.trim().startsWith('•') || /^\d+\./.test(line.trim())
      ).slice(0, 2)
      
      if (listItems.length > 0) {
        const preview = listItems.join(' • ')
        return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
      }
    }

    // Check if it has headings
    const lines = content.split('\n').filter(line => line.trim())
    const firstHeading = lines.find(line => 
      line.startsWith('#') || 
      (line.length < 50 && line.length > 3 && !line.includes('.'))
    )
    
    if (firstHeading) {
      const headingText = firstHeading.replace(/^#+\s*/, '')
      const remainingText = content.replace(firstHeading, '').trim()
      const preview = remainingText.length > 0 
        ? `${headingText}: ${remainingText.substring(0, 60)}`
        : headingText
      return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
    }

    // Regular text preview
    const cleanText = content.replace(/\n+/g, ' ').trim()
    if (cleanText.length <= 100) {
      return cleanText
    }

    let preview = cleanText.substring(0, 100)
    const lastPeriod = preview.lastIndexOf('.')
    const lastSpace = preview.lastIndexOf(' ')
    
    if (lastPeriod > 60) {
      preview = cleanText.substring(0, lastPeriod + 1)
    } else if (lastSpace > 60) {
      preview = cleanText.substring(0, lastSpace)
    }
    
    return preview + '...'
  }, [])

  // Get color classes for note cards
  const getColorClasses = useCallback((color: string) => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
      case 'sage':
        return 'bg-green-50 border-green-200 hover:bg-green-100'
      case 'coral':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100'
      case 'terracotta':
        return 'bg-red-50 border-red-200 hover:bg-red-100'
      case 'cream':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100'
      case 'sand':
        return 'bg-stone-50 border-stone-200 hover:bg-stone-100'
      case 'warm-gray':
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      case 'soft-blue':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      case 'lavender':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100'
      case 'pink':
        return 'bg-pink-50 border-pink-200 hover:bg-pink-100'
      case 'emerald':
        return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
      case 'indigo':
        return 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
      case 'default':
        return 'bg-cozy-surface border-cozy-gray-200 hover:bg-cozy-gray-100'
      // Legacy color support
      case 'green':
        return 'bg-green-50 border-green-200 hover:bg-green-100'
      case 'blue':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      case 'purple':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100'
      case 'gray':
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      default:
        return 'bg-cozy-surface border-cozy-gray-200 hover:bg-cozy-gray-100'
    }
  }, [])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let filtered = notesState.notes

    // Filter by active filter
    switch (activeFilter) {
      case 'personal':
        filtered = filtered.filter(note => !note.isShared)
        break
      case 'shared':
        filtered = filtered.filter(note => note.isShared)
        break
      case 'pinned':
        filtered = filtered.filter(note => note.isPinned)
        break
      case 'archived':
        filtered = filtered.filter(note => note.isArchived)
        break
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        (note.contentText || note.content).toLowerCase().includes(query)
      )
    }

    // Sort by pinned first, then by updated date
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [notesState.notes, activeFilter, searchQuery])

  // Format date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }, [])

  // Load notes on mount
  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  if (!session) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Please sign in</h2>
            <p className="text-cozy-text-muted">You need to be signed in to view your notes.</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (notesState.loading) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cozy-primary mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading notes...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (notesState.error) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-cozy-text-muted mb-4">{notesState.error}</p>
            <button 
              onClick={() => {
                dispatch({ type: 'SET_ERROR', payload: null })
                loadNotes()
              }}
              className="px-4 py-2 bg-cozy-primary text-white rounded-lg hover:bg-cozy-primary-deep transition-colors shadow-cozy-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Notes">
      <div className="min-h-screen bg-cozy-bg">
        {/* Header */}
        <div className="bg-cozy-surface border-b border-cozy-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-cozy-text">Notes</h1>
                <div className="text-sm text-cozy-text-muted">
                  {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-cozy-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-cozy-surface shadow-cozy-sm' : 'hover:bg-cozy-gray-200'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-cozy-surface shadow-cozy-sm' : 'hover:bg-cozy-gray-200'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* New Note Button */}
                <Button
                  onClick={createNewNote}
                  className="bg-cozy-primary hover:bg-cozy-primary-deep text-white shadow-cozy-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Note
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-cozy-surface border-b border-cozy-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cozy-text-muted" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-cozy-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cozy-primary focus:border-transparent bg-cozy-surface text-cozy-text placeholder-cozy-text-muted"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-cozy-text-muted" />
                <div className="flex items-center bg-cozy-gray-100 rounded-lg p-1">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'personal', label: 'Personal' },
                    { key: 'shared', label: 'Shared' },
                    { key: 'pinned', label: 'Pinned' },
                    { key: 'archived', label: 'Archived' }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setActiveFilter(filter.key as any)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        activeFilter === filter.key
                          ? 'bg-cozy-surface text-cozy-primary shadow-cozy-sm'
                          : 'text-cozy-text-muted hover:text-cozy-text hover:bg-cozy-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-cozy-text mb-2">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </h3>
              <p className="text-cozy-text-muted mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Start by creating your first note!'
                }
              </p>
              {!searchQuery && (
                <Button
                  onClick={createNewNote}
                  className="bg-cozy-primary hover:bg-cozy-primary-deep text-white shadow-cozy-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Note
                </Button>
              )}
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
            }>
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className={`cursor-pointer transition-all duration-200 group ${
                    viewMode === 'grid' 
                      ? `p-4 rounded-lg border-2 ${getColorClasses(note.color)} shadow-cozy-sm hover:shadow-cozy-md`
                      : 'p-4 bg-cozy-surface rounded-lg border border-cozy-gray-200 hover:border-cozy-gray-300 shadow-cozy-sm hover:shadow-cozy-md'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    // Grid View
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-cozy-text truncate flex-1 min-w-0">
                          {note.title || 'Untitled'}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {note.isPinned && (
                            <Pin className="w-3 h-3 text-yellow-500" />
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Quick Color Picker */}
                            <div className="flex items-center gap-1">
                              {[
                                { name: 'yellow', bg: 'bg-yellow-50', accent: 'bg-yellow-400' },
                                { name: 'sage', bg: 'bg-green-50', accent: 'bg-green-400' },
                                { name: 'coral', bg: 'bg-orange-50', accent: 'bg-orange-400' },
                                { name: 'terracotta', bg: 'bg-red-50', accent: 'bg-red-400' },
                                { name: 'cream', bg: 'bg-amber-50', accent: 'bg-amber-400' },
                                { name: 'sand', bg: 'bg-stone-50', accent: 'bg-stone-400' },
                                { name: 'warm-gray', bg: 'bg-gray-50', accent: 'bg-gray-400' },
                                { name: 'soft-blue', bg: 'bg-blue-50', accent: 'bg-blue-400' },
                                { name: 'lavender', bg: 'bg-purple-50', accent: 'bg-purple-400' },
                                { name: 'pink', bg: 'bg-pink-50', accent: 'bg-pink-400' }
                              ].map((color) => (
                                <button
                                  key={color.name}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleNoteUpdate(note.id, 'color', color.name)
                                  }}
                                  className={`relative w-4 h-4 rounded border ${
                                    note.color === color.name ? 'border-cozy-text scale-110' : 'border-cozy-gray-300'
                                  } ${color.bg} transition-all hover:scale-105`}
                                  title={color.name}
                                >
                                  <div className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${color.accent}`} />
                                </button>
                              ))}
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNoteUpdate(note.id, 'isShared', !note.isShared)
                              }}
                              className={`p-1 rounded transition-colors ${
                                note.isShared
                                  ? 'text-blue-600 hover:bg-blue-100'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              title={note.isShared ? 'Make private' : 'Share with household'}
                            >
                              {note.isShared ? (
                                <Share2 className="w-3 h-3" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm({ show: true, noteId: note.id, noteTitle: note.title || 'Untitled' })
                              }}
                              className="p-1 rounded transition-colors text-gray-400 hover:text-red-600 hover:bg-red-100"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        {getContentTypeIndicator(note) && (
                          <div className="flex items-center gap-1 mb-2">
                            {getContentTypeIndicator(note)}
                          </div>
                        )}
                        <div className="text-sm text-cozy-text-muted line-clamp-3">
                          {getSmartPreview(note)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-cozy-text-muted">
                        <div className="flex items-center gap-2">
                          <span>by {note.createdBy.name}</span>
                          {note.isShared && (
                            <div className="flex items-center gap-1 text-cozy-primary">
                              <Share2 className="w-3 h-3" />
                              <span>Shared</span>
                            </div>
                          )}
                        </div>
                        <span>{formatDate(note.updatedAt)}</span>
                      </div>
                    </>
                  ) : (
                    // List View
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-cozy-text truncate">
                            {note.title || 'Untitled'}
                          </h3>
                          {note.isPinned && (
                            <Pin className="w-3 h-3 text-yellow-500" />
                          )}
                          {note.isShared && (
                            <Share2 className="w-3 h-3 text-cozy-primary" />
                          )}
                        </div>
                        <div className="text-sm text-cozy-text-muted truncate">
                          {getSmartPreview(note)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-cozy-text-muted">
                        <span>{formatDate(note.updatedAt)}</span>
                        <div className="w-3 h-3 rounded-full bg-cozy-gray-200" style={{ backgroundColor: `var(--color-${note.color}-200)` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteConfirm({ show: false, noteId: null, noteTitle: '' })}
        >
          <div 
            className="bg-cozy-surface rounded-xl shadow-cozy-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-cozy-text">Delete Note</h3>
                <p className="text-sm text-cozy-text-muted">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-cozy-gray-100 rounded-lg p-4 mb-6">
              <p className="text-cozy-text">
                Are you sure you want to delete <strong>&ldquo;{deleteConfirm.noteTitle}&rdquo;</strong>?
              </p>
              <p className="text-sm text-cozy-text-muted mt-2">
                This will permanently remove the note and all its content.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ show: false, noteId: null, noteTitle: '' })}
                className="px-6 py-3 text-sm font-medium text-cozy-text-muted bg-cozy-gray-100 hover:bg-cozy-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm.noteId && handleDeleteNote(deleteConfirm.noteId)}
                className="px-6 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-cozy-sm"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </ModernAppShell>
  )
}
