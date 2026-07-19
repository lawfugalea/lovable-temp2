import { useState } from 'react';
import useSWR from 'swr';
import { useConfirm } from '@/components/ui/confirm-dialog';

const fetcher = (u: string) => fetch(u, { credentials: 'include' }).then(r => r.json());

type Props = {
  selectedId: string | null;
  onChange: (id: string) => void;
};

export default function ListPicker({ selectedId, onChange }: Props) {
  const { data, mutate, isLoading } = useSWR('/api/shopping/lists', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const [newName, setNewName] = useState('');
  const confirm = useConfirm();
  const lists = (data?.lists ?? []) as Array<any>;
  const activeLists = lists.filter((l) => !l.archivedAt);
  const archivedLists = lists.filter((l) => l.archivedAt);

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
    if (!(await confirm({ title: 'Delete list', description: 'Delete this list? This cannot be undone.', confirmText: 'Delete', destructive: true }))) return;
    await fetch(`/api/shopping/lists/${id}?force=true`, { method: 'DELETE', credentials: 'include' });
    if (selectedId === id) onChange('');
    mutate();
  }

  const selected = lists.find((l) => l.id === selectedId);

  return (
    <div className="rounded-3xl p-4 bg-white/5 backdrop-blur shadow-sm">
      {/* Row 1: Select (full width on mobile) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Current list</label>
          <select
            className="w-full rounded-xl px-3 py-2 bg-white/10 min-h-[40px]"
            disabled={isLoading || lists.length === 0}
            value={selectedId ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <optgroup label="Active">
              {activeLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </optgroup>
            {archivedLists.length > 0 && (
              <optgroup label="Archived">
                {archivedLists.map(l => <option key={l.id} value={l.id}>{l.name} (archived)</option>)}
              </optgroup>
            )}
          </select>
        </div>

        {/* Row 1 right: Actions (wrap on mobile) */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-none sm:gap-2 sm:ml-2">
          <button
            className="col-span-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm min-h-[40px]"
            disabled={!selectedId}
            onClick={async () => {
              const name = prompt('Rename list', selected?.name ?? '');
              if (name && name.trim()) await renameList(selectedId!, name.trim());
            }}
          >
            Rename
          </button>
          <button
            className="col-span-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm min-h-[40px]"
            disabled={!selectedId}
            onClick={() => setArchive(selectedId!, !selected?.archivedAt)}
          >
            {selected?.archivedAt ? 'Unarchive' : 'Archive'}
          </button>
          <button
            className="col-span-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm min-h-[40px] text-red-600"
            disabled={!selectedId}
            onClick={() => deleteList(selectedId!)}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Row 2: Create new list (stacks on mobile) */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <input
          className="rounded-xl px-3 py-2 bg-white/10 min-h-[40px]"
          placeholder="New list name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createList()}
        />
        <button
          className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm min-h-[40px]"
          onClick={createList}
        >
          Add
        </button>
      </div>
    </div>
  );
}
