import React, { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import RichTextEditor from '../components/RichTextEditor'
import ClientOnly from '../components/ClientOnly'
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
  Unlock,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  List,
  Bold,
  Italic,
  Underline,
  Type,
  Grid3X3,
  Paperclip,
  PenTool,
  Settings,
  Undo,
  Redo,
  Mic,
  StopCircle,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react'

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

const initialState: NotesState = {
  notes: [],
  loading: true,
  error: null
}

export default function NotesPage() {
  const { data: session } = useSession()
  const [notesState, dispatch] = useReducer(notesReducer, initialState)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'shared'>('all')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // Auto-save functionality
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; noteId: string | null; noteTitle: string }>({
    show: false,
    noteId: null,
    noteTitle: ''
  })
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const loadingRef = useRef(false)

  // Load notes
  const loadNotes = useCallback(async () => {
    if (loadingRef.current || !session?.user?.id) {
      console.log('Skipping loadNotes:', { loading: loadingRef.current, hasSession: !!session?.user?.id })
      return
    }

    console.log('Loading notes for user:', session.user.id)
    loadingRef.current = true
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await fetch('/api/notes')
      console.log('Notes API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch notes')
      }
      
      const data = await response.json()
      console.log('Notes loaded:', data.notes?.length || 0, 'notes')
      
      // Ensure all notes have proper contentText and color
      const processedNotes = (data.notes || []).map((note: any) => {
        if (!note.contentText && note.contentJson) {
          // Extract text from JSON if contentText is missing
          const extractedText = extractTextFromJson(note.contentJson)
          note.contentText = extractedText || note.content?.replace(/<[^>]*>/g, '') || ''
        } else if (!note.contentText) {
          // Fallback to content field
          note.contentText = note.content?.replace(/<[^>]*>/g, '') || ''
        }
        
        // Ensure color field exists (default to yellow if missing)
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

  // Check if current user can edit a note
  const canEditNote = useCallback((note: Note): boolean => {
    if (!session?.user?.id) return false
    
    // Owner can always edit
    if (note.createdBy.id === session.user.id) return true
    
    // If note is shared, all household members can edit it
    if (note.isShared && note.household) {
      return true // All household members can edit shared notes
    }
    
    // Check if user is a collaborator with EDITOR role (for private notes with specific collaborators)
    const userCollaboration = note.collaborators.find(
      collab => collab.user.id === session.user.id && collab.role === 'EDITOR'
    )
    
    return !!userCollaboration
  }, [session?.user?.id])

  // Auto-save function with debounce
  const autoSave = useCallback(async (note: Note) => {
    // Check if user has edit permissions before attempting to save
    if (!canEditNote(note)) {
      console.log('User does not have edit permissions for this note')
      setSaveState('error')
      return
    }

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    setSaveState('saving')

    const timeout = setTimeout(async () => {
      try {
        // Get household ID - try multiple sources
        let householdId = note.household?.id || null
        
        // If note is shared but no household ID, try to get it from the active household
        if (note.isShared && !householdId) {
          try {
            const householdRes = await fetch('/api/household/active')
            const householdData = await householdRes.json()
            if (householdData.householdId) {
              householdId = householdData.householdId
              console.log('Got household ID from active household API:', householdId)
            }
          } catch (error) {
            console.error('Failed to get household ID:', error)
          }
        }

        const saveData = {
          title: note.title,
          content: note.content,
          contentJson: note.contentJson,
          contentText: note.contentText,
          isShared: note.isShared,
          color: note.color,
          isPinned: note.isPinned,
          isArchived: note.isArchived,
          householdId: householdId
        }
        
        console.log('Saving note:', {
          noteId: note.id,
          isShared: note.isShared,
          householdId: note.household?.id,
          hasHousehold: !!note.household,
          noteHouseholdId: note.household?.id, // Check the household object
          createdById: note.createdBy?.id,
          userSessionId: session?.user?.id,
          isOwner: note.createdBy?.id === session?.user?.id,
          fullNote: note // Log the full note to see all fields
        })
        
        console.log('Making API request to:', `/api/notes/${note.id}`)
        console.log('Request body:', saveData)
        
        const response = await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        })

        console.log('API Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url
        })

        if (!response.ok) {
          let errorData
          try {
            errorData = await response.json()
          } catch (e) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          
          console.error('Save failed - DETAILED DEBUG:', {
            status: response.status,
            statusText: response.statusText,
            responseHeaders: Object.fromEntries(response.headers.entries()),
            errorData: errorData,
            noteId: note.id,
            isShared: note.isShared,
            householdId: note.household?.id,
            requestUrl: `/api/notes/${note.id}`,
            requestBody: saveData
          })
          
          throw new Error(errorData.error || `Failed to save note (${response.status})`)
        }
        
        const data = await response.json()
        dispatch({ type: 'UPDATE_NOTE', payload: data.note })
        setSaveState('saved')
        setLastSaved(new Date())
      } catch (error) {
        console.error('Error auto-saving note:', error)
        setSaveState('error')
      }
    }, 800) // 800ms debounce

    setAutoSaveTimeout(timeout)
  }, [autoSaveTimeout, canEditNote])

  // Handle note updates (for selected note in editor)
  const handleNoteUpdate = useCallback(async (field: 'title' | 'content' | 'contentJson' | 'contentText' | 'isShared' | 'isPinned' | 'isArchived' | 'color', value: string | any | boolean) => {
    if (!selectedNote) return

    // Check if user has edit permissions before allowing updates
    if (!canEditNote(selectedNote)) {
      console.log('User does not have edit permissions for this note')
      return
    }

    let updatedNote = { ...selectedNote, [field]: value, updatedAt: new Date().toISOString() }
    let householdIdForApi = selectedNote.household?.id
    
    // If making note shared, ensure householdId is set
    if (field === 'isShared' && value === true) {
      // If no household ID, get it from active household
      if (!householdIdForApi) {
        try {
          const householdRes = await fetch('/api/household/active')
          const householdData = await householdRes.json()
          if (householdData.householdId) {
            householdIdForApi = householdData.householdId
            console.log('Got household ID for sharing:', householdIdForApi)
          }
        } catch (error) {
          console.error('Failed to get household ID for sharing:', error)
        }
      }
    }

    setSelectedNote(updatedNote)
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote })
    autoSave(updatedNote)
  }, [selectedNote, autoSave, canEditNote])

  // Handle note updates from list view
  const handleNoteUpdateFromList = useCallback(async (noteId: string, field: 'title' | 'content' | 'contentJson' | 'contentText' | 'isShared' | 'isPinned' | 'isArchived' | 'color', value: string | any | boolean) => {
    // Find the note in the current list
    const note = notesState.notes.find(n => n.id === noteId)
    if (!note) return

    // Check if user has edit permissions before allowing updates
    if (!canEditNote(note)) {
      console.log('User does not have edit permissions for this note')
      return
    }

    let updatedNote = { ...note, [field]: value, updatedAt: new Date().toISOString() }
    let householdIdForApi = note.household?.id
    
    // If making note shared, ensure householdId is set
    if (field === 'isShared' && value === true) {
      // If no household ID, get it from active household
      if (!householdIdForApi) {
        try {
          const householdRes = await fetch('/api/household/active')
          const householdData = await householdRes.json()
          if (householdData.householdId) {
            householdIdForApi = householdData.householdId
            console.log('Got household ID for sharing from list:', householdIdForApi)
          }
        } catch (error) {
          console.error('Failed to get household ID for sharing:', error)
        }
      }
    }
    
    // Update the note in the list immediately
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote })
    
    // Save to database
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedNote.title,
          content: updatedNote.content,
          contentJson: updatedNote.contentJson,
          contentText: updatedNote.contentText,
          isShared: updatedNote.isShared,
          color: updatedNote.color,
          isPinned: updatedNote.isPinned,
          isArchived: updatedNote.isArchived,
          householdId: householdIdForApi || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save note')
      }
      
    } catch (error) {
      console.error('Error updating note from list:', error)
    }
  }, [notesState.notes, canEditNote])

  // Show delete confirmation
  const showDeleteConfirm = useCallback((noteId: string, noteTitle: string) => {
    setDeleteConfirm({
      show: true,
      noteId,
      noteTitle
    })
  }, [])

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

      // Remove note from state
      dispatch({ type: 'DELETE_NOTE', payload: noteId })
      
      // If the deleted note was selected, clear selection
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
      }

      // Close confirmation dialog
      setDeleteConfirm({ show: false, noteId: null, noteTitle: '' })

      console.log('Note deleted successfully')
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note. Please try again.')
    }
  }, [selectedNote])

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ show: false, noteId: null, noteTitle: '' })
  }, [])

  // Handle escape key and outside click for delete confirmation
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteConfirm.show) {
        cancelDelete()
      }
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (deleteConfirm.show && e.target === e.currentTarget) {
        cancelDelete()
      }
    }

    if (deleteConfirm.show) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('click', handleOutsideClick)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('click', handleOutsideClick)
      document.body.style.overflow = 'unset'
    }
  }, [deleteConfirm.show, cancelDelete])

  // Get color classes for note cards
  const getColorClasses = useCallback((color: string) => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200'
      case 'green':
        return 'bg-green-50 border-green-200'
      case 'blue':
        return 'bg-blue-50 border-blue-200'
      case 'purple':
        return 'bg-purple-50 border-purple-200'
      case 'pink':
        return 'bg-pink-50 border-pink-200'
      case 'gray':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-white border-gray-200'
    }
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
          <span>Checklist ({checkedCount}/{totalCount})</span>
        </div>
      )
    }
    
    if (content.includes('•') || /^\d+\./.test(content)) {
      const listCount = content.split('\n').filter(line => 
        line.trim().startsWith('•') || /^\d+\./.test(line.trim())
      ).length
      return (
        <div className="flex items-center gap-1 text-xs text-cozy-primary">
          <List className="w-3 h-3" />
          <span>List ({listCount} items)</span>
        </div>
      )
    }
    
    if (content.includes('#')) {
      const headingCount = (content.match(/^#+\s/gm) || []).length
      return (
        <div className="flex items-center gap-1 text-xs text-cozy-primary">
          <Type className="w-3 h-3" />
          <span>Document ({headingCount} headings)</span>
        </div>
      )
    }
    
    // Check for rich content in JSON
    if (note.contentJson) {
      const hasImages = JSON.stringify(note.contentJson).includes('"type":"image"')
      const hasLinks = JSON.stringify(note.contentJson).includes('"type":"link"')
      
      if (hasImages) {
        return (
          <div className="flex items-center gap-1 text-xs text-cozy-primary">
            <ImageIcon className="w-3 h-3" />
            <span>With images</span>
          </div>
        )
      }
      
      if (hasLinks) {
        return (
          <div className="flex items-center gap-1 text-xs text-cozy-primary">
            <LinkIcon className="w-3 h-3" />
            <span>With links</span>
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
      ).slice(0, 3) // Show max 3 checklist items
      
      if (checklistItems.length > 0) {
        const preview = checklistItems.join(' • ')
        return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
      }
    }

    // Check if it's a list (bullet or numbered)
    if (content.includes('•') || /^\d+\./.test(content)) {
      const listItems = content.split('\n').filter(line => 
        line.trim().startsWith('•') || /^\d+\./.test(line.trim())
      ).slice(0, 2) // Show max 2 list items
      
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

    // Find a good break point (end of sentence or word)
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

  // Extract text from TipTap JSON content (including checklist items)
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

  // Handle rich text editor updates
  const handleContentUpdate = useCallback((contentJson: any, contentText: string) => {
    if (!selectedNote) return

    // Extract proper text content including checklist items
    const extractedText = extractTextFromJson(contentJson) || contentText

    const updatedNote = { 
      ...selectedNote, 
      contentJson, 
      contentText: extractedText,
      content: extractedText, // Keep legacy content field for backward compatibility
      updatedAt: new Date().toISOString() 
    }
    setSelectedNote(updatedNote)
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote })
    autoSave(updatedNote)
  }, [selectedNote, autoSave, extractTextFromJson])

  // Auto-resize textarea
  const autoResize = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])


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
      setSelectedNote(data.note)
    } catch (error) {
      console.error('Error creating note:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create note' })
    }
  }, [session?.user?.id])

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete note')
      
      dispatch({ type: 'DELETE_NOTE', payload: noteId })
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }, [selectedNote?.id])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let filtered = notesState.notes

    // Filter by tab
    if (activeTab === 'personal') {
      filtered = filtered.filter(note => !note.isShared)
    } else if (activeTab === 'shared') {
      filtered = filtered.filter(note => note.isShared)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        (note.contentText || note.content).toLowerCase().includes(query)
      )
    }

    // Sort by updated date
    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [notesState.notes, activeTab, searchQuery])

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

  // Show loading state
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

  // Show error if there's one
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
              className="px-4 py-2 bg-cozy-primary text-white rounded-lg hover:bg-cozy-primary-deep transition-colors"
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
      <div className="h-screen flex bg-white overflow-hidden">
        {/* Sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-0' : 'w-80'} bg-gray-50 border-r border-gray-200 transition-all duration-300 overflow-hidden hidden md:block`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-cozy-text">Notes</h1>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cozy-primary focus:border-transparent"
              />
            </div>

            {/* Tabs */}
            <div className="flex mb-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'all' 
                    ? 'bg-cozy-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Notes
              </button>
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ml-2 ${
                  activeTab === 'personal' 
                    ? 'bg-cozy-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveTab('shared')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ml-2 ${
                  activeTab === 'shared' 
                    ? 'bg-cozy-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Shared
              </button>
            </div>

            {/* New Note Button */}
            <Button
              onClick={createNewNote}
              className="w-full bg-cozy-primary hover:bg-cozy-primary-deep text-white mb-4 hidden sm:flex"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
            
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Header - Only show when no note is selected */}
          {!selectedNote && (
            <div className="md:hidden p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-cozy-text">Notes</h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab(activeTab === 'all' ? 'personal' : activeTab === 'personal' ? 'shared' : 'all')}
                    className="px-3 py-1 text-sm bg-cozy-gray text-cozy-text rounded-lg hover:bg-cozy-gray-hover transition-colors"
                  >
                    {activeTab === 'all' ? 'All' : activeTab === 'personal' ? 'Personal' : 'Shared'}
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cozy-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {!selectedNote ? (
            /* Notes List View */
            <div className="flex-1 p-3 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {filteredNotes.length === 0 ? (
                  <div className="col-span-full text-center py-12">
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
                      <Button
                        onClick={createNewNote}
                        className="bg-cozy-primary hover:bg-cozy-primary-deep text-cozy-surface"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Note
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`cozy-card p-4 cursor-pointer hover:shadow-cozy-md transition-all duration-200 group ${getColorClasses(note.color)}`}
                      style={{ 
                        backgroundColor: note.color === 'yellow' ? '#fefce8' : 
                                       note.color === 'green' ? '#f0fdf4' : 
                                       note.color === 'blue' ? '#eff6ff' : 
                                       note.color === 'purple' ? '#faf5ff' : 
                                       note.color === 'pink' ? '#fdf2f8' : 
                                       note.color === 'gray' ? '#f9fafb' : '#ffffff',
                        borderColor: note.color === 'yellow' ? '#fde047' : 
                                    note.color === 'green' ? '#86efac' : 
                                    note.color === 'blue' ? '#93c5fd' : 
                                    note.color === 'purple' ? '#c4b5fd' : 
                                    note.color === 'pink' ? '#f9a8d4' : 
                                    note.color === 'gray' ? '#d1d5db' : '#e5e7eb'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="font-medium text-cozy-text truncate flex-1 min-w-0">
                          {note.title || 'Untitled'}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {note.isPinned && (
                            <Pin className="w-3 h-3 text-yellow-500" />
                          )}
                          <div className="flex items-center gap-1">
                            {/* Quick Color Picker */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleNoteUpdateFromList(note.id, 'color', 'yellow')
                                }}
                                className={`w-4 h-4 sm:w-3 sm:h-3 rounded-full border-2 ${
                                  note.color === 'yellow' ? 'border-gray-600 scale-110' : 'border-gray-300'
                                } bg-yellow-200 hover:bg-yellow-300 active:scale-95 transition-all duration-150 touch-manipulation`}
                                title="Yellow"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleNoteUpdateFromList(note.id, 'color', 'green')
                                }}
                                className={`w-4 h-4 sm:w-3 sm:h-3 rounded-full border-2 ${
                                  note.color === 'green' ? 'border-gray-600 scale-110' : 'border-gray-300'
                                } bg-green-200 hover:bg-green-300 active:scale-95 transition-all duration-150 touch-manipulation`}
                                title="Green"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleNoteUpdateFromList(note.id, 'color', 'blue')
                                }}
                                className={`w-4 h-4 sm:w-3 sm:h-3 rounded-full border-2 ${
                                  note.color === 'blue' ? 'border-gray-600 scale-110' : 'border-gray-300'
                                } bg-blue-200 hover:bg-blue-300 active:scale-95 transition-all duration-150 touch-manipulation`}
                                title="Blue"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleNoteUpdateFromList(note.id, 'color', 'purple')
                                }}
                                className={`w-4 h-4 sm:w-3 sm:h-3 rounded-full border-2 ${
                                  note.color === 'purple' ? 'border-gray-600 scale-110' : 'border-gray-300'
                                } bg-purple-200 hover:bg-purple-300 active:scale-95 transition-all duration-150 touch-manipulation`}
                                title="Purple"
                              />
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNoteUpdateFromList(note.id, 'isShared', !note.isShared)
                              }}
                              className={`p-1.5 sm:p-1 rounded-lg transition-colors touch-manipulation ${
                                note.isShared
                                  ? 'text-cozy-primary hover:bg-cozy-primary/10 active:bg-cozy-primary/20'
                                  : 'text-cozy-text-muted hover:text-cozy-text hover:bg-cozy-gray active:bg-cozy-gray-hover'
                              }`}
                              title={note.isShared ? 'Make private' : 'Share with household'}
                            >
                              {note.isShared ? (
                                <Share2 className="w-3 h-3" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                showDeleteConfirm(note.id, note.title || 'Untitled')
                              }}
                              className="p-1.5 sm:p-1 rounded-lg transition-colors touch-manipulation text-cozy-text-muted hover:text-cozy-text hover:bg-cozy-gray active:bg-cozy-gray-hover"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        {getContentTypeIndicator(note) && (
                          <div className="flex items-center gap-1 mb-1">
                            {getContentTypeIndicator(note)}
                          </div>
                        )}
                        <div className="text-sm text-cozy-text-muted line-clamp-3">
                          {getSmartPreview(note)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-cozy-text-soft">
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
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Note Editor View */
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="flex items-center gap-1 md:gap-2 text-cozy-primary hover:text-cozy-primary-deep transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">All Notes</span>
                    <span className="text-sm font-medium sm:hidden">Back</span>
                  </button>
                  
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNoteUpdate('isShared', !selectedNote.isShared)}
                    className={`p-2 rounded transition-colors ${
                      selectedNote.isShared
                        ? 'text-cozy-primary bg-cozy-primary/10 hover:bg-cozy-primary/20'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={selectedNote.isShared ? 'Make private' : 'Share with household'}
                  >
                    {selectedNote.isShared ? (
                      <Share2 className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="px-4 py-2 text-cozy-primary font-medium hover:text-cozy-primary-deep transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="p-3 md:p-4 border-b border-gray-200">
                <textarea
                  ref={titleRef}
                  value={selectedNote.title}
                  onChange={(e) => {
                    if (canEditNote(selectedNote)) {
                      handleNoteUpdate('title', e.target.value)
                      autoResize(e.target)
                    }
                  }}
                  onFocus={(e) => {
                    // Clear placeholder text when focused
                    if (e.target.value === '' && e.target.placeholder === 'Title') {
                      e.target.placeholder = ''
                    }
                  }}
                  onBlur={(e) => {
                    // Restore placeholder if empty
                    if (e.target.value === '' && canEditNote(selectedNote)) {
                      e.target.placeholder = 'Title'
                    }
                  }}
                  placeholder={canEditNote(selectedNote) ? (selectedNote.title === '' ? 'Title' : '') : "Read-only title"}
                  disabled={!canEditNote(selectedNote)}
                  className={`w-full text-2xl md:text-3xl font-bold text-cozy-text placeholder-gray-400 border-0 resize-none focus:outline-none bg-transparent ${
                    !canEditNote(selectedNote) ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  style={{ minHeight: '40px' }}
                />
              </div>

              {/* Save State Indicator & Share Controls */}
              <div className="px-3 md:px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {saveState === 'saving' && (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cozy-primary"></div>
                        <span>Saving...</span>
                      </>
                    )}
                    {saveState === 'saved' && lastSaved && (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span>Saved • {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    )}
                    {saveState === 'error' && (
                      <>
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                        <span>Save failed</span>
                      </>
                    )}
                  </div>
                  
                  {/* Share Toggle & Color Picker */}
                  <div className="flex items-center gap-2 md:gap-3">
                    {/* Color Picker */}
                    <div className="flex items-center gap-1 md:gap-2">
                      <button
                        onClick={() => canEditNote(selectedNote) && handleNoteUpdate('color', 'yellow')}
                        disabled={!canEditNote(selectedNote)}
                        className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 ${
                          selectedNote.color === 'yellow' ? 'border-gray-600 scale-110' : 'border-gray-300'
                        } bg-yellow-200 hover:bg-yellow-300 active:scale-95 transition-all duration-150 touch-manipulation ${
                          !canEditNote(selectedNote) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={canEditNote(selectedNote) ? "Yellow" : "Read-only"}
                      />
                      <button
                        onClick={() => canEditNote(selectedNote) && handleNoteUpdate('color', 'green')}
                        disabled={!canEditNote(selectedNote)}
                        className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 ${
                          selectedNote.color === 'green' ? 'border-gray-600 scale-110' : 'border-gray-300'
                        } bg-green-200 hover:bg-green-300 active:scale-95 transition-all duration-150 touch-manipulation ${
                          !canEditNote(selectedNote) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={canEditNote(selectedNote) ? "Green" : "Read-only"}
                      />
                      <button
                        onClick={() => canEditNote(selectedNote) && handleNoteUpdate('color', 'blue')}
                        disabled={!canEditNote(selectedNote)}
                        className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 ${
                          selectedNote.color === 'blue' ? 'border-gray-600 scale-110' : 'border-gray-300'
                        } bg-blue-200 hover:bg-blue-300 active:scale-95 transition-all duration-150 touch-manipulation ${
                          !canEditNote(selectedNote) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={canEditNote(selectedNote) ? "Blue" : "Read-only"}
                      />
                      <button
                        onClick={() => canEditNote(selectedNote) && handleNoteUpdate('color', 'purple')}
                        disabled={!canEditNote(selectedNote)}
                        className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 ${
                          selectedNote.color === 'purple' ? 'border-gray-600 scale-110' : 'border-gray-300'
                        } bg-purple-200 hover:bg-purple-300 active:scale-95 transition-all duration-150 touch-manipulation ${
                          !canEditNote(selectedNote) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={canEditNote(selectedNote) ? "Purple" : "Read-only"}
                      />
                      <button
                        onClick={() => canEditNote(selectedNote) && handleNoteUpdate('color', 'pink')}
                        disabled={!canEditNote(selectedNote)}
                        className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 ${
                          selectedNote.color === 'pink' ? 'border-gray-600 scale-110' : 'border-gray-300'
                        } bg-pink-200 hover:bg-pink-300 active:scale-95 transition-all duration-150 touch-manipulation ${
                          !canEditNote(selectedNote) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={canEditNote(selectedNote) ? "Pink" : "Read-only"}
                      />
                      <button
                        onClick={() => canEditNote(selectedNote) && handleNoteUpdate('color', 'gray')}
                        disabled={!canEditNote(selectedNote)}
                        className={`w-6 h-6 md:w-5 md:h-5 rounded-full border-2 ${
                          selectedNote.color === 'gray' ? 'border-gray-600 scale-110' : 'border-gray-300'
                        } bg-gray-200 hover:bg-gray-300 active:scale-95 transition-all duration-150 touch-manipulation ${
                          !canEditNote(selectedNote) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={canEditNote(selectedNote) ? "Gray" : "Read-only"}
                      />
                    </div>
                    
                    <button
                      onClick={() => handleNoteUpdate('isShared', !selectedNote.isShared)}
                      className={`flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-xs font-medium transition-colors touch-manipulation ${
                        selectedNote.isShared
                          ? 'bg-cozy-primary text-white active:bg-cozy-primary-deep'
                          : 'bg-cozy-gray text-cozy-text hover:bg-cozy-gray-hover active:bg-cozy-gray-active'
                      }`}
                    >
                      {selectedNote.isShared ? (
                        <>
                          <Share2 className="w-3 h-3" />
                          <span>Shared</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </>
                      )}
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => showDeleteConfirm(selectedNote.id, selectedNote.title || 'Untitled')}
                      className="flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-xs font-medium transition-colors touch-manipulation bg-cozy-gray text-cozy-text hover:bg-cozy-gray-hover active:bg-cozy-gray-active"
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content Editor */}
              <div className="flex-1 p-3 md:p-4">
                {!canEditNote(selectedNote) && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">Read-only mode</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      You can view this note but cannot edit it. Only the owner, collaborators with edit access, or household members (for shared notes) can make changes.
                    </p>
                  </div>
                )}
                <ClientOnly fallback={
                  <div className="min-h-[300px] p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
                    <div className="text-gray-500">Loading editor...</div>
                  </div>
                }>
                  <RichTextEditor
                    content={selectedNote.contentJson || selectedNote.content}
                    onUpdate={handleContentUpdate}
                    placeholder={canEditNote(selectedNote) ? "Start writing your note..." : "This note is read-only"}
                    editable={canEditNote(selectedNote)}
                    className="h-full"
                  />
                </ClientOnly>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
          onClick={cancelDelete}
          onTouchStart={(e) => {
            // Prevent touch events from bubbling up on mobile
            if (e.target === e.currentTarget) {
              e.preventDefault()
              cancelDelete()
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-cozy-lg max-w-md w-full p-6 border border-cozy-border"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-cozy-gray/20 rounded-full flex items-center justify-center border-2 border-cozy-border">
                <Trash2 className="w-6 h-6 text-cozy-text-muted" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-cozy-text">Delete Note</h3>
                <p className="text-sm text-cozy-text-muted">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-cozy-gray/30 rounded-lg p-4 mb-6">
              <p className="text-cozy-text">
                Are you sure you want to delete <strong className="text-cozy-text">&ldquo;{deleteConfirm.noteTitle}&rdquo;</strong>? 
              </p>
              <p className="text-sm text-cozy-text-muted mt-2">
                This will permanently remove the note and all its content from your account.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-6 py-3 text-sm font-medium text-cozy-text bg-cozy-gray hover:bg-cozy-gray-hover active:bg-cozy-gray-active rounded-lg transition-all duration-200 touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm.noteId && handleDeleteNote(deleteConfirm.noteId)}
                className="px-6 py-3 text-sm font-medium text-white bg-cozy-primary hover:bg-cozy-primary-deep active:bg-cozy-primary-dark rounded-lg transition-all duration-200 touch-manipulation shadow-sm"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Button */}
      {!deleteConfirm.show && (
        <button
          onClick={createNewNote}
          className="fixed bottom-6 right-6 w-14 h-14 bg-cozy-primary hover:bg-cozy-primary-deep text-white rounded-full shadow-cozy-lg flex items-center justify-center z-40 sm:hidden transition-all duration-200 hover:scale-105 active:scale-95"
          title="Create new note"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </ModernAppShell>
  )
}