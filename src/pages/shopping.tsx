// src/pages/shopping.tsx
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useHouseholdId } from '@/lib/useHouseholdId';
import useSWR from 'swr';
import ListPicker from '@/components/ListPicker';
import PageHeader from '@/components/ui/PageHeader';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';

type Item = {
  id: string;
  title: string;
  qty?: string;
  notes?: string;
  status: 'ACTIVE' | 'DONE';
  createdAt?: string;
  updatedAt?: string;
  doneAt?: string;
  createdBy?: { id: string; name: string | null; email: string };
  doneBy?: { id: string; name: string | null; email: string } | null;
};

type SuggestEntry = {
  id: string;
  title: string;
  store?: string;
  price?: string | null;
  nowCents?: number | null;
  unit?: string | null;
  imageUrl?: string | null;
  url?: string | null;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const suggestFetcher = (u: string) => fetch(u, { credentials: 'include' }).then((r) => r.json());
const newId = () => Math.random().toString(36).slice(2, 10);

export default function ShoppingPage() {
  const { status } = useSession();
  const { householdId, loading: hidLoading, error: hidError } = useHouseholdId();

  if (status === 'loading' || hidLoading) return <Layout><div className="min-h-[50vh] grid place-items-center text-gray-500">Loading…</div></Layout>;
  if (status === 'unauthenticated') return <Layout><div className="p-6 text-red-600">Sign in required</div></Layout>;
  if (!householdId) return <Layout><div className="min-h-[50vh] grid place-items-center text-gray-500">Creating or locating your household…</div></Layout>;

  return <ShoppingCore householdId={householdId} hidError={hidError} />;
}

function ShoppingCore({ householdId, hidError }: { householdId: string; hidError?: string | null }) {
  const [listId, setListId] = useState<string | null>(null);
  const { data: listsData, isLoading: listsLoading } = useSWR('/api/shopping/lists', fetcher, {
    refreshInterval: 10000, revalidateOnFocus: true, keepPreviousData: true,
  });

  useEffect(() => {
    if (!listId && listsData?.lists?.length) {
      const firstActive = listsData.lists.find((l: any) => !l.archivedAt);
      setListId((firstActive ?? listsData.lists[0]).id);
    }
  }, [listsData, listId]);

  const { data, isLoading: itemsLoading, isValidating, mutate } = useSWR(
    listId ? `/api/shopping/items?listId=${encodeURIComponent(listId)}` : null,
    fetcher,
    { refreshInterval: 4000, revalidateOnFocus: true, keepPreviousData: true }
  );
  const items: Item[] = (data?.items ?? []) as Item[];

  // quick add + suggestions
  const [t, setT] = useState(''); const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showSug, setShowSug] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => { const id = setTimeout(() => setDebouncedQ(t.trim()), 180); return () => clearTimeout(id); }, [t]);
  const { data: suggestData } = useSWR(
    debouncedQ.length >= 2 ? `/api/prices/suggest?q=${encodeURIComponent(debouncedQ)}` : null,
    suggestFetcher,
    { keepPreviousData: true }
  );
  const suggestions: SuggestEntry[] =
    Array.isArray(suggestData?.items) ? suggestData.items :
    Array.isArray(suggestData?.results) ? suggestData.results : [];

  // filter/sort
  type Filter = 'all' | 'active' | 'done'; type Sort = 'new' | 'alpha';
  const [filter, setFilter] = useState<Filter>('all'); const [sort, setSort] = useState<Sort>('new');

  const visible = useMemo(() => {
    let list = [...items];
    if (filter === 'active') list = list.filter(i => i.status !== 'DONE');
    if (filter === 'done') list = list.filter(i => i.status === 'DONE');
    if (sort === 'alpha') list.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
    else list.sort((a,b)=> (b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));
    return list;
  }, [items, filter, sort]);

  const displayName = (u?: { name: string | null; email: string } | null) => u?.name?.trim() || u?.email || 'Someone';
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

  async function addItem(title: string, qty?: string) {
    if (!listId) return;
    const optimistic: Item = {
      id: `temp_${newId()}`, title: title.trim(), qty: qty?.trim() || '', status: 'ACTIVE',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      createdBy: { id: 'me', name: 'You', email: '' },
    };
    mutate({ items: [optimistic, ...(data?.items || [])] }, { revalidate: false });

    const picked = suggestions.find((s) => s.title.toLowerCase().trim() === title.toLowerCase().trim());
    await fetch('/api/shopping/items', {
      method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ listId, title, qty, priceProductId: picked?.id, priceCents: picked?.nowCents, imageUrl: picked?.imageUrl, url: picked?.url }),
    });
    setT(''); setQ(''); setShowSug(false); mutate();
  }
  async function toggle(id: string, done: boolean) {
    await fetch(`/api/shopping/items/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: done ? 'DONE' : 'ACTIVE' }) });
    mutate();
  }
  async function update(id: string, patch: Partial<Item>) {
    await fetch(`/api/shopping/items/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(patch) });
    mutate();
  }
  async function remove(id: string) { await fetch(`/api/shopping/items/${id}`, { method: 'DELETE', credentials: 'include' }); mutate(); }
  async function clearDone() { if (!listId) return; await fetch(`/api/shopping/items/clear-done`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ listId }) }); mutate(); }
  function submitQuick(e: React.FormEvent) { e.preventDefault(); const title = t.trim(); if (!title || !listId) return; void addItem(title, q); }

  return (
    <Layout>
      <Head><title>Shopping – Houseflow</title></Head>

      <PageHeader
        title="Shopping List"
        subtitle="Fast, shared list with mobile-first controls."
        householdId={householdId}
        status={hidError ? <span className="text-red-600">{hidError}</span> : (listsLoading || itemsLoading) ? 'Loading…' : isValidating ? 'Syncing…' : 'Up to date'}
      />

      {/* filter chips + list picker */}
      <div className="mx-4 sm:mx-6 mt-3 flex flex-wrap items-center gap-2">
        {(['all','active','done'] as const).map(k=>(
          <button key={k} onClick={()=>setFilter(k)} className={`px-3 py-1.5 rounded-full border text-sm min-h-[36px] ${filter===k?'bg-gray-900 text-white border-gray-900':'bg-white hover:bg-gray-50'}`}>
            {k==='all'?'All':k==='active'?'Active':'Purchased'}
          </button>
        ))}
        <div className="ml-auto"><ListPicker selectedId={listId} onChange={(id)=>setListId(id)} /></div>
      </div>

      <main className="mx-4 sm:mx-6 my-5 grid gap-5 pb-[calc(76px+var(--safe-bottom))]">
        <Section title="Controls" desc="Sort, housekeeping, refresh." tone="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm">Sort</label>
              <select value={sort} onChange={(e)=>setSort(e.target.value as any)} className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm min-h-[40px]">
                <option value="new">Newest first</option><option value="alpha">A → Z</option>
              </select>
            </div>
            <div />
            <div className="flex gap-2 sm:justify-end">
              <button onClick={clearDone} disabled={!listId} className="rounded-xl border bg-white px-3 py-2 text-xs sm:text-sm min-h-[40px] hover:bg-gray-50 disabled:opacity-60">Clear purchased</button>
              <button onClick={()=>mutate()} className="rounded-xl border bg-white px-3 py-2 text-xs sm:text-sm min-h-[40px] hover:bg-gray-50">Refresh</button>
            </div>
          </div>
        </Section>

        <Section title="Items" desc="Tap to check off. Edit inline." tone="violet">
          <Card className="p-0">
            {(itemsLoading || listsLoading) && (
              <ul className="divide-y animate-pulse">
                {Array.from({length:4}).map((_,i)=>(
                  <li key={i} className="p-4">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <div className="h-5 w-5 rounded bg-gray-200" />
                      <div className="space-y-2"><div className="h-3 w-3/5 rounded bg-gray-200"/><div className="h-3 w-2/5 rounded bg-gray-200"/></div>
                      <div className="h-3 w-16 rounded bg-gray-200" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!itemsLoading && visible.length===0 ? (
              <div className="p-6 text-sm text-gray-500">{listId ? 'Nothing here yet — add your first item below.' : 'Create or pick a list above to get started.'}</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {visible.map(item=>(
                  <li key={item.id} className="px-3 sm:px-4 py-3">
                    <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                      <input type="checkbox" checked={item.status==='DONE'} onChange={(e)=>toggle(item.id, e.target.checked)} className="h-5 w-5 accent-fuchsia-600" aria-label={`Toggle ${item.title}`} />
                      <div className="min-w-0">
                        <input className={`min-w-0 w-full border rounded-xl px-2 py-1 text-sm ${item.status==='DONE'?'line-through text-gray-400':''}`} value={item.title} onChange={(e)=>update(item.id,{title:e.target.value})} />
                        <div className="text-[11px] text-gray-500 mt-1 truncate">
                          {(item.qty?`${item.qty} • `:'') + (item.createdBy?`added by ${displayName(item.createdBy)}`:'') + (item.createdAt?` • ${when(item.createdAt)}`:'')}
                        </div>
                      </div>
                      <div className="hidden sm:block w-24">
                        <input className="w-full border rounded-xl px-2 py-1 text-sm" placeholder="Qty" value={item.qty||''} onChange={(e)=>update(item.id,{qty:e.target.value})} />
                      </div>
                      <button onClick={()=>remove(item.id)} className="ml-2 text-xs rounded-xl border px-2 py-1 hover:bg-gray-50 text-red-600">remove</button>
                    </div>
                    <div className="mt-2 sm:hidden">
                      <input className="w-24 border rounded-xl px-2 py-1 text-sm" placeholder="Qty" value={item.qty||''} onChange={(e)=>update(item.id,{qty:e.target.value})} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex items-center justify-end mt-3 gap-2">
            <Chip tone="indigo">{visible.filter(i=>i.status!=='DONE').length} active</Chip>
            <Chip tone="indigo">{visible.filter(i=>i.status==='DONE').length} purchased</Chip>
          </div>
        </Section>
      </main>

      {/* sticky quick add */}
      <form onSubmit={submitQuick} className="fixed bottom-3 left-3 right-3 z-30 pb-safe md:static md:mx-6 md:mb-6">
        <div className="bg-white border rounded-2xl shadow-lg p-2 sm:p-3 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={t}
              onChange={(e)=>{ setT(e.target.value); setShowSug(true); }}
              onFocus={()=>setShowSug(true)}
              onBlur={()=>setTimeout(()=>setShowSug(false),120)}
              placeholder="Quick, add"
              className="w-full rounded-xl border px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
              autoComplete="off"
            />
            {showSug && suggestions.length>0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white shadow-xl max-h-72 overflow-auto">
                {suggestions.map(s=>(
                  <button type="button" key={s.id+(s.url||'')} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
                    onClick={()=>{ setT(s.title); if (s.unit && !q) setQ(s.unit); setShowSug(false); inputRef.current?.focus(); }}>
                    {s.imageUrl ? <img src={s.imageUrl} alt="" className="h-8 w-8 rounded object-contain bg-white border" /> : <div className="h-8 w-8 rounded bg-gray-100" />}
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 truncate">{s.title}</div>
                      <div className="text-[11px] text-gray-500 truncate">{s.store || '—'}{s.price?` • ${s.price}`:''}{s.unit?` • ${s.unit}`:''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Qty / size" className="w-32 rounded-xl border px-3 py-2 min-h-[44px]" />
          <button type="submit" disabled={!listId} className="rounded-xl bg-fuchsia-600 text-white px-4 py-2 min-h-[44px] hover:bg-fuchsia-700 disabled:opacity-60">Add</button>
        </div>
      </form>
    </Layout>
  );
}
