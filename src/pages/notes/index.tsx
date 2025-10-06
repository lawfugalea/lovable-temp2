import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import ModernAppShell from '../../components/ModernAppShell';
import SEO from '../../components/SEO';
import { Plus, Pin, PinOff, Search, Filter, Eye, EyeOff, Lock, Save, Trash2, X, Palette, FolderPlus, GripVertical, Settings, FileText, Users } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  { name: 'cream', label: 'Cream', bg: 'bg-cozy-cream', border: 'border-cozy-sand', cardBg: 'bg-cozy-cream/90', modalBg: 'bg-cozy-cream' },
  { name: 'sage', label: 'Sage', bg: 'bg-cozy-sage-soft', border: 'border-cozy-sage', cardBg: 'bg-cozy-sage-soft/90', modalBg: 'bg-cozy-sage-soft' },
  { name: 'terracotta', label: 'Terracotta', bg: 'bg-orange-100', border: 'border-cozy-terracotta', cardBg: 'bg-orange-50/90', modalBg: 'bg-orange-50' },
  { name: 'sand', label: 'Sand', bg: 'bg-cozy-sand', border: 'border-cozy-gray-300', cardBg: 'bg-cozy-sand/90', modalBg: 'bg-cozy-sand' },
  { name: 'primary', label: 'Coral', bg: 'bg-cozy-primary-soft', border: 'border-cozy-primary', cardBg: 'bg-cozy-primary-soft/90', modalBg: 'bg-cozy-primary-soft' },
  { name: 'warm', label: 'Warm Gray', bg: 'bg-cozy-gray-100', border: 'border-cozy-gray-300', cardBg: 'bg-cozy-gray-100/90', modalBg: 'bg-cozy-gray-100' },
  { name: 'yellow', label: 'Sunny', bg: 'bg-yellow-100', border: 'border-yellow-300', cardBg: 'bg-yellow-50/90', modalBg: 'bg-yellow-50' },
  { name: 'lavender', label: 'Lavender', bg: 'bg-purple-100', border: 'border-purple-300', cardBg: 'bg-purple-50/90', modalBg: 'bg-purple-50' },
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

// Sortable Task Item Component
function SortableTaskItem({ 
  item, 
  onToggle, 
  onDelete, 
  onCategoryChange,
  onEdit
}: { 
  item: ChecklistItem;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onCategoryChange: (id: string, category: string) => void;
  onEdit: (id: string, newText: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const editInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(item.text);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== item.text) {
      onEdit(item.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(item.text);
  };

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-2 px-2 bg-cozy-surface rounded-lg hover:bg-cozy-cream transition-all group ${
        isDragging ? 'shadow-cozy-lg' : 'shadow-cozy-sm'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-cozy-gray-100 rounded"
      >
        <GripVertical className="w-3 h-3 text-cozy-text-muted" />
      </div>
      
      <button
        onClick={() => onToggle(item.id, item.isChecked)}
        className={`w-4 h-4 md:w-5 md:h-5 rounded border-2 flex items-center justify-center transition-all ${
          item.isChecked 
            ? 'bg-cozy-primary border-cozy-primary text-white' 
            : 'border-cozy-gray-300 hover:border-cozy-primary'
        }`}
      >
        {item.isChecked && <span className="text-[10px] md:text-xs leading-none font-bold">✓</span>}
      </button>
      
      {isEditing ? (
        <input
          ref={editInputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSaveEdit();
            } else if (e.key === 'Escape') {
              handleCancelEdit();
            }
          }}
          onBlur={handleSaveEdit}
          className="flex-1 text-sm bg-white border border-cozy-primary rounded px-2 py-1 text-cozy-text focus:outline-none focus:ring-1 focus:ring-cozy-primary"
        />
      ) : (
        <span 
          className={`flex-1 text-sm cursor-pointer ${
            item.isChecked ? 'line-through text-cozy-text-soft' : 'text-cozy-text'
          }`}
          onClick={handleEdit}
          title="Click to edit"
        >
          {item.text}
        </span>
      )}
      
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// Droppable Category Component
function DroppableCategory({
  category,
  items,
  onToggle,
  onDelete,
  onCategoryChange,
  onDeleteCategory,
  onEdit
}: {
  category: string;
  items: ChecklistItem[];
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onCategoryChange: (id: string, category: string) => void;
  onDeleteCategory: (category: string) => void;
  onEdit: (id: string, newText: string) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const completedCount = items.filter(item => item.isChecked).length;
  const totalCount = items.length;
  
  return (
    <div className="bg-cozy-cream/50 rounded-lg border border-cozy-gray-200 p-3">
      <div 
        className="flex items-center justify-between mb-3 cursor-pointer hover:bg-cozy-cream/70 -m-1 p-1 rounded transition-all"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h4 className="text-sm font-semibold text-cozy-text flex items-center gap-2">
          <span className="text-base">{category === 'General' ? '📋' : '📁'}</span>
          <span>{category === 'General' ? 'Items' : category}</span>
          <button className="text-cozy-text-muted hover:text-cozy-text transition-colors">
            {isCollapsed ? '▶️' : '🔽'}
          </button>
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-cozy-text bg-cozy-primary-soft px-2 py-0.5 rounded-full font-medium">
            {items.filter(item => item.isChecked).length}/{items.length}
          </span>
          {category !== 'General' && (
            <button
              onClick={() => onDeleteCategory(category)}
              className="p-1 rounded hover:bg-red-100 text-red-500 transition-all"
              title="Delete category"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      {/* Collapsible Content */}
      <div className={`transition-all duration-300 overflow-hidden ${
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
      }`}>
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableTaskItem
                key={item.id}
                item={item}
                onToggle={onToggle}
                onDelete={onDelete}
                onCategoryChange={onCategoryChange}
                onEdit={onEdit}
              />
            ))}
          </div>
        </SortableContext>
      </div>
      
      {/* Collapsed Summary */}
      {isCollapsed && (
        <div className="mt-2 text-xs text-cozy-text-muted">
          {completedCount > 0 && (
            <span className="text-cozy-primary font-medium">
              {completedCount} completed
            </span>
          )}
          {completedCount > 0 && totalCount - completedCount > 0 && (
            <span className="mx-1">•</span>
          )}
          {totalCount - completedCount > 0 && (
            <span>
              {totalCount - completedCount} remaining
            </span>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop sensors with mobile support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Drag and drop handlers
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = currentNote.checklistItems.find(item => item.id === active.id);
    if (!activeItem) return;

    // If dropped on a category header or category container
    let newCategory = 'General';
    if (over.id.startsWith('category-')) {
      newCategory = over.id.replace('category-', '');
    } else {
      // If dropped on another item, use that item's category
      const overItem = currentNote.checklistItems.find(item => item.id === over.id);
      if (overItem) {
        newCategory = overItem.category || 'General';
      }
    }

    // Update the item's category
    if (activeItem.category !== newCategory) {
      await updateChecklistItemCategory(activeItem.id, newCategory);
    }
  };

  const updateChecklistItemCategory = async (itemId: string, newCategory: string) => {
    try {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory === 'General' ? null : newCategory })
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
      console.error('Failed to update item category:', error);
    }
  };

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    // Create a placeholder item in the new category to make it visible as a drop zone
    const placeholderText = `📁 ${newCategoryName.trim()} (drag items here)`;
    
    try {
      const response = await fetch(`/api/notes/${currentNote.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: placeholderText,
          category: newCategoryName.trim()
        })
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
      console.error('Failed to create category:', error);
    }
    
    setShowNewCategoryInput(false);
    setNewCategoryName('');
  };

  const deleteCategory = async (categoryName: string) => {
    if (categoryName === 'General') return;
    
    // Move all items in this category to General
    const itemsInCategory = currentNote.checklistItems.filter(item => item.category === categoryName);
    
    for (const item of itemsInCategory) {
      await updateChecklistItemCategory(item.id, 'General');
    }
  };

  const editChecklistItem = async (itemId: string, newText: string) => {
    try {
      const response = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
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
      console.error('Failed to edit checklist item:', error);
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 md:p-8 z-50">
      <div className="w-full h-full md:w-[90vw] md:h-[85vh] md:max-w-4xl bg-white shadow-2xl rounded-2xl md:rounded-3xl flex flex-col overflow-hidden">
        
        {/* Minimalist Header */}
        <div className="bg-white border-b border-gray-200 p-4 md:p-6 shrink-0">
          <div className="flex items-center gap-4 mb-4">
            {/* Back Button */}
            <button
              onClick={onClose}
              className="p-3 rounded-xl hover:bg-gray-100 transition-all"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-xl md:text-2xl font-bold bg-transparent border-0 outline-none text-gray-900 placeholder-gray-400"
              placeholder="Note title..."
            />
            
            {/* Status Indicator */}
            {saving ? (
              <div className="flex items-center gap-2 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Saving</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Saved</span>
              </div>
            )}
            
            {/* Settings Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="p-3 rounded-xl hover:bg-gray-100 text-gray-600 transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Settings Dropdown Menu */}
              {showSettingsMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Note Settings</h3>
                  </div>
                  
                  {/* Pin/Unpin */}
                  <button
                    onClick={() => {
                      setIsPinned(!isPinned);
                      setShowSettingsMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    {isPinned ? <PinOff className="w-4 h-4 text-gray-500" /> : <Pin className="w-4 h-4 text-gray-500" />}
                    <span className="text-sm text-gray-700">{isPinned ? 'Unpin Note' : 'Pin Note'}</span>
                  </button>
                  
                  {/* Color Picker */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Palette className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Color</span>
                    </div>
                    <div className="flex gap-2">
                      {colorOptions.slice(0, 6).map(colorOption => (
                        <button
                          key={colorOption.name}
                          onClick={() => {
                            setColor(colorOption.name);
                            setShowSettingsMenu(false);
                          }}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            color === colorOption.name 
                              ? 'border-gray-400 scale-110' 
                              : 'border-gray-200 hover:border-gray-300'
                          } ${colorOption.bg}`}
                          title={colorOption.label}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Note Type */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Type</span>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => {
                          changeNoteType('TEXT');
                          setShowSettingsMenu(false);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium transition-all ${
                          currentNote.type === 'TEXT' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>📝</span>
                        <span className="text-sm">Text</span>
                      </button>
                      <button
                        onClick={() => {
                          changeNoteType('CHECKLIST');
                          setShowSettingsMenu(false);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium transition-all ${
                          currentNote.type === 'CHECKLIST' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>✅</span>
                        <span className="text-sm">List</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Share Options */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Share</span>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      {[
                        { value: 'PRIVATE', label: 'Private', icon: '🔒' },
                        { value: 'HOUSEHOLD', label: 'Family', icon: '👥' },
                        { value: 'READ_ONLY', label: 'View Only', icon: '👁️' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setVisibility(option.value as 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY');
                            setShowSettingsMenu(false);
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md text-sm font-medium transition-all ${
                            visibility === option.value
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <span>{option.icon}</span>
                          <span className="text-xs">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Delete Note */}
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowSettingsMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Delete Note</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Context-Aware Add Category Button (only for checklists) */}
          {currentNote.type === 'CHECKLIST' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewCategoryInput(true)}
                className="flex items-center gap-2 px-3 py-2 bg-cozy-sage-soft border border-cozy-sage rounded-xl text-cozy-text hover:bg-cozy-sage hover:text-white transition-all"
                title="Add new category"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Category</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentNote.type === 'TEXT' ? (
            <>
              {/* Simple Text Editor */}
              <div className="flex-1 p-4 md:p-6">
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your note...

💡 Your note auto-saves as you type!"
                  className="w-full h-full p-4 md:p-6 bg-cozy-surface border border-cozy-gray-200 rounded-2xl outline-none resize-none text-base md:text-lg leading-relaxed placeholder-cozy-text-muted text-cozy-text focus:bg-cozy-surface focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all"
                  autoFocus
                />
              </div>
              
              {/* Bottom Toolbar */}
              <div className="bg-cozy-surface border-t border-cozy-gray-200 p-4 flex items-center justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-2 bg-cozy-primary text-white px-6 py-3 rounded-xl hover:bg-cozy-primary-deep disabled:opacity-50 transition-all font-medium"
                >
                  {uploadingImage ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span>Add Image</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Simple Progress */}
              {currentNote.checklistItems && currentNote.checklistItems.length > 0 && (
                <div className="bg-cozy-sage-soft/50 border border-cozy-sage rounded-lg p-2 mx-4 md:mx-6 mt-3 md:mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-cozy-text text-xs">
                      {currentNote.checklistItems.filter(item => item.isChecked).length} of {currentNote.checklistItems.length} done
                    </span>
                    <span className="text-xs text-cozy-primary font-bold bg-cozy-primary-soft px-1.5 py-0.5 rounded-full">
                      {Math.round((currentNote.checklistItems.filter(item => item.isChecked).length / currentNote.checklistItems.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-cozy-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-cozy-primary h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(currentNote.checklistItems.filter(item => item.isChecked).length / currentNote.checklistItems.length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Checklist Items */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {!currentNote.checklistItems || currentNote.checklistItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold mb-3 text-cozy-text">Start Your Checklist</h3>
                    <p className="text-cozy-text-muted mb-6">Add items below and organize with categories</p>
                    <div className="bg-cozy-sage-soft rounded-xl p-4 text-sm text-cozy-text border border-cozy-sage max-w-md">
                      <p className="font-semibold mb-2">💡 Tips:</p>
                      <p>• Press Enter to add items</p>
                      <p>• Use 📁 for categories</p>
                      <p>• Tap to check off</p>
                    </div>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      {(() => {
                        const groupedItems = currentNote.checklistItems.reduce((groups: Record<string, ChecklistItem[]>, item) => {
                          const category = item.category || 'Items';
                          if (!groups[category]) groups[category] = [];
                          groups[category].push(item);
                          return groups;
                        }, {});

                        const categories = Object.entries(groupedItems)
                          .sort(([a], [b]) => a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b));

                        return (
                          <>
                            {categories.map(([category, items]) => (
                              <div key={category} id={`category-${category}`}>
                                <DroppableCategory
                                  category={category}
                                  items={items}
                                  onToggle={toggleChecklistItem}
                                  onDelete={deleteChecklistItem}
                                  onCategoryChange={updateChecklistItemCategory}
                                  onDeleteCategory={deleteCategory}
                                  onEdit={editChecklistItem}
                                />
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                    
                    <DragOverlay>
                      {activeId ? (
                        <div className="bg-cozy-surface border border-cozy-primary rounded-lg p-2 shadow-cozy-lg">
                          <div className="text-sm text-cozy-text">
                            {currentNote.checklistItems.find(item => item.id === activeId)?.text}
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
              
              {/* Enhanced Add Bar */}
              <div className="bg-cozy-surface border-t border-cozy-gray-200 p-4">
                {/* New Category Input */}
                {showNewCategoryInput && (
                  <div className="mb-3 flex items-center gap-2 p-3 bg-cozy-sage-soft border border-cozy-sage rounded-lg">
                    <FolderPlus className="w-4 h-4 text-cozy-text" />
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          createNewCategory();
                        }
                      }}
                      placeholder="New category name..."
                      className="flex-1 px-3 py-2 bg-cozy-surface border border-cozy-gray-200 rounded-lg text-sm text-cozy-text focus:ring-2 focus:ring-cozy-primary"
                      autoFocus
                    />
                    <button
                      onClick={createNewCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-2 bg-cozy-primary text-white rounded-lg hover:bg-cozy-primary-deep disabled:opacity-50 text-sm font-medium"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                      }}
                      className="p-2 rounded-lg hover:bg-cozy-gray-100 text-cozy-text-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                
                {/* Context-Aware Task Addition - Always One Row */}
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
                    placeholder={`Add to ${title || 'this note'}...`}
                    className="flex-1 px-4 py-4 bg-cozy-surface border border-cozy-gray-200 rounded-xl text-base placeholder-cozy-text-muted text-cozy-text focus:ring-2 focus:ring-cozy-primary min-h-[48px]"
                  />
                  
                  {/* Smart Category Selector - Only shows when categories exist */}
                  {(() => {
                    const existingCategories = [...new Set(currentNote.checklistItems.map(item => item.category).filter(Boolean))];
                    return existingCategories.length > 0 ? (
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value)}
                        className="px-2 py-4 bg-cozy-surface border border-cozy-gray-200 rounded-xl text-sm text-cozy-text focus:ring-2 focus:ring-cozy-primary min-h-[48px] w-[90px] sm:w-[110px] flex-shrink-0"
                      >
                        <option value="">📋</option>
                        {existingCategories.map(category => (
                          <option key={category} value={category}>📁 {category && category.length > 8 ? category.substring(0, 8) + '...' : category}</option>
                        ))}
                      </select>
                    ) : null;
                  })()}
                  
                  <button
                    onClick={addChecklistItem}
                    disabled={!newChecklistItem.trim() || isAddingItem}
                    className="px-3 py-4 bg-cozy-primary text-white rounded-xl hover:bg-cozy-primary-deep disabled:opacity-50 font-medium transition-all min-h-[48px] w-[60px] sm:w-[70px] flex-shrink-0"
                  >
                    <span className="hidden sm:inline">{isAddingItem ? 'Adding...' : 'Add'}</span>
                    <span className="sm:hidden">+</span>
                  </button>
                </div>
                
                {/* Context Info */}
                <div className="mt-2 text-sm text-cozy-text-muted flex items-center gap-2">
                  <span>📝</span>
                  <span>Adding to: <span className="font-medium text-cozy-text">{title || 'Untitled Note'}</span></span>
                  {newItemCategory && (
                    <span className="bg-cozy-sage-soft text-cozy-text px-2 py-1 rounded font-medium">📁 {newItemCategory}</span>
                  )}
                  {currentNote.checklistItems.length > 0 && (
                    <span className="text-cozy-primary">• {currentNote.checklistItems.length} items</span>
                  )}
                </div>
              </div>
            </>
          )}
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
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'TEXT' as 'TEXT' | 'CHECKLIST',
    color: 'yellow',
    visibility: 'HOUSEHOLD' as 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createNewChecklistItem, setCreateNewChecklistItem] = useState('');
  const [createNewItemCategory, setCreateNewItemCategory] = useState('');
  const [createShowNewCategoryInput, setCreateShowNewCategoryInput] = useState(false);
  const [createNewCategoryName, setCreateNewCategoryName] = useState('');
  const [createChecklistItems, setCreateChecklistItems] = useState<Array<{id: string, text: string, category?: string}>>([]);
  const [createActiveId, setCreateActiveId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<NoteImage | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Drag and drop sensors for create modal with mobile support
  const createSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const createNote = async () => {
    if (!newNote.title.trim()) {
      alert('Please enter a note title');
      return;
    }

    try {
      setIsCreating(true);
      
      // For checklists, convert createChecklistItems to content format
      let noteContent = newNote.content;
      if (newNote.type === 'CHECKLIST' && createChecklistItems.length > 0) {
        noteContent = createChecklistItems.map(item => 
          item.category ? `[${item.category}] ${item.text}` : item.text
        ).join('\n');
      }
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newNote,
          content: noteContent
        })
      });

      if (response.ok) {
        const createdNote = await response.json();
        setNotes(prev => [createdNote, ...prev]);
        
        // Reset all state
        setNewNote({
          title: '',
          content: '',
          type: 'TEXT',
          color: 'cream',
          visibility: 'HOUSEHOLD'
        });
        setCreateChecklistItems([]);
        setCreateNewChecklistItem('');
        setCreateNewItemCategory('');
        setCreateShowNewCategoryInput(false);
        setCreateNewCategoryName('');
        
        setShowCreateModal(false);
        
        // Open the created note for editing
        setEditingNote(createdNote);
        setShowEditModal(true);
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
    
    let matchesFilter = true;
    if (selectedFilter === 'shared') {
      matchesFilter = note.visibility === 'HOUSEHOLD' || note.visibility === 'READ_ONLY';
    } else if (selectedFilter === 'private') {
      matchesFilter = note.visibility === 'PRIVATE';
    } else if (selectedFilter === 'mine') {
      matchesFilter = note.owner.email === session?.user?.email;
    } else if (selectedFilter === 'others') {
      matchesFilter = note.owner.email !== session?.user?.email;
    }
    
    return matchesSearch && matchesFilter;
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
      
      {/* Cozy Background */}
      <div className="min-h-screen bg-cozy-warm">
        <div className="space-y-6 p-4 md:p-6">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-cozy-text">Family Notes</h1>
            <p className="text-cozy-text-muted mt-1 text-sm sm:text-base">Share notes and checklists with your family</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-cozy-primary hover:bg-cozy-primary-deep text-white px-4 sm:px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-medium transition-colors w-full sm:w-auto shadow-cozy-sm hover:shadow-cozy-glow"
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cozy-text-muted w-5 h-5" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-cozy-gray-200 rounded-2xl focus:ring-2 focus:ring-cozy-primary focus:border-transparent bg-cozy-surface/90 backdrop-blur-sm text-base text-cozy-text placeholder-cozy-text-muted"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-cozy-text-muted shrink-0">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter by sharing:</span>
              <span className="sm:hidden">Filter:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  selectedFilter === 'all' 
                    ? 'bg-cozy-primary text-white shadow-cozy-sm' 
                    : 'bg-cozy-surface text-cozy-text border border-cozy-gray-200 hover:bg-cozy-cream'
                }`}
              >
                📋 All Notes
              </button>
              <button
                onClick={() => setSelectedFilter('shared')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  selectedFilter === 'shared' 
                    ? 'bg-cozy-primary text-white shadow-cozy-sm' 
                    : 'bg-cozy-surface text-cozy-text border border-cozy-gray-200 hover:bg-cozy-cream'
                }`}
              >
                👥 Shared
              </button>
              <button
                onClick={() => setSelectedFilter('private')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  selectedFilter === 'private' 
                    ? 'bg-cozy-primary text-white shadow-cozy-sm' 
                    : 'bg-cozy-surface text-cozy-text border border-cozy-gray-200 hover:bg-cozy-cream'
                }`}
              >
                🔒 Private
              </button>
              <button
                onClick={() => setSelectedFilter('mine')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  selectedFilter === 'mine' 
                    ? 'bg-cozy-primary text-white shadow-cozy-sm' 
                    : 'bg-cozy-surface text-cozy-text border border-cozy-gray-200 hover:bg-cozy-cream'
                }`}
              >
                ✏️ My Notes
              </button>
              <button
                onClick={() => setSelectedFilter('others')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  selectedFilter === 'others' 
                    ? 'bg-cozy-primary text-white shadow-cozy-sm' 
                    : 'bg-cozy-surface text-cozy-text border border-cozy-gray-200 hover:bg-cozy-cream'
                }`}
              >
                👤 Others' Notes
              </button>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first note to get started'
              }
            </p>
            {!searchQuery && selectedFilter === 'all' && (
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
                          <div className={`w-3 h-3 rounded border ${item.isChecked ? 'bg-cozy-primary border-cozy-primary' : 'border-cozy-gray-300'}`}>
                            {item.isChecked && <div className="w-full h-full flex items-center justify-center text-white text-[8px]">✓</div>}
                          </div>
                          <div className="flex-1">
                            {item.category && (
                              <span className="text-xs text-cozy-text-muted bg-cozy-cream px-1.5 py-0.5 rounded mr-2">
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 md:p-8 z-50">
            <div className="w-full h-full md:w-[90vw] md:h-[85vh] md:max-w-4xl bg-white shadow-2xl rounded-2xl md:rounded-3xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-4 md:p-6 shrink-0">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewNote({
                        title: '',
                        content: '',
                        type: 'TEXT',
                        color: 'cream',
                        visibility: 'HOUSEHOLD'
                      });
                      // Reset category state
                      setCreateNewChecklistItem('');
                      setCreateShowNewCategoryInput(false);
                      setCreateNewCategoryName('');
                    }}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <input
                    type="text"
                    value={newNote.title}
                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                    className="flex-1 text-xl md:text-2xl font-bold bg-transparent border-0 outline-none text-gray-900 placeholder-gray-400"
                    placeholder="Note title..."
                    autoFocus
                  />
                  
                  <div className="flex items-center gap-2">
                    {isCreating ? (
                      <div className="flex items-center gap-2 text-sm bg-cozy-sage-soft text-cozy-text px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-cozy-primary rounded-full animate-pulse"></div>
                        <span>Creating</span>
                      </div>
                    ) : (
                      <button
                        onClick={createNote}
                        disabled={!newNote.title.trim()}
                        className="px-4 py-2 bg-cozy-primary text-white rounded-xl hover:bg-cozy-primary-deep disabled:opacity-50 font-medium transition-all"
                      >
                        Create
                      </button>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Type Toggle with Add Category */}
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => setNewNote(prev => ({ ...prev, type: 'TEXT' }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          newNote.type === 'TEXT' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>📝</span>
                        <span>Text</span>
                      </button>
                      <button
                        onClick={() => setNewNote(prev => ({ ...prev, type: 'CHECKLIST' }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          newNote.type === 'CHECKLIST' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>✅</span>
                        <span>List</span>
                      </button>
                    </div>
                    
                    {/* Add Category Button - Only show for checklists */}
                    {newNote.type === 'CHECKLIST' && (
                      <button
                        onClick={() => setCreateShowNewCategoryInput(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-cozy-sage-soft border border-cozy-sage rounded-xl text-cozy-text hover:bg-cozy-sage hover:text-white transition-all"
                        title="Add category for items"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span className="hidden sm:inline text-sm font-medium">Add Category</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Colors */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Color:</span>
                    {colorOptions.slice(0, 6).map(colorOption => (
                      <button
                        key={colorOption.name}
                        onClick={() => setNewNote(prev => ({ ...prev, color: colorOption.name }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          newNote.color === colorOption.name 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300 hover:scale-105'
                        } ${colorOption.bg}`}
                      />
                    ))}
                  </div>
                  
                  {/* Visibility */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Share:</span>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      {[
                        { value: 'PRIVATE', label: 'Private', icon: '🔒' },
                        { value: 'HOUSEHOLD', label: 'Family', icon: '👥' },
                        { value: 'READ_ONLY', label: 'View Only', icon: '👁️' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setNewNote(prev => ({ ...prev, visibility: option.value as 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY' }))}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                            newNote.visibility === option.value
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <span>{option.icon}</span>
                          <span className="hidden sm:inline">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {newNote.type === 'TEXT' ? (
                  <div className="flex-1 p-4 md:p-6">
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Start writing your note...

💡 Your note will be saved when you click Create!"
                      className="w-full h-full p-4 md:p-6 bg-cozy-surface border border-cozy-gray-200 rounded-2xl outline-none resize-none text-base md:text-lg leading-relaxed placeholder-cozy-text-muted text-cozy-text focus:bg-cozy-surface focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                      {createChecklistItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                          <div className="text-6xl mb-4">✅</div>
                          <h3 className="text-2xl font-bold mb-3 text-cozy-text">Start Your Checklist</h3>
                          <p className="text-cozy-text-muted mb-6">Add items below, then create categories to organize them</p>
                          <div className="bg-cozy-sage-soft rounded-xl p-4 text-sm text-cozy-text border border-cozy-sage max-w-md">
                            <p className="font-semibold mb-2">💡 Workflow:</p>
                            <p>• Add items first</p>
                            <p>• Create categories</p>
                            <p>• Drag items into categories</p>
                          </div>
                        </div>
                      ) : (
                        <DndContext
                          sensors={createSensors}
                          collisionDetection={closestCenter}
                          onDragStart={(event) => setCreateActiveId(String(event.active.id))}
                          onDragEnd={(event) => {
                            const { active, over } = event;
                            setCreateActiveId(null);

                            if (!over) return;

                            const activeId = String(active.id);
                            const overId = String(over.id);
                            const activeItem = createChecklistItems.find(item => item.id === activeId);
                            if (!activeItem) return;

                            // If dropped on a category
                            let newCategory: string | undefined = undefined;
                            if (overId.startsWith('create-category-')) {
                              newCategory = overId.replace('create-category-', '');
                              if (newCategory === 'General') newCategory = undefined;
                            } else {
                              // If dropped on another item, use that item's category
                              const overItem = createChecklistItems.find(item => item.id === overId);
                              if (overItem) {
                                newCategory = overItem.category;
                              }
                            }

                            // Update the item's category
                            setCreateChecklistItems(items => 
                              items.map(item => 
                                item.id === activeId 
                                  ? { ...item, category: newCategory }
                                  : item
                              )
                            );
                          }}
                        >
                          <div className="space-y-4">
                            {(() => {
                              const groupedItems = createChecklistItems.reduce((groups: Record<string, typeof createChecklistItems>, item) => {
                                const category = item.category || 'Items';
                                if (!groups[category]) groups[category] = [];
                                groups[category].push(item);
                                return groups;
                              }, {});

                              const categories = Object.entries(groupedItems)
                                .sort(([a], [b]) => a === 'Items' ? 1 : b === 'Items' ? -1 : a.localeCompare(b));

                              return (
                                <>
                                  {categories.map(([category, items]) => (
                                    <div key={category} id={`create-category-${category}`} className="bg-cozy-cream/50 rounded-lg border border-cozy-gray-200 p-3">
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-cozy-text flex items-center gap-2">
                                          <span className="text-base">{category === 'Items' ? '📋' : '📁'}</span>
                                          <span>{category === 'Items' ? 'Items' : category}</span>
                                        </h4>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-cozy-text bg-cozy-primary-soft px-2 py-0.5 rounded-full font-medium">
                                            {items.length}
                                          </span>
                                          {category !== 'Items' && (
                                            <button
                                              onClick={() => {
                                                // Move items back to Items
                                                setCreateChecklistItems(prevItems => 
                                                  prevItems.map(item => 
                                                    item.category === category 
                                                      ? { ...item, category: undefined }
                                                      : item
                                                  )
                                                );
                                              }}
                                              className="p-1 rounded hover:bg-red-100 text-red-500 transition-all"
                                              title="Delete category"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2">
                                          {items.map((item) => (
                                            <div
                                              key={item.id}
                                              className="flex items-center gap-2 py-2 px-2 bg-cozy-surface rounded-lg hover:bg-cozy-cream transition-all group"
                                            >
                                              <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-cozy-gray-100 rounded">
                                                <GripVertical className="w-3 h-3 text-cozy-text-muted" />
                                              </div>
                                              
                                              <span className="flex-1 text-sm text-cozy-text">
                                                {item.text}
                                              </span>
                                              
                                              <button
                                                onClick={() => {
                                                  setCreateChecklistItems(items => items.filter(i => i.id !== item.id));
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-all"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </SortableContext>
                                    </div>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                          
                          <DragOverlay>
                            {createActiveId ? (
                              <div className="bg-cozy-surface border border-cozy-primary rounded-lg p-2 shadow-cozy-lg">
                                <div className="text-sm text-cozy-text">
                                  {createChecklistItems.find(item => item.id === createActiveId)?.text}
                                </div>
                              </div>
                            ) : null}
                          </DragOverlay>
                        </DndContext>
                      )}
                    </div>
                    
                    {/* Add items input for checklist */}
                    <div className="bg-cozy-surface border-t border-cozy-gray-200 p-4">
                      {/* New Category Input */}
                      {createShowNewCategoryInput && (
                        <div className="mb-3 flex items-center gap-2 p-3 bg-cozy-sage-soft border border-cozy-sage rounded-lg">
                          <FolderPlus className="w-4 h-4 text-cozy-text" />
                          <input
                            type="text"
                            value={createNewCategoryName}
                            onChange={(e) => setCreateNewCategoryName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (createNewCategoryName.trim()) {
                                  setCreateShowNewCategoryInput(false);
                                  setCreateNewCategoryName('');
                                }
                              }
                            }}
                            placeholder="New category name..."
                            className="flex-1 px-3 py-2 bg-cozy-surface border border-cozy-gray-200 rounded-lg text-sm text-cozy-text focus:ring-2 focus:ring-cozy-primary"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (createNewCategoryName.trim()) {
                                setCreateShowNewCategoryInput(false);
                                setCreateNewCategoryName('');
                              }
                            }}
                            disabled={!createNewCategoryName.trim()}
                            className="px-3 py-2 bg-cozy-primary text-white rounded-lg hover:bg-cozy-primary-deep disabled:opacity-50 text-sm font-medium"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => {
                              setCreateShowNewCategoryInput(false);
                              setCreateNewCategoryName('');
                            }}
                            className="p-2 rounded-lg hover:bg-cozy-gray-100 text-cozy-text-muted"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      
                      {/* Context-Aware Task Addition - Always One Row */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={createNewChecklistItem}
                          onChange={(e) => setCreateNewChecklistItem(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (createNewChecklistItem.trim()) {
                                const newItem = {
                                  id: `temp-${Date.now()}`,
                                  text: createNewChecklistItem.trim(),
                                  category: createNewItemCategory || undefined
                                };
                                setCreateChecklistItems(prev => [...prev, newItem]);
                                setCreateNewChecklistItem('');
                              }
                            }
                          }}
                          placeholder={`Add to ${newNote.title || 'new note'}...`}
                          className="flex-1 px-4 py-4 bg-cozy-surface border border-cozy-gray-200 rounded-xl text-base placeholder-cozy-text-muted text-cozy-text focus:ring-2 focus:ring-cozy-primary min-h-[48px]"
                        />
                        
                        {/* Smart Category Selector - Only shows when categories exist */}
                        {(() => {
                          const existingCategories = [...new Set(createChecklistItems.map(item => item.category).filter(Boolean))];
                          return existingCategories.length > 0 ? (
                            <select
                              value={createNewItemCategory}
                              onChange={(e) => setCreateNewItemCategory(e.target.value)}
                              className="px-2 py-4 bg-cozy-surface border border-cozy-gray-200 rounded-xl text-sm text-cozy-text focus:ring-2 focus:ring-cozy-primary min-h-[48px] w-[90px] sm:w-[110px] flex-shrink-0"
                            >
                              <option value="">📋</option>
                              {existingCategories.map(category => (
                                <option key={category} value={category}>📁 {category && category.length > 8 ? category.substring(0, 8) + '...' : category}</option>
                              ))}
                            </select>
                          ) : null;
                        })()}
                        
                        <button
                          onClick={() => {
                            if (createNewChecklistItem.trim()) {
                              const newItem = {
                                id: `temp-${Date.now()}`,
                                text: createNewChecklistItem.trim(),
                                category: createNewItemCategory || undefined
                              };
                              setCreateChecklistItems(prev => [...prev, newItem]);
                              setCreateNewChecklistItem('');
                            }
                          }}
                          disabled={!createNewChecklistItem.trim()}
                          className="px-3 py-4 bg-cozy-primary text-white rounded-xl hover:bg-cozy-primary-deep disabled:opacity-50 font-medium transition-all min-h-[48px] w-[60px] sm:w-[70px] flex-shrink-0"
                        >
                          <span className="hidden sm:inline">Add</span>
                          <span className="sm:hidden">+</span>
                        </button>
                      </div>
                      
                      {/* Context Info */}
                      <div className="mt-2 text-sm text-cozy-text-muted flex items-center gap-2">
                        <span>📝</span>
                        <span>Adding to: <span className="font-medium text-cozy-text">{newNote.title || 'New Note'}</span></span>
                        {createNewItemCategory && (
                          <span className="bg-cozy-sage-soft text-cozy-text px-2 py-1 rounded font-medium">📁 {createNewItemCategory}</span>
                        )}
                        {createChecklistItems.length > 0 && (
                          <span className="text-cozy-primary">• {createChecklistItems.length} items</span>
                        )}
                      </div>
                      
                      
                      <p className="text-xs text-cozy-text-muted mt-2">
                        💡 Add items now or create empty and add them later with full editing features
                      </p>
                    </div>
                  </div>
                )}
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
      </div>
    </ModernAppShell>
  );
}

// Server-side authentication check
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Return minimal session data to avoid serialization issues
  return {
    props: {
      // Don't pass session directly as it may contain non-serializable data
    },
  };
};
