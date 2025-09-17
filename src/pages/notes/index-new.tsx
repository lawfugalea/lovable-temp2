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
  category?: string;
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
  const [newItemCategory, setNewItemCategory] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
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
    }, 2000);
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
  }, [title, content, note.title, note.content]);

  // Auto-save for other properties
  const saveProperty = async (updates: Partial<Note>) => {
    try {
      await onUpdate(note.id, updates);
    } catch (error) {
      console.error('Failed to save property:', error);
    }
  };

  useEffect(() => {
    if (color !== note.color) {
      saveProperty({ color });
    }
  }, [color, note.color]);

  useEffect(() => {
    if (visibility !== note.visibility) {
      saveProperty({ visibility });
    }
  }, [visibility, note.visibility]);

  useEffect(() => {
    if (isPinned !== note.isPinned) {
      saveProperty({ isPinned });
    }
  }, [isPinned, note.isPinned]);

  const addChecklistItem = async () => {
    if (!newChecklistItem.trim() || isAddingItem) return;
    setIsAddingItem(true);

    try {
      const response = await fetch(`/api/notes/${currentNote.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: newChecklistItem.trim(),
          category: newItemCategory.trim() || null
        })
      });

      if (response.ok) {
        const noteResponse = await fetch(`/api/notes/${currentNote.id}`);
        if (noteResponse.ok) {
          const updatedNote = await noteResponse.json();
          setCurrentNote(updatedNote);
          onUpdate(currentNote.id, updatedNote);
        }
        setNewChecklistItem('');
        setNewItemCategory('');
        setShowCategoryInput(false);
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
    try {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const noteResponse = await fetch(`/api/notes/${currentNote.id}`);
        if (noteResponse.ok) {
          const updatedNote = await noteResponse.json();
          setCurrentNote(updatedNote);
          onUpdate(currentNote.id, updatedNote);
        }
      }
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
    }
  };

  const changeNoteType = async (newType: 'TEXT' | 'CHECKLIST') => {
    if (saving) return;
    setSaving(true);
    
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
        setCurrentNote(currentNote);
      }
    } catch (error) {
      console.error('Failed to change note type:', error);
      setCurrentNote(currentNote);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-50">
      <div className={`w-full h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[95vh] shadow-2xl ${getColorClasses(color, 'modal')} rounded-none md:rounded-3xl border-0 md:border border-white/20 flex flex-col overflow-hidden`}>
        
        {/* Minimal Header */}
        <div className="bg-white/20 backdrop-blur-md border-b border-white/20 p-3 md:p-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/30 transition-all touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-lg font-bold bg-transparent border-0 outline-none text-gray-900 placeholder-gray-600"
              placeholder="Note title..."
            />
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => changeNoteType(currentNote.type === 'TEXT' ? 'CHECKLIST' : 'TEXT')}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all touch-manipulation"
                title="Switch type"
              >
                {currentNote.type === 'TEXT' ? '✅' : '📝'}
              </button>
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`p-2 rounded-lg transition-all touch-manipulation ${
                  isPinned ? 'bg-orange-500/20 text-orange-600' : 'hover:bg-white/30'
                }`}
              >
                {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-500 transition-all touch-manipulation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentNote.type === 'TEXT' ? (
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your note here... ✍️

💡 Your note auto-saves as you type!"
              className="w-full h-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl outline-none resize-none text-base md:text-lg placeholder-gray-600 transition-all"
              style={{ minHeight: 'calc(100vh - 200px)' }}
            />
          ) : (
            <div className="h-full flex flex-col">
              {/* Progress */}
              {currentNote.checklistItems && currentNote.checklistItems.length > 0 && (
                <div className="bg-white/10 rounded-xl p-3 mb-4 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {currentNote.checklistItems.filter(item => item.isChecked).length} of {currentNote.checklistItems.length} done
                    </span>
                    <span className="text-xs text-gray-500 bg-white/20 px-2 py-1 rounded">
                      {Math.round((currentNote.checklistItems.filter(item => item.isChecked).length / currentNote.checklistItems.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(currentNote.checklistItems.filter(item => item.isChecked).length / currentNote.checklistItems.length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Checklist Items */}
              <div className="flex-1 overflow-y-auto">
                {!currentNote.checklistItems || currentNote.checklistItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-800">Start Your Checklist</h3>
                    <p className="text-gray-600 mb-6">Add items below and organize them with categories</p>
                    <div className="bg-blue-50/20 rounded-xl p-4 text-sm text-gray-600">
                      <p className="font-bold mb-2">💡 How to use:</p>
                      <p>• Type what you need to do</p>
                      <p>• Press 📁 to add categories</p>
                      <p>• Tap items to check them off</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const groupedItems = currentNote.checklistItems.reduce((groups: Record<string, ChecklistItem[]>, item) => {
                        const category = item.category || 'General';
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(item);
                        return groups;
                      }, {});

                      return Object.entries(groupedItems)
                        .sort(([a], [b]) => a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b))
                        .map(([category, items]) => (
                          <div key={category} className="bg-white/5 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <span>{category === 'General' ? '📋' : '📁'}</span>
                                {category}
                              </h4>
                              <span className="text-xs text-gray-500 bg-white/20 px-2 py-1 rounded">
                                {items.filter(item => item.isChecked).length}/{items.length}
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all group">
                                  <button
                                    onClick={() => toggleChecklistItem(item.id, item.isChecked)}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all touch-manipulation ${
                                      item.isChecked 
                                        ? 'bg-green-500 border-green-500 text-white' 
                                        : 'border-gray-400 hover:border-green-400'
                                    }`}
                                  >
                                    {item.isChecked && <span className="text-sm font-bold">✓</span>}
                                  </button>
                                  
                                  <span className={`flex-1 text-base cursor-pointer ${item.isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                    onClick={() => toggleChecklistItem(item.id, item.isChecked)}
                                  >
                                    {item.text}
                                  </span>
                                  
                                  <button
                                    onClick={() => deleteChecklistItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 text-red-500 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Add Item Bar - Checklist Only */}
        {currentNote.type === 'CHECKLIST' && (
          <div className="bg-white/20 backdrop-blur-md border-t border-white/20 p-4 shrink-0">
            {showCategoryInput && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">📁</span>
                <input
                  type="text"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  placeholder="Category name (e.g., Clothes, Groceries)..."
                  className="flex-1 px-3 py-2 bg-white/20 rounded-xl border border-white/20 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowCategoryInput(false);
                    setNewItemCategory('');
                  }}
                  className="p-2 rounded-lg hover:bg-white/20 text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="What do you need to do? (Press Enter to add)"
                className="flex-1 px-4 py-3 bg-white/20 rounded-xl border border-white/20 text-base placeholder-gray-600"
              />
              
              {!showCategoryInput && (
                <button
                  onClick={() => setShowCategoryInput(true)}
                  className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
                  title="Add category"
                >
                  📁
                </button>
              )}
              
              <button
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim() || isAddingItem}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 font-medium transition-all"
              >
                {isAddingItem ? 'Adding...' : 'Add'}
              </button>
            </div>
            
            {newItemCategory && (
              <div className="mt-2 text-sm text-gray-600">
                Adding to: <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">📁 {newItemCategory}</span>
              </div>
            )}
          </div>
        )}

        {/* Mobile Save Status */}
        <div className="block md:hidden fixed top-4 right-4 z-10">
          {saving ? (
            <div className="flex items-center gap-2 text-xs bg-orange-500 text-white px-3 py-2 rounded-xl shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Saving...</span>
            </div>
          ) : hasUnsavedChanges ? (
            <div className="flex items-center gap-2 text-xs bg-amber-500 text-white px-3 py-2 rounded-xl shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Unsaved</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs bg-green-500 text-white px-3 py-2 rounded-xl shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Saved</span>
            </div>
          )}
        </div>

        {/* Mobile Color Picker */}
        <div className="block md:hidden fixed bottom-4 left-4 z-10">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-xl">
            <div className="flex gap-1">
              {colorOptions.slice(0, 6).map(colorOption => (
                <button
                  key={colorOption.name}
                  onClick={() => setColor(colorOption.name)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all touch-manipulation ${
                    color === colorOption.name 
                      ? 'border-gray-800 scale-110' 
                      : 'border-white/40'
                  } ${colorOption.bg}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // Handle file upload here
            }
          }}
          className="hidden"
        />
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
                onClick={() => onDelete(currentNote.id)}
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

// Rest of the component stays the same...
export default function NotesPage() {
  // All the existing state and functions remain the same
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
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Notes page useEffect - status:', status, 'session:', !!session);
    }
    if (status === 'loading') return;
    if (!session) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No session found - middleware should handle redirect');
      }
      return;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('Session found, fetching notes...');
    }
    fetchNotes();
  }, [session, status, router]);

  const fetchNotes = async () => {
    try {
      setDebugInfo('');
      const response = await fetch('/api/notes');
      
      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('Notes fetched successfully:', data.length, 'notes');
        }
        setNotes(data);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch notes. Status:', response.status, 'Response:', errorData);
        setDebugInfo(`Error ${response.status}: ${errorData}`);
        if (response.status === 401) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Unauthorized - session may have expired');
          }
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setDebugInfo(`Network error: ${error}`);
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

  if (status === 'loading') {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </ModernAppShell>
    );
  }

  if (!session) {
    return (
      <ModernAppShell title="Notes">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      </ModernAppShell>
    );
  }

  if (loading) {
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
        {/* Debug Info - only show if there are errors */}
        {process.env.NODE_ENV === 'development' && debugInfo && debugInfo.includes('Error') && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-sm">
            <strong>Debug Error:</strong> {debugInfo}
            <br />
            <strong>Session:</strong> {session ? `User: ${session.user?.email}` : 'No session'}
            <br />
            <strong>Status:</strong> {status}
          </div>
        )}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Family Notes</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Share notes and checklists with your family</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => {
                  setLoading(true);
                  fetchNotes();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-medium transition-colors"
                disabled={loading}
              >
                🔄 {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-medium transition-colors w-full sm:w-auto"
              disabled={isCreating}
            >
              <Plus className="w-5 h-5" />
              <span className="whitespace-nowrap">{isCreating ? 'Creating...' : 'New Note'}</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-base"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter by color:</span>
              <span className="sm:hidden">Filter:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setSelectedColor('all')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  selectedColor === 'all' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                All
              </button>
              {colorOptions.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 border ${
                    selectedColor === color.name 
                      ? 'bg-orange-500 text-white border-orange-500' 
                      : `${color.bg} text-gray-600 hover:opacity-80 border-gray-200`
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className={`backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/30 p-3 sm:p-4 md:p-6 cursor-pointer group hover:scale-[1.01] sm:hover:scale-[1.02] md:hover:scale-105 transition-all duration-300 shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl ${getColorClasses(note.color, 'card')} hover:border-white/50 active:scale-[0.98] touch-manipulation`}
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
                    className="ml-2 p-2 rounded-full hover:bg-white/50 transition-colors touch-manipulation"
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
                            className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity touch-manipulation"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(image);
                            }}
                          />
                        </div>
                      ))}
                      {note.images.length > 3 && (
                        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
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
                          <div className="flex-1">
                            {item.category && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded mr-2">
                                {item.category}
                              </span>
                            )}
                            <span className={item.isChecked ? 'line-through text-gray-500' : 'text-gray-700'}>
                              {item.text}
                            </span>
                          </div>
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
