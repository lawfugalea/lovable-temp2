import React, { useState } from 'react';
import useSWR from 'swr';

const fetcher = (u: string) => fetch(u, { credentials: 'include' }).then(r => r.json());

type Props = {
  selectedId: string | null;
  onChange: (id: string) => void;
  onListsChange?: (lists: any[]) => void;
  onAutoSelect?: (listId: string) => void;
};

export default function ListPicker({ selectedId, onChange, onListsChange, onAutoSelect }: Props) {
  const { data, mutate, isLoading } = useSWR('/api/shopping/lists', fetcher, {
    refreshInterval: 30000, // Increased to 30 seconds to reduce API calls
    revalidateOnFocus: false, // Disabled to reduce unnecessary calls
    keepPreviousData: true,
  });

  const [newName, setNewName] = useState('');
  const lists = (data?.lists ?? []) as Array<any>;
  const activeLists = lists.filter((l) => !l.archivedAt);
  const archivedLists = lists.filter((l) => l.archivedAt);

  // Notify parent component when lists change
  React.useEffect(() => {
    if (lists.length > 0) {
      onListsChange?.(lists);
      
      // Auto-select first list if no list is selected
      if (!selectedId && activeLists.length > 0) {
        onAutoSelect?.(activeLists[0].id);
      }
    }
  }, [lists, selectedId, activeLists, onListsChange, onAutoSelect]);

  async function createList() {
    const name = newName.trim();
    if (!name) return;
    await fetch('/api/shopping/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    setNewName('');
    mutate();
  }

  async function renameList(id: string, name: string) {
    await fetch(`/api/shopping/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    mutate();
  }

  async function setArchive(id: string, archive: boolean) {
    await fetch(`/api/shopping/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(archive ? { archive: true } : { unarchive: true }),
    });
    mutate();
  }

  async function deleteList(id: string) {
    if (!confirm('Delete this list? This cannot be undone.')) return;
    await fetch(`/api/shopping/lists/${id}?force=true`, { method: 'DELETE', credentials: 'include' });
    if (selectedId === id) onChange('');
    mutate();
  }

  const selected = lists.find((l) => l.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Current List Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-cozy-text">Current List</label>
        <select
          className="w-full rounded-lg border-2 border-cozy-gray-200 bg-white px-4 py-3 text-cozy-text focus:border-cozy-primary focus:outline-none focus:ring-2 focus:ring-cozy-primary/20 transition-colors"
          disabled={isLoading || lists.length === 0}
          value={selectedId ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select a list...</option>
          <optgroup label="Active Lists">
            {activeLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </optgroup>
          {archivedLists.length > 0 && (
            <optgroup label="Archived Lists">
              {archivedLists.map(l => <option key={l.id} value={l.id}>{l.name} (archived)</option>)}
            </optgroup>
          )}
        </select>
      </div>

      {/* Action Buttons */}
      {selectedId && (
        <div className="grid grid-cols-3 gap-2">
          <button
            className="rounded-lg border-2 border-cozy-gray-200 bg-white hover:bg-cozy-cream hover:border-cozy-primary px-3 py-2 text-sm font-medium text-cozy-text transition-colors"
            onClick={async () => {
              const name = prompt('Rename list', selected?.name ?? '');
              if (name && name.trim()) await renameList(selectedId!, name.trim());
            }}
          >
            Rename
          </button>
          <button
            className="rounded-lg border-2 border-cozy-gray-200 bg-white hover:bg-cozy-cream hover:border-cozy-primary px-3 py-2 text-sm font-medium text-cozy-text transition-colors"
            onClick={() => setArchive(selectedId!, !selected?.archivedAt)}
          >
            {selected?.archivedAt ? 'Unarchive' : 'Archive'}
          </button>
          <button
            className="rounded-lg border-2 border-red-200 bg-white hover:bg-red-50 hover:border-red-400 px-3 py-2 text-sm font-medium text-red-600 transition-colors"
            onClick={() => deleteList(selectedId!)}
          >
            Delete
          </button>
        </div>
      )}

      {/* Create New List */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-cozy-text">Create New List</label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border-2 border-cozy-gray-200 bg-white px-4 py-3 text-cozy-text placeholder-cozy-text-muted focus:border-cozy-primary focus:outline-none focus:ring-2 focus:ring-cozy-primary/20 transition-colors"
            placeholder="Enter list name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createList()}
          />
          <button
            className="rounded-lg bg-cozy-primary hover:bg-cozy-primary-deep text-white px-6 py-3 font-medium transition-colors shadow-sm hover:shadow-md"
            onClick={createList}
            disabled={!newName.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
