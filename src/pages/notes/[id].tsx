import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import ModernAppShell from '../../components/ModernAppShell'
import ModernTiptapEditor from '../../components/ModernTiptapEditor'
import ClientOnly from '../../components/ClientOnly'
import { Button } from '../../components/ui/Button'
import { 
  ArrowLeft,
  Share2,
  Lock,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Palette,
  MoreVertical,
  Save,
  Users,
  Eye,
  Edit3,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { prisma } from '../../lib/prisma'
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
  // collabDocId?: string // Temporarily disabled
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
    addedAt: string
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

interface NoteEditorPageProps {
  note: Note
  userCanEdit: boolean
}

export default function NoteEditorPage({ note: initialNote, userCanEdit }: NoteEditorPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [note, setNote] = useState<Note>(initialNote)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [contentUpdateTimeout, setContentUpdateTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // Auto-save function with debounce
  const autoSave = useCallback(async (updatedNote: Note) => {
    if (!userCanEdit) {
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
        let householdId = updatedNote.household?.id || null
        
        // If note is shared but no household ID, try to get it from the active household
        if (updatedNote.isShared && !householdId) {
          try {
            const householdRes = await fetch('/api/household/active')
            const householdData = await householdRes.json()
            if (householdData.householdId) {
              householdId = householdData.householdId
            }
          } catch (error) {
            console.error('Failed to get household ID:', error)
          }
        }

        const saveData = {
          title: updatedNote.title,
          content: updatedNote.content,
          contentJson: updatedNote.contentJson,
          contentText: updatedNote.contentText,
          isShared: updatedNote.isShared,
          color: updatedNote.color,
          isPinned: updatedNote.isPinned,
          isArchived: updatedNote.isArchived,
          householdId: householdId,
          // collabDocId: updatedNote.collabDocId // Temporarily disabled
        }
        
        const response = await fetch(`/api/notes/${updatedNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to save note (${response.status})`)
        }
        
        const data = await response.json()
        setNote(data.note)
        setSaveState('saved')
        setLastSaved(new Date())
      } catch (error) {
        console.error('Error auto-saving note:', error)
        setSaveState('error')
      }
    }, 3000) // 3 second debounce to reduce frequent saves

    setAutoSaveTimeout(timeout)
  }, [autoSaveTimeout, userCanEdit])

  // Handle note updates
  const handleNoteUpdate = useCallback(async (field: string, value: any) => {
    if (!userCanEdit) {
      console.log('User does not have edit permissions for this note')
      return
    }

    const updatedNote = { ...note, [field]: value, updatedAt: new Date().toISOString() }
    setNote(updatedNote)
    autoSave(updatedNote)
  }, [note, autoSave, userCanEdit])

  // Handle content updates from editor with proper debouncing
  const handleContentUpdate = useCallback((contentJson: any, contentText: string) => {
    if (!userCanEdit) return

    // Update the note state immediately for UI responsiveness
    const updatedNote = { 
      ...note, 
      contentJson, 
      contentText,
      content: contentText, // Keep legacy content field for backward compatibility
      updatedAt: new Date().toISOString() 
    }
    setNote(updatedNote)

    // Only auto-save if content has actually changed significantly
    if (contentText !== note.contentText) {
      // Clear existing timeout
      if (contentUpdateTimeout) {
        clearTimeout(contentUpdateTimeout)
      }
      
      // Set a new timeout for auto-saving
      const timeout = setTimeout(() => {
        autoSave(updatedNote)
      }, 2000) // 2 second delay for content updates
      
      setContentUpdateTimeout(timeout)
    }
  }, [note, autoSave, userCanEdit])

  // Handle title updates
  const handleTitleUpdate = useCallback((newTitle: string) => {
    handleNoteUpdate('title', newTitle)
  }, [handleNoteUpdate])

  // Auto-resize textarea
  const autoResize = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete note')
      }

      router.push('/notes')
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note. Please try again.')
    }
  }, [note.id, router])

  // Generate collaboration document ID if not exists - Temporarily disabled
  // useEffect(() => {
  //   if (!note.collabDocId && userCanEdit) {
  //     const collabDocId = generateCollabDocId()
  //     handleNoteUpdate('collabDocId', collabDocId)
  //   }
  // }, [note.collabDocId, userCanEdit, handleNoteUpdate])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }
      if (contentUpdateTimeout) {
        clearTimeout(contentUpdateTimeout)
      }
    }
  }, [autoSaveTimeout, contentUpdateTimeout])

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  // Get background color class based on note color
  const getNoteBackgroundColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'yellow': 'bg-yellow-50',
      'sage': 'bg-green-50', 
      'coral': 'bg-orange-50',
      'terracotta': 'bg-red-50',
      'cream': 'bg-amber-50',
      'sand': 'bg-stone-50',
      'warm-gray': 'bg-gray-50',
      'soft-blue': 'bg-blue-50',
      'lavender': 'bg-purple-50',
      'pink': 'bg-pink-50',
      'emerald': 'bg-emerald-50',
      'indigo': 'bg-indigo-50',
      'default': 'bg-cozy-surface'
    }
    return colorMap[color] || 'bg-cozy-surface'
  }

  if (!session) {
    return (
      <ModernAppShell title="Note">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Please sign in</h2>
            <p className="text-cozy-text-muted">You need to be signed in to view this note.</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  const userInfo = {
    name: session.user?.name || 'Anonymous',
    color: '#e67e22', // Cozy primary color (warm coral)
    userId: session.user?.id || 'anonymous'
  }

  return (
    <ModernAppShell title={note.title || 'Untitled Note'}>
      <div className="min-h-screen bg-cozy-bg">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-cozy-surface border-b border-cozy-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/notes')}
                  className="flex items-center gap-2 text-cozy-text-muted hover:text-cozy-text transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Notes</span>
                </button>
                
                <div className="h-6 w-px bg-cozy-gray-300" />
                
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    note.color === 'yellow' ? 'bg-yellow-400' :
                    note.color === 'sage' ? 'bg-green-400' :
                    note.color === 'coral' ? 'bg-orange-400' :
                    note.color === 'terracotta' ? 'bg-red-400' :
                    note.color === 'cream' ? 'bg-amber-400' :
                    note.color === 'sand' ? 'bg-stone-400' :
                    note.color === 'warm-gray' ? 'bg-gray-400' :
                    note.color === 'soft-blue' ? 'bg-blue-400' :
                    note.color === 'lavender' ? 'bg-purple-400' :
                    note.color === 'pink' ? 'bg-pink-400' :
                    note.color === 'emerald' ? 'bg-emerald-400' :
                    note.color === 'indigo' ? 'bg-indigo-400' :
                    note.color === 'default' || !note.color ? 'bg-cozy-gray-300' :
                    'bg-gray-400'
                  }`} />
                  <span className="text-sm text-cozy-text-muted">
                    {note.isPinned ? 'Pinned' : 'Note'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Save Status */}
                <div className="flex items-center gap-2 text-sm text-cozy-text-muted">
                  {saveState === 'saving' && (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cozy-primary"></div>
                      <span>Saving...</span>
                    </>
                  )}
                  {saveState === 'saved' && lastSaved && (
                    <>
                      <CheckCircle className="w-3 h-3 text-cozy-sage" />
                      <span>Saved • {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                  {saveState === 'error' && (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span>Save failed</span>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Pin/Unpin */}
                  <button
                    onClick={() => handleNoteUpdate('isPinned', !note.isPinned)}
                    className={`p-2 rounded-lg transition-colors ${
                      note.isPinned
                        ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200'
                        : 'text-cozy-text-muted hover:bg-cozy-gray-100'
                    }`}
                    title={note.isPinned ? 'Unpin note' : 'Pin note'}
                  >
                    {note.isPinned ? (
                      <PinOff className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </button>

                  {/* Archive/Unarchive */}
                  <button
                    onClick={() => handleNoteUpdate('isArchived', !note.isArchived)}
                    className={`p-2 rounded-lg transition-colors ${
                      note.isArchived
                        ? 'text-cozy-terracotta bg-cozy-terracotta/10 hover:bg-cozy-terracotta/20'
                        : 'text-cozy-text-muted hover:bg-cozy-gray-100'
                    }`}
                    title={note.isArchived ? 'Unarchive note' : 'Archive note'}
                  >
                    {note.isArchived ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>

                  {/* Share Toggle */}
                  <button
                    onClick={() => handleNoteUpdate('isShared', !note.isShared)}
                    className={`p-2 rounded-lg transition-colors ${
                      note.isShared
                        ? 'text-cozy-primary bg-cozy-primary-soft hover:bg-cozy-primary/20'
                        : 'text-cozy-text-muted hover:bg-cozy-gray-100'
                    }`}
                    title={note.isShared ? 'Make private' : 'Share with household'}
                  >
                    {note.isShared ? (
                      <Share2 className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </button>

                  {/* Color Picker */}
                  <div className="relative" ref={colorPickerRef}>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-2 rounded-lg transition-colors text-cozy-text-muted hover:bg-cozy-gray-100"
                      title="Change color"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                    
                    {showColorPicker && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-cozy-gray-200 rounded-xl shadow-xl p-4 z-20 min-w-[200px]">
                        <div className="text-xs font-medium text-cozy-text-muted mb-3">Choose a color</div>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { name: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', accent: 'bg-yellow-400' },
                            { name: 'sage', bg: 'bg-green-50', border: 'border-green-200', accent: 'bg-green-400' },
                            { name: 'coral', bg: 'bg-orange-50', border: 'border-orange-200', accent: 'bg-orange-400' },
                            { name: 'terracotta', bg: 'bg-red-50', border: 'border-red-200', accent: 'bg-red-400' },
                            { name: 'cream', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-400' },
                            { name: 'sand', bg: 'bg-stone-50', border: 'border-stone-200', accent: 'bg-stone-400' },
                            { name: 'warm-gray', bg: 'bg-gray-50', border: 'border-gray-200', accent: 'bg-gray-400' },
                            { name: 'soft-blue', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-400' },
                            { name: 'lavender', bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-400' },
                            { name: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', accent: 'bg-pink-400' },
                            { name: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-400' },
                            { name: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-400' }
                          ].map((color) => (
                            <button
                              key={color.name}
                              onClick={() => {
                                handleNoteUpdate('color', color.name)
                                setShowColorPicker(false)
                              }}
                              className={`relative w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                                note.color === color.name 
                                  ? `${color.border} shadow-md` 
                                  : 'border-cozy-gray-200 hover:border-cozy-gray-300'
                              } ${color.bg}`}
                              title={color.name}
                            >
                              {/* Accent dot to show the color more clearly */}
                              <div className={`absolute top-1 right-1 w-3 h-3 rounded-full ${color.accent}`} />
                              {note.color === color.name && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-cozy-text rounded-full" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-cozy-gray-100">
                          <button
                            onClick={() => {
                              handleNoteUpdate('color', 'default')
                              setShowColorPicker(false)
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              note.color === 'default' || !note.color
                                ? 'bg-cozy-primary-soft text-cozy-primary-deep'
                                : 'text-cozy-text-muted hover:bg-cozy-gray-50'
                            }`}
                          >
                            Default (No color)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collaborators */}
                  {note.isShared && (
                    <button
                      onClick={() => setShowCollaborators(!showCollaborators)}
                      className="p-2 rounded-lg transition-colors text-cozy-text-muted hover:bg-cozy-gray-100"
                      title="View collaborators"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  )}

                  {/* More Actions */}
                  <div className="relative">
                    <button className="p-2 rounded-lg transition-colors text-cozy-text-muted hover:bg-cozy-gray-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${getNoteBackgroundColor(note.color)}`}>
          {/* Read-only Notice */}
          {!userCanEdit && (
            <div className="mb-6 p-4 bg-cozy-primary-soft border border-cozy-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-cozy-primary-deep">
                <Eye className="w-4 h-4" />
                <span className="font-medium">Read-only mode</span>
              </div>
              <p className="text-sm text-cozy-primary-deep/80 mt-1">
                You can view this note but cannot edit it. Only the owner, collaborators with edit access, or household members (for shared notes) can make changes.
              </p>
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <textarea
              ref={titleRef}
              value={note.title}
              onChange={(e) => {
                if (userCanEdit) {
                  handleTitleUpdate(e.target.value)
                  autoResize(e.target)
                }
              }}
              onFocus={(e) => {
                if (e.target.value === '' && e.target.placeholder === 'Title') {
                  e.target.placeholder = ''
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '' && userCanEdit) {
                  e.target.placeholder = 'Title'
                }
              }}
              placeholder={userCanEdit ? (note.title === '' ? 'Title' : '') : "Read-only title"}
              disabled={!userCanEdit}
              className={`w-full text-3xl font-bold text-cozy-text placeholder-cozy-text-muted border-0 resize-none focus:outline-none bg-transparent ${
                !userCanEdit ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              style={{ minHeight: '60px' }}
            />
          </div>

          {/* Note Info */}
          <div className="mb-6 flex items-center gap-4 text-sm text-cozy-text-muted">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Created {new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Edit3 className="w-4 h-4" />
              <span>by {note.createdBy.name}</span>
            </div>
            {note.isShared && note.household && (
              <div className="flex items-center gap-1">
                <Share2 className="w-4 h-4" />
                <span>Shared with {note.household.name}</span>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="min-h-[400px]">
            <div className="bg-white/80 backdrop-blur-sm border border-cozy-gray-200 rounded-lg shadow-sm">
              <ClientOnly fallback={
                <div className="min-h-[400px] p-4 flex items-center justify-center">
                  <div className="text-cozy-text-muted">Loading editor...</div>
                </div>
              }>
                <ModernTiptapEditor
                  content={note.contentJson || note.content}
                  onUpdate={handleContentUpdate}
                  placeholder={userCanEdit ? "Start writing your note..." : "This note is read-only"}
                  editable={userCanEdit}
                  collabDocId={undefined}
                  userInfo={userInfo}
                  className="min-h-[400px]"
                />
              </ClientOnly>
            </div>
          </div>

          {/* Collaborators Panel */}
          {showCollaborators && note.isShared && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Collaborators</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {note.createdBy.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-900">{note.createdBy.name}</span>
                  <span className="text-gray-500">(Owner)</span>
                </div>
                {note.collaborators.map((collab) => (
                  <div key={collab.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {collab.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-900">{collab.user.name}</span>
                    <span className="text-gray-500">({collab.role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Button (Bottom Right) */}
        {userCanEdit && note.createdBy.id === session.user?.id && (
          <div className="fixed bottom-6 right-6">
            <button
              onClick={handleDelete}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </ModernAppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!
  const { req, res } = context

  try {
    // Get the note
    const note = await prisma.note.findUnique({
      where: { id: id as string },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        household: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!note) {
      return {
        notFound: true
      }
    }

    // For now, we'll assume the user can edit if they're the owner
    // In a real app, you'd check the session here
    const userCanEdit = true // This should be determined by session/auth

    return {
      props: {
        note: {
          ...note,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          collaborators: note.collaborators.map(collab => ({
            ...collab,
            addedAt: collab.addedAt.toISOString()
          }))
        },
        userCanEdit
      }
    }
  } catch (error) {
    console.error('Error fetching note:', error)
    return {
      notFound: true
    }
  }
}

