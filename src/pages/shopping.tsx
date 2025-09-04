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
        title="🛒 Cozy Shopping"
        subtitle="Your shared family list, organized with love."
        householdId={householdId}
        status={hidError ? <span className="text-red-600">{hidError}</span> : (listsLoading || itemsLoading) ? '🌸 Loading…' : isValidating ? '✨ Syncing…' : '💫 All up to date'}
      />

      {/* Warm filter chips + list picker */}
      <div className="mx-4 sm:mx-6 mt-4 flex flex-wrap items-center gap-3">
        {(['all','active','done'] as const).map(k=>(
          <button key={k} onClick={()=>setFilter(k)} className={`px-4 py-2 rounded-cozy text-sm font-medium transition-all ${filter===k?'bg-cozy-primary text-cozy-surface shadow-cozy-sm':'bg-cozy-surface border border-cozy-gray-300 text-cozy-text hover:bg-cozy-cream'}`}>
            {k==='all'?'✨ All Items':k==='active'?'🛒 To Buy':'✅ Purchased'}
          </button>
        ))}
        <div className="ml-auto"><ListPicker selectedId={listId} onChange={(id)=>setListId(id)} /></div>
      </div>

      <main className="mx-4 sm:mx-6 my-6 grid gap-6 pb-[calc(80px+var(--safe-bottom))]">
        <Section title="📋 List Controls" desc="Sort your way, keep things tidy." tone="sage">
          <div className="cozy-card p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-center">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-cozy-text">Sort by</label>
                <select value={sort} onChange={(e)=>setSort(e.target.value as any)} className="flex-1 rounded-cozy border border-cozy-gray-300 bg-cozy-surface px-3 py-2 text-sm focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20">
                  <option value="new">✨ Newest first</option><option value="alpha">🔤 A → Z</option>
                </select>
              </div>
              <div />
              <div className="flex gap-3 sm:justify-end">
                <button onClick={clearDone} disabled={!listId} className="cozy-btn-secondary text-xs sm:text-sm disabled:opacity-40">
                  🧹 Clear done
                </button>
                <button onClick={()=>mutate()} className="cozy-btn-primary text-xs sm:text-sm">
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="🛍️ Shopping Items" desc="Tap to check off, edit with love." tone="primary">
          <div className="cozy-card p-0">
            {(itemsLoading || listsLoading) && (
              <ul className="divide-y divide-cozy-gray-200 animate-pulse">
                {Array.from({length:4}).map((_,i)=>(
                  <li key={i} className="p-5">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                      <div className="h-5 w-5 rounded bg-cozy-gray-200" />
                      <div className="space-y-2"><div className="h-4 w-3/5 rounded bg-cozy-gray-200"/><div className="h-3 w-2/5 rounded bg-cozy-gray-200"/></div>
                      <div className="h-3 w-16 rounded bg-cozy-gray-200" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!itemsLoading && visible.length===0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">🛒</div>
                <div className="text-sm text-cozy-text-muted">{listId ? 'Your cozy list is empty — add something lovely below!' : 'Create or pick a list above to get started.'}</div>
              </div>
            ) : (
              <ul className="divide-y divide-cozy-gray-200">
                {visible.map(item=>(
                  <li key={item.id} className="px-4 sm:px-6 py-4 hover:bg-cozy-cream/30 transition-colors">
                    <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={item.status==='DONE'} 
                        onChange={(e)=>toggle(item.id, e.target.checked)} 
                        className="h-5 w-5 rounded accent-cozy-primary focus:ring-cozy-primary/20" 
                        aria-label={`Toggle ${item.title}`} 
                      />
                      <div className="min-w-0">
                        <input 
                          className={`min-w-0 w-full border border-cozy-gray-300 rounded-cozy bg-cozy-surface px-3 py-2 text-sm focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all ${item.status==='DONE'?'line-through text-cozy-text-soft':''}`} 
                          value={item.title} 
                          onChange={(e)=>update(item.id,{title:e.target.value})} 
                        />
                        <div className="text-xs text-cozy-text-muted mt-2 truncate">
                          {(item.qty?`📦 ${item.qty} • `:'') + (item.createdBy?`added by ${displayName(item.createdBy)}`:'') + (item.createdAt?` • ${when(item.createdAt)}`:'')}
                        </div>
                      </div>
                      <div className="hidden sm:block w-24">
                        <input 
                          className="w-full border border-cozy-gray-300 rounded-cozy bg-cozy-surface px-3 py-2 text-sm focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20" 
                          placeholder="Qty" 
                          value={item.qty||''} 
                          onChange={(e)=>update(item.id,{qty:e.target.value})} 
                        />
                      </div>
                      <button onClick={()=>remove(item.id)} className="ml-2 text-xs rounded-cozy border border-red-200 bg-red-50 px-3 py-1.5 hover:bg-red-100 text-red-600">
                        🗑️ remove
                      </button>
                    </div>
                    <div className="mt-3 sm:hidden">
                      <input 
                        className="w-24 border border-cozy-gray-300 rounded-cozy bg-cozy-surface px-3 py-2 text-sm focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20" 
                        placeholder="Qty" 
                        value={item.qty||''} 
                        onChange={(e)=>update(item.id,{qty:e.target.value})} 
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-center mt-4 gap-4">
            <div className="bg-cozy-sage-soft text-cozy-text px-4 py-2 rounded-cozy text-sm font-medium">
              🛒 {visible.filter(i=>i.status!=='DONE').length} to buy
            </div>
            <div className="bg-cozy-primary-soft text-cozy-text px-4 py-2 rounded-cozy text-sm font-medium">
              ✅ {visible.filter(i=>i.status==='DONE').length} done
            </div>
          </div>
        </Section>
      </main>

      {/* Cozy quick add bar */}
      <form onSubmit={submitQuick} className="fixed bottom-4 left-4 right-4 z-30 pb-safe md:static md:mx-6 md:mb-6">
        <div className="cozy-card p-4 shadow-cozy-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={t}
                onChange={(e)=>{ setT(e.target.value); setShowSug(true); }}
                onFocus={()=>setShowSug(true)}
                onBlur={()=>setTimeout(()=>setShowSug(false),120)}
                placeholder="🛒 Add something lovely..."
                className="w-full rounded-cozy border border-cozy-gray-300 bg-cozy-surface px-4 py-3 text-cozy-text focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all"
                autoComplete="off"
              />
              {showSug && suggestions.length>0 && (
                <div className="absolute z-20 mt-2 w-full rounded-cozy-lg border border-cozy-gray-200 bg-cozy-surface shadow-cozy-lg max-h-72 overflow-auto">
                  {suggestions.map(s=>(
                    <button type="button" key={s.id+(s.url||'')} className="w-full text-left px-4 py-3 hover:bg-cozy-cream transition-colors flex items-center gap-3"
                      onClick={()=>{ setT(s.title); if (s.unit && !q) setQ(s.unit); setShowSug(false); inputRef.current?.focus(); }}>
                      {s.imageUrl ? <img src={s.imageUrl} alt="" className="h-10 w-10 rounded-cozy object-contain bg-cozy-surface border border-cozy-gray-200" /> : <div className="h-10 w-10 rounded-cozy bg-cozy-gray-100" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-cozy-text font-medium truncate">{s.title}</div>
                        <div className="text-xs text-cozy-text-muted truncate">{s.store || '—'}{s.price?` • ${s.price}`:''}{s.unit?` • ${s.unit}`:''}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input 
              value={q} 
              onChange={(e)=>setQ(e.target.value)} 
              placeholder="Qty" 
              className="w-24 rounded-cozy border border-cozy-gray-300 bg-cozy-surface px-3 py-3 text-cozy-text focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all" 
            />
            <button type="submit" disabled={!listId} className="cozy-btn-primary px-6 py-3 disabled:opacity-40">
              ✨ Add
            </button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
