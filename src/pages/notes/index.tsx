import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ModernAppShell from '../../components/ModernAppShell';
import SEO from '../../components/SEO';
import { Plus, Pin, PinOff, Search, Filter, Eye, EyeOff, Lock, Save, Trash2, X, Palette } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
  order: number;
}

interface NoteImage {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  type: 'TEXT' | 'CHECKLIST';
  color: string;
  isPinned: boolean;
  visibility: 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY';
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  checklistItems: ChecklistItem[];
  images: NoteImage[];
}

const colorOptions = [
  { name: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', cardBg: 'bg-yellow-50/90', modalBg: 'bg-yellow-50' },
  { name: 'green', label: 'Green', bg: 'bg-green-100', border: 'border-green-300', cardBg: 'bg-green-50/90', modalBg: 'bg-green-50' },
  { name: 'blue', label: 'Blue', bg: 'bg-blue-100', border: 'border-blue-300', cardBg: 'bg-blue-50/90', modalBg: 'bg-blue-50' },
  { name: 'purple', label: 'Purple', bg: 'bg-purple-100', border: 'border-purple-300', cardBg: 'bg-purple-50/90', modalBg: 'bg-purple-50' },
  { name: 'pink', label: 'Pink', bg: 'bg-pink-100', border: 'border-pink-300', cardBg: 'bg-pink-50/90', modalBg: 'bg-pink-50' },
  { name: 'red', label: 'Red', bg: 'bg-red-100', border: 'border-red-300', cardBg: 'bg-red-50/90', modalBg: 'bg-red-50' },
  { name: 'orange', label: 'Orange', bg: 'bg-orange-100', border: 'border-orange-300', cardBg: 'bg-orange-50/90', modalBg: 'bg-orange-50' },
  { name: 'gray', label: 'Gray', bg: 'bg-gray-100', border: 'border-gray-300', cardBg: 'bg-gray-50/90', modalBg: 'bg-gray-50' },
];

const getColorClasses = (color: string, type: 'card' | 'modal' | 'picker' = 'card') => {
  const colorOption = colorOptions.find(c => c.name === color) || colorOptions[0];
  if (type === 'card') {
    return `${colorOption.cardBg} ${colorOption.border}`;
  } else if (type === 'modal') {
    return `${colorOption.modalBg} ${colorOption.border}`;
  } else {
    return `${colorOption.bg} ${colorOption.border}`;
  }
};

interface NoteEditModalProps {
  note: Note;
  onClose: () => void;
  onUpdate: (noteId: string, updates: Partial<Note>) => void;
  onDelete: (noteId: string) => void;
  onImageClick: (image: NoteImage) => void;
}

function NoteEditModal({ note, onClose, onUpdate, onDelete, onImageClick }: NoteEditModalProps) {
  const [currentNote, setCurrentNote] = useState(note);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [color, setColor] = useState(note.color);
  const [visibility, setVisibility] = useState(note.visibility);
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [saving, setSaving] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when note prop changes
  useEffect(() => {
    setCurrentNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setColor(note.color);
    setVisibility(note.visibility);
    setIsPinned(note.isPinned);
  }, [note]);

  const saveNote = async () => {
    if (saving) return;
    setSaving(true);
    
    try {
      await onUpdate(note.id, {
        title: title.trim(),
        content: content.trim(),
        color,
        visibility,
        isPinned
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save function with debouncing
  const autoSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 2000); // Auto-save after 2 seconds of inactivity (better UX)
  };

  // Auto-save when title or content changes
  useEffect(() => {
    const hasChanges = title !== note.title || content !== (note.content || '');
    setHasUnsavedChanges(hasChanges);
    
    if (hasChanges) {
      autoSave();
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content]);

  // Auto-save for other properties (immediate save for these)
  const saveProperty = async (updates: Partial<Note>) => {
    try {
      await onUpdate(note.id, updates);
    } catch (error) {
      console.error('Failed to save property:', error);
    }
  };

  // Auto-save when color changes
  useEffect(() => {
    if (color !== note.color) {
      saveProperty({ color });
    }
  }, [color]);

  // Auto-save when visibility changes
  useEffect(() => {
    if (visibility !== note.visibility) {
      saveProperty({ visibility });
    }
  }, [visibility]);

  // Auto-save when pin status changes
  useEffect(() => {
    if (isPinned !== note.isPinned) {
      saveProperty({ isPinned });
    }
  }, [isPinned]);

  // Keyboard shortcut for save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addChecklistItem = async () => {
    if (!newChecklistItem.trim() || isAddingItem) return;
    setIsAddingItem(true);

    try {
      const response = await fetch(`/api/notes/${currentNote.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newChecklistItem.trim() })
      });

      if (response.ok) {
        const newItem = await response.json();
        // Refresh the note data
        const noteResponse = await fetch(`/api/notes/${currentNote.id}`);
        if (noteResponse.ok) {
          const updatedNote = await noteResponse.json();
          setCurrentNote(updatedNote);
          onUpdate(currentNote.id, updatedNote);
        }
        setNewChecklistItem('');
        
        // Auto-scroll to input on mobile after adding item
        setTimeout(() => {
          const inputElement = document.querySelector('input[placeholder*="Add new checklist item"]') as HTMLInputElement;
          if (inputElement) {
            inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputElement.focus();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to add checklist item:', error);
    } finally {
      setIsAddingItem(false);
    }
  };

  const toggleChecklistItem = async (itemId: string, isChecked: boolean) => {
    try {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked: !isChecked })
      });

      if (response.ok) {
        // Refresh the note data
        const noteResponse = await fetch(`/api/notes/${currentNote.id}`);
        if (noteResponse.ok) {
          const updatedNote = await noteResponse.json();
          setCurrentNote(updatedNote);
          onUpdate(currentNote.id, updatedNote);
        }
      }
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
    }
  };

  const deleteChecklistItem = async (itemId: string) => {
    // Optimistic update - remove item immediately from UI
    const optimisticUpdate = {
      ...currentNote,
      checklistItems: (currentNote.checklistItems || []).filter(item => item.id !== itemId)
    };
    setCurrentNote(optimisticUpdate);
    onUpdate(currentNote.id, optimisticUpdate);

    try {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        const noteResponse = await fetch(`/api/notes/${currentNote.id}`);
        if (noteResponse.ok) {
          const revertedNote = await noteResponse.json();
          setCurrentNote(revertedNote);
          onUpdate(currentNote.id, revertedNote);
        }
        console.error('Failed to delete checklist item');
      }
    } catch (error) {
      // Revert optimistic update on error
      const noteResponse = await fetch(`/api/notes/${currentNote.id}`);
      if (noteResponse.ok) {
        const revertedNote = await noteResponse.json();
        setCurrentNote(revertedNote);
        onUpdate(currentNote.id, revertedNote);
      }
      console.error('Failed to delete checklist item:', error);
    }
  };

  const handleDeleteNote = () => {
    onDelete(currentNote.id);
  };

  const uploadImage = async (file: File) => {
    if (uploadingImage) return;
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/notes/${currentNote.id}/images`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newImage = await response.json();
        const updatedNote = {
          ...currentNote,
          images: [...(currentNote.images || []), newImage]
        };
        setCurrentNote(updatedNote);
        onUpdate(currentNote.id, updatedNote);
      } else {
        console.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const deleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/notes/images/${imageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedNote = {
          ...currentNote,
          images: (currentNote.images || []).filter(img => img.id !== imageId)
        };
        setCurrentNote(updatedNote);
        onUpdate(currentNote.id, updatedNote);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const changeNoteType = async (newType: 'TEXT' | 'CHECKLIST') => {
    if (saving) return;
    setSaving(true);
    
    // Immediately update the local state for snappy UI
    const optimisticUpdate = {
      ...currentNote,
      type: newType
    };
    setCurrentNote(optimisticUpdate);
    
    try {
      const response = await fetch(`/api/notes/${currentNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType })
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setCurrentNote(updatedNote);
        onUpdate(currentNote.id, updatedNote);
      } else {
        // Revert on error
        setCurrentNote(currentNote);
      }
    } catch (error) {
      console.error('Failed to change note type:', error);
      // Revert on error
      setCurrentNote(currentNote);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
      <div className={`rounded-t-3xl md:rounded-3xl w-full max-w-5xl max-h-[100vh] md:max-h-[95vh] overflow-hidden shadow-2xl ${getColorClasses(color, 'modal')} h-full md:h-auto border-0 md:border border-white/20`}>
        {/* Header */}
        <div className="bg-white/20 backdrop-blur-md border-b border-white/20 p-3 md:p-6">
          {/* Mobile Header - Compact Layout */}
          <div className="block md:hidden">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                    isPinned ? 'bg-orange-500/20 text-orange-600' : 'hover:bg-white/30'
                  }`}
                >
                  {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-xl hover:bg-red-500/20 text-red-500 transition-all duration-200 backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 flex items-center gap-1 text-sm shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? '...' : 'Save'}</span>
                </button>
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== note.title) {
                  saveNote();
                }
              }}
              className="w-full text-lg font-bold bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 outline-none text-gray-900 placeholder-gray-600 focus:bg-white/20 focus:border-white/40 transition-all duration-200"
              placeholder="Note title..."
            />
          </div>

          {/* Desktop Header - Original Layout */}
          <div className="hidden md:flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title !== note.title) {
                    saveNote();
                  }
                }}
                className="text-2xl font-bold bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 outline-none flex-1 min-w-0 text-gray-900 placeholder-gray-600 focus:bg-white/20 focus:border-white/40 transition-all duration-200"
                placeholder="Note title..."
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`p-2 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                  isPinned ? 'bg-orange-500/20 text-orange-600 border border-orange-300/30' : 'hover:bg-white/30 border border-transparent'
                }`}
              >
                {isPinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-xl hover:bg-red-500/20 text-red-500 transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-red-300/30"
                title="Delete note"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={saveNote}
                disabled={saving}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-2xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 flex items-center gap-2 text-base shadow-lg backdrop-blur-sm transition-all duration-200 border border-orange-400/30"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              
              {/* Auto-save indicator */}
              {saving ? (
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-500">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">Saving...</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-amber-600">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="hidden sm:inline">Unsaved changes</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="hidden sm:inline">Saved</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-3 md:mt-0">
            {/* Mobile: Compact horizontal layout */}
            <div className="flex items-center justify-between gap-2 md:hidden">
              <div className="flex bg-white/20 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
                <button
                  onClick={() => changeNoteType('TEXT')}
                  disabled={saving}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    currentNote.type === 'TEXT' 
                      ? 'bg-white/40 text-gray-900 shadow-sm' 
                      : 'text-gray-700 hover:bg-white/20'
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => changeNoteType('CHECKLIST')}
                  disabled={saving}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    currentNote.type === 'CHECKLIST' 
                      ? 'bg-white/40 text-gray-900 shadow-sm' 
                      : 'text-gray-700 hover:bg-white/20'
                  }`}
                >
                  List
                </button>
              </div>
              
              <div className="flex items-center gap-1 p-1 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20">
                {colorOptions.slice(0, 6).map(colorOption => (
                  <button
                    key={colorOption.name}
                    onClick={() => setColor(colorOption.name)}
                    className={`w-6 h-6 rounded-lg border transition-all duration-200 ${
                      color === colorOption.name 
                        ? 'border-gray-800 scale-110' 
                        : 'border-white/40'
                    } ${colorOption.bg}`}
                    title={colorOption.label}
                  />
                ))}
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="p-2 bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/30 disabled:opacity-50 transition-all duration-200"
              >
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-orange-500 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Mobile: Visibility selector */}
            <div className="flex items-center justify-center mt-2 md:hidden">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY')}
                className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl px-3 py-2 text-sm focus:bg-white/30 focus:border-white/40 transition-all duration-200"
              >
                <option value="PRIVATE">🔒 Private</option>
                <option value="HOUSEHOLD">👥 Household</option>
                <option value="READ_ONLY">👁️ Read Only</option>
              </select>
            </div>

            {/* Desktop: Original layout */}
            <div className="hidden md:flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <div className="flex bg-white/20 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
                    <button
                      onClick={() => changeNoteType('TEXT')}
                      disabled={saving}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        currentNote.type === 'TEXT' 
                          ? 'bg-white/40 text-gray-900 shadow-sm backdrop-blur-sm border border-white/30' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-white/20'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {saving && currentNote.type === 'TEXT' ? '...' : 'Text'}
                    </button>
                    <button
                      onClick={() => changeNoteType('CHECKLIST')}
                      disabled={saving}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        currentNote.type === 'CHECKLIST' 
                          ? 'bg-white/40 text-gray-900 shadow-sm backdrop-blur-sm border border-white/30' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-white/20'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {saving && currentNote.type === 'CHECKLIST' ? '...' : 'Checklist'}
                    </button>
                  </div>
                </div>
              </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">Color:</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20 flex-wrap">
                {colorOptions.map(colorOption => (
                  <button
                    key={colorOption.name}
                    onClick={() => setColor(colorOption.name)}
                    className={`w-8 h-8 sm:w-7 sm:h-7 rounded-xl border-2 transition-all duration-200 hover:scale-110 shadow-sm ${
                      color === colorOption.name 
                        ? 'border-gray-800 scale-110 shadow-lg' 
                        : 'border-white/40 hover:border-gray-400'
                    } ${colorOption.bg}`}
                    title={colorOption.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-2 px-4 py-3 sm:py-2 bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-white/30 disabled:opacity-50 text-sm transition-all duration-200 shadow-sm flex-1 sm:flex-initial justify-center sm:justify-start"
                >
                  {uploadingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-orange-500 rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Add Image</span>
                    </>
                  )}
                </button>
              </div>

            <div className="flex items-center gap-2">
              {visibility === 'PRIVATE' && <Lock className="w-4 h-4 text-red-500" />}
              {visibility === 'HOUSEHOLD' && <Eye className="w-4 h-4 text-green-500" />}
              {visibility === 'READ_ONLY' && <EyeOff className="w-4 h-4 text-blue-500" />}
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY')}
                className="border border-gray-200 rounded-lg px-3 py-1 text-sm"
              >
                <option value="PRIVATE">Private</option>
                <option value="HOUSEHOLD">Household</option>
                <option value="READ_ONLY">Read Only</option>
              </select>
            </div>
          </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 md:p-6 overflow-y-auto flex-1 md:max-h-[calc(90vh-200px)]">
          {currentNote.type === 'TEXT' ? (
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => {
                // Save immediately when user leaves content field
                if (content !== (note.content || '')) {
                  saveNote();
                }
              }}
              placeholder="Start writing your note..."
              className={`w-full p-4 md:p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl focus:bg-white/15 focus:border-white/40 resize-none min-h-[50vh] md:min-h-[400px] text-base md:text-lg placeholder-gray-600 transition-all duration-200 shadow-inner ${getColorClasses(color, 'modal')}`}
            />
          ) : null}

          {/* Images Section */}
          {currentNote.images && currentNote.images.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentNote.images.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.url}
                      alt={image.originalName}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onImageClick(image)}
                    />
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Delete image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {image.originalName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentNote.type === 'CHECKLIST' ? (
            <div className="space-y-6">
              {/* Progress */}
              {currentNote.checklistItems && currentNote.checklistItems.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-medium text-gray-700">
                      {(currentNote.checklistItems || []).filter(item => item.isChecked).length} of {(currentNote.checklistItems || []).length} completed
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round(((currentNote.checklistItems || []).filter(item => item.isChecked).length / (currentNote.checklistItems || []).length) * 100)}%
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${((currentNote.checklistItems || []).filter(item => item.isChecked).length / (currentNote.checklistItems || []).length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Checklist Items */}
              <div className="space-y-3 mb-6">
                {!currentNote.checklistItems || currentNote.checklistItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-lg font-medium">No checklist items yet</p>
                    <p className="text-sm">Add your first item below to get started!</p>
                  </div>
                ) : (
                  currentNote.checklistItems?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 group p-4 md:p-3 rounded-2xl hover:bg-white/10 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20">
                    <button
                      onClick={() => toggleChecklistItem(item.id, item.isChecked)}
                      className={`w-7 h-7 md:w-6 md:h-6 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-110 ${
                        item.isChecked 
                          ? 'bg-green-500 border-green-500 text-white shadow-md' 
                          : 'border-gray-400 hover:border-green-400 hover:bg-green-50/50'
                      }`}
                    >
                      {item.isChecked && <span className="text-sm font-bold">✓</span>}
                    </button>
                    
                    <span className={`flex-1 text-base md:text-lg ${item.isChecked ? 'line-through text-gray-500' : 'text-gray-900'} cursor-pointer`}
                      onClick={() => toggleChecklistItem(item.id, item.isChecked)}
                    >
                      {item.text}
                    </span>
                    
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="opacity-70 md:opacity-0 group-hover:opacity-100 p-2 md:p-2 rounded-xl hover:bg-red-500/20 text-red-500 transition-all"
                      title="Delete item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  ))
                )}
              </div>
              
              {/* Add New Item */}
              <div className="border-t border-white/20 pt-6 mt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                            onFocus={() => {
                              // Auto-scroll to input on mobile when focused
                              setTimeout(() => {
                                const inputElement = document.querySelector('input[placeholder*="Add new checklist item"]') as HTMLInputElement;
                                if (inputElement && window.innerWidth < 768) {
                                  inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 100);
                            }}
                            placeholder="Add new checklist item..."
                            className="flex-1 px-4 py-4 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:bg-white/15 focus:border-white/40 text-base transition-all duration-200 placeholder-gray-600"
                          />
                  <button
                    onClick={addChecklistItem}
                    disabled={!newChecklistItem.trim() || isAddingItem}
                    className="px-6 py-4 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 flex items-center justify-center sm:justify-start gap-2 font-medium transition-all duration-200 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    {isAddingItem ? 'Adding...' : 'Add Item'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  💡 Tip: Press Enter to quickly add items
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Note</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{currentNote.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNote}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'TEXT' as 'TEXT' | 'CHECKLIST',
    color: 'yellow',
    visibility: 'HOUSEHOLD' as 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<NoteImage | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchNotes();
  }, [session, status, router]);

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNote.title.trim()) {
      alert('Please enter a note title');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });

      if (response.ok) {
        const createdNote = await response.json();
        setNotes(prev => [createdNote, ...prev]);
        setNewNote({
          title: '',
          content: '',
          type: 'TEXT',
          color: 'yellow',
          visibility: 'HOUSEHOLD'
        });
        setShowCreateModal(false);
        router.push(`/notes/${createdNote.id}`);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const togglePin = async (noteId: string, isPinned: boolean) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !isPinned })
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(prev => prev.map(note => 
          note.id === noteId ? updatedNote : note
        ));
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingNote(null);
    setShowEditModal(false);
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(prev => prev.map(note => 
          note.id === noteId ? updatedNote : note
        ));
        if (editingNote?.id === noteId) {
          setEditingNote(updatedNote);
        }
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
        closeEditModal();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColor = selectedColor === 'all' || note.color === selectedColor;
    return matchesSearch && matchesColor;
  });

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PRIVATE':
        return <Lock className="w-4 h-4 text-red-500" />;
      case 'READ_ONLY':
        return <EyeOff className="w-4 h-4 text-yellow-500" />;
      default:
        return <Eye className="w-4 h-4 text-green-500" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notes...</p>
          </div>
        </div>
      </ModernAppShell>
    );
  }

  return (
    <ModernAppShell title="Notes">
      <SEO title="Family Notes - HouseFlow" description="Create and manage your family notes" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Notes</h1>
            <p className="text-gray-600 mt-1">Share notes and checklists with your family</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-medium transition-colors"
            disabled={isCreating}
          >
            <Plus className="w-5 h-5" />
            {isCreating ? 'Creating...' : 'New Note'}
          </button>
        </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
              />
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>Filter by color:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedColor('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedColor === 'all' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {colorOptions.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedColor === color.name 
                        ? 'bg-orange-500 text-white' 
                        : `${color.bg} text-gray-600 hover:opacity-80`
                    }`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedColor !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first note to get started'
                }
              </p>
              {!searchQuery && selectedColor === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-medium transition-colors"
                >
                  Create Note
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  className={`backdrop-blur-md rounded-3xl border border-white/30 p-4 md:p-6 cursor-pointer group hover:scale-[1.02] md:hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl ${getColorClasses(note.color, 'card')} hover:border-white/50`}
                  onClick={() => openEditModal(note)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                      {note.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(note.id, note.isPinned);
                      }}
                      className="ml-2 p-1 rounded-full hover:bg-white/50 transition-colors"
                    >
                      {note.isPinned ? (
                        <Pin className="w-4 h-4 text-orange-500" />
                      ) : (
                        <PinOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Images Preview */}
                  {note.images && note.images.length > 0 && (
                    <div className="mb-3">
                      <div className="flex gap-2 overflow-x-auto">
                        {note.images.slice(0, 3).map((image) => (
                          <div key={image.id} className="flex-shrink-0">
                            <img
                              src={image.url}
                              alt={image.originalName}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(image);
                              }}
                            />
                          </div>
                        ))}
                        {note.images.length > 3 && (
                          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">+{note.images.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {note.type === 'CHECKLIST' ? (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-2">
                        {note.checklistItems.filter(item => item.isChecked).length} of {note.checklistItems.length} completed
                      </div>
                      <div className="space-y-1">
                        {note.checklistItems.slice(0, 3).map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <div className={`w-3 h-3 rounded border ${item.isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                              {item.isChecked && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
                            </div>
                            <span className={item.isChecked ? 'line-through text-gray-500' : 'text-gray-700'}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                        {note.checklistItems.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{note.checklistItems.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {note.content}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      {getVisibilityIcon(note.visibility)}
                      <span className="text-xs">{note.owner.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        {/* Create Note Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Note</h2>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Note title..."
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newNote.type}
                      onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value as 'TEXT' | 'CHECKLIST' }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="TEXT">Text Note</option>
                      <option value="CHECKLIST">Checklist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                    <select
                      value={newNote.visibility}
                      onChange={(e) => setNewNote(prev => ({ ...prev, visibility: e.target.value as 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY' }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="HOUSEHOLD">Family Shared</option>
                      <option value="PRIVATE">Private</option>
                      <option value="READ_ONLY">Read Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.name}
                        onClick={() => setNewNote(prev => ({ ...prev, color: color.name }))}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newNote.color === color.name ? 'border-gray-800' : 'border-gray-300'
                        } ${color.bg}`}
                      />
                    ))}
                  </div>
                </div>

                {newNote.type === 'TEXT' && (
                  <textarea
                    placeholder="Note content..."
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent h-32 resize-none"
                  />
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNote}
                    disabled={!newNote.title.trim() || isCreating}
                    className="px-6 py-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create Note'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Note Modal */}
        {showEditModal && editingNote && (
          <NoteEditModal
            note={editingNote}
            onClose={closeEditModal}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onImageClick={setSelectedImage}
          />
        )}

        {/* Image Viewer Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.originalName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg">
                <p className="font-medium">{selectedImage.originalName}</p>
                <p className="text-sm text-gray-300">
                  {(selectedImage.size / 1024).toFixed(1)} KB • {selectedImage.mimeType}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernAppShell>
  );
}