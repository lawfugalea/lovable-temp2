import { useState, useEffect, useCallback } from 'react';

interface OfflineNote {
  id: string;
  title: string;
  contentJson: any;
  color: string;
  isPinned: boolean;
  visibility: 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY';
  createdAt: string;
  updatedAt: string;
  isOffline: boolean;
  pendingSync: boolean;
}

interface UseOfflineNotesReturn {
  notes: OfflineNote[];
  isOnline: boolean;
  addOfflineNote: (note: Partial<OfflineNote>) => Promise<string>;
  updateOfflineNote: (id: string, updates: Partial<OfflineNote>) => Promise<void>;
  deleteOfflineNote: (id: string) => Promise<void>;
  syncOfflineNotes: () => Promise<void>;
  clearOfflineCache: () => Promise<void>;
}

const OFFLINE_NOTES_KEY = 'houseflow-offline-notes';
const PENDING_SYNC_KEY = 'houseflow-pending-sync';

export function useOfflineNotes(): UseOfflineNotesReturn {
  const [notes, setNotes] = useState<OfflineNote[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load notes from localStorage on mount
  useEffect(() => {
    loadOfflineNotes();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncOfflineNotes();
    }
  }, [isOnline]);

  const loadOfflineNotes = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_NOTES_KEY);
      if (stored) {
        const parsedNotes = JSON.parse(stored);
        setNotes(parsedNotes);
      }
    } catch (error) {
      console.error('Failed to load offline notes:', error);
    }
  }, []);

  const saveOfflineNotes = useCallback((newNotes: OfflineNote[]) => {
    try {
      localStorage.setItem(OFFLINE_NOTES_KEY, JSON.stringify(newNotes));
      setNotes(newNotes);
    } catch (error) {
      console.error('Failed to save offline notes:', error);
    }
  }, []);

  const generateOfflineId = useCallback(() => {
    return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addOfflineNote = useCallback(async (noteData: Partial<OfflineNote>): Promise<string> => {
    const offlineId = generateOfflineId();
    const newNote: OfflineNote = {
      id: offlineId,
      title: noteData.title || 'Untitled Note',
      contentJson: noteData.contentJson || [],
      color: noteData.color || 'default',
      isPinned: noteData.isPinned || false,
      visibility: noteData.visibility || 'HOUSEHOLD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOffline: true,
      pendingSync: true,
    };

    const updatedNotes = [newNote, ...notes];
    saveOfflineNotes(updatedNotes);

    // Try to sync immediately if online
    if (isOnline) {
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newNote.title,
            contentJson: newNote.contentJson,
            color: newNote.color,
            visibility: newNote.visibility,
          }),
        });

        if (response.ok) {
          const syncedNote = await response.json();
          // Replace offline note with synced version
          const finalNotes = updatedNotes.map(note => 
            note.id === offlineId ? { ...syncedNote, isOffline: false, pendingSync: false } : note
          );
          saveOfflineNotes(finalNotes);
          return syncedNote.id;
        }
      } catch (error) {
        console.error('Failed to sync new note:', error);
      }
    }

    return offlineId;
  }, [notes, isOnline, generateOfflineId, saveOfflineNotes]);

  const updateOfflineNote = useCallback(async (id: string, updates: Partial<OfflineNote>): Promise<void> => {
    const updatedNotes = notes.map(note => {
      if (note.id === id) {
        return {
          ...note,
          ...updates,
          updatedAt: new Date().toISOString(),
          pendingSync: true,
        };
      }
      return note;
    });

    saveOfflineNotes(updatedNotes);

    // Try to sync immediately if online
    if (isOnline) {
      try {
        const response = await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updates.title,
            contentJson: updates.contentJson,
            color: updates.color,
            isPinned: updates.isPinned,
            visibility: updates.visibility,
          }),
        });

        if (response.ok) {
          const syncedNote = await response.json();
          // Update the note with synced version
          const finalNotes = updatedNotes.map(note => 
            note.id === id ? { ...syncedNote, isOffline: false, pendingSync: false } : note
          );
          saveOfflineNotes(finalNotes);
        }
      } catch (error) {
        console.error('Failed to sync note update:', error);
      }
    }
  }, [notes, isOnline, saveOfflineNotes]);

  const deleteOfflineNote = useCallback(async (id: string): Promise<void> => {
    const updatedNotes = notes.filter(note => note.id !== id);
    saveOfflineNotes(updatedNotes);

    // Try to sync deletion if online
    if (isOnline) {
      try {
        await fetch(`/api/notes/${id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to sync note deletion:', error);
      }
    }
  }, [notes, isOnline, saveOfflineNotes]);

  const syncOfflineNotes = useCallback(async (): Promise<void> => {
    if (!isOnline) return;

    const pendingNotes = notes.filter(note => note.pendingSync);
    
    for (const note of pendingNotes) {
      try {
        if (note.isOffline) {
          // Create new note
          const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: note.title,
              contentJson: note.contentJson,
              color: note.color,
              visibility: note.visibility,
            }),
          });

          if (response.ok) {
            const syncedNote = await response.json();
            // Replace offline note with synced version
            const updatedNotes = notes.map(n => 
              n.id === note.id ? { ...syncedNote, isOffline: false, pendingSync: false } : n
            );
            saveOfflineNotes(updatedNotes);
          }
        } else {
          // Update existing note
          const response = await fetch(`/api/notes/${note.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: note.title,
              contentJson: note.contentJson,
              color: note.color,
              isPinned: note.isPinned,
              visibility: note.visibility,
            }),
          });

          if (response.ok) {
            const syncedNote = await response.json();
            // Update the note with synced version
            const updatedNotes = notes.map(n => 
              n.id === note.id ? { ...syncedNote, isOffline: false, pendingSync: false } : n
            );
            saveOfflineNotes(updatedNotes);
          }
        }
      } catch (error) {
        console.error('Failed to sync note:', note.id, error);
      }
    }
  }, [notes, isOnline, saveOfflineNotes]);

  const clearOfflineCache = useCallback(async (): Promise<void> => {
    try {
      localStorage.removeItem(OFFLINE_NOTES_KEY);
      localStorage.removeItem(PENDING_SYNC_KEY);
      setNotes([]);
    } catch (error) {
      console.error('Failed to clear offline cache:', error);
    }
  }, []);

  return {
    notes,
    isOnline,
    addOfflineNote,
    updateOfflineNote,
    deleteOfflineNote,
    syncOfflineNotes,
    clearOfflineCache,
  };
}
