// src/pages/dashboard.tsx
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import Card from '@/components/ui/Card';
import Section from '@/components/ui/Section';
import PageHeader from '@/components/ui/PageHeader';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useHouseholdId } from '@/lib/useHouseholdId';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function DashboardPage() {
  const { status } = useSession();
  const { householdId, loading: hidLoading, error: hidError } = useHouseholdId();

  if (status === 'loading' || hidLoading)
    return <Layout><div className="min-h-[50vh] grid place-items-center text-gray-500">Loading…</div></Layout>;
  if (status === 'unauthenticated')
    return <Layout><div className="p-6 text-red-600">Sign in required</div></Layout>;
  if (!householdId)
    return <Layout><div className="min-h-[50vh] grid place-items-center text-gray-500">Creating your household…</div></Layout>;

  return <Core householdId={householdId} hidError={hidError} />;
}

function Core({ householdId, hidError }: { householdId: string; hidError?: string | null }) {
  const { data: listsData } = useSWR('/api/shopping/lists', fetcher, { keepPreviousData: true });
  const firstListId = listsData?.lists?.find((l: any) => !l.archivedAt)?.id ?? listsData?.lists?.[0]?.id ?? null;
  const { data: itemsData } = useSWR(firstListId ? `/api/shopping/items?listId=${encodeURIComponent(firstListId)}` : null, fetcher);
  const items = (itemsData?.items ?? []) as Array<{ status: 'ACTIVE' | 'DONE' }>;
  const activeCount = items.filter(i => i.status !== 'DONE').length;

  const [sum, setSum] = useState<{ income: number; keeps: number; savingsPct: number } | null>(null);
  useEffect(() => { try { const raw = localStorage.getItem('hf_finances_summary'); if (raw) setSum(JSON.parse(raw)); } catch {} }, []);
  const income = sum?.income ?? 1200;
  const keeps = sum?.keeps ?? 950;
  const savings = (sum?.savingsPct ?? 20) / 100 * Math.max(0, income - keeps);

  return (
    <Layout>
      <Head><title>Overview – Houseflow</title></Head>
      <PageHeader title="Overview" subtitle="Quick glance at Shopping & Finances." householdId={householdId} status={hidError ? <span className="text-red-600">{hidError}</span> : 'Up to date'} />

      <main className="mx-4 sm:mx-6 my-6 grid gap-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="cozy-card p-6 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-cozy bg-cozy-sage-soft grid place-items-center text-2xl border border-cozy-sage/30">🧺</div>
                <div>
                  <div className="font-bold text-cozy-text text-lg">Shopping</div>
                  <div className="text-sm text-cozy-text-muted">{firstListId ? `${activeCount} items to grab` : 'Start your list'}</div>
                </div>
              </div>
              <Link href="/shopping" className="cozy-btn-primary text-sm px-4 py-2">
                Add Item
              </Link>
            </div>
            <Link href="/shopping" className="cozy-btn-secondary w-full flex items-center justify-center gap-2 group-hover:bg-cozy-cream transition-all">
              <span>🛒 Quick Shopping</span>
              <span className="text-cozy-primary">→</span>
            </Link>
          </div>

          <div className="cozy-card p-6 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-cozy bg-cozy-primary-soft grid place-items-center text-2xl border border-cozy-primary/30">💰</div>
                <div>
                  <div className="font-bold text-cozy-text text-lg">Finances</div>
                  <div className="text-sm text-cozy-text-muted">€{income.toFixed(0)} income • €{savings.toFixed(0)} saved</div>
                </div>
              </div>
              <Link href="/finances" className="cozy-btn-primary text-sm px-4 py-2">
                Manage
              </Link>
            </div>
            <Link href="/finances" className="cozy-btn-secondary w-full flex items-center justify-center gap-2 group-hover:bg-cozy-cream transition-all">
              <span>📊 View Budget</span>
              <span className="text-cozy-primary">→</span>
            </Link>
          </div>
        </div>

        <Section title="🌟 Timeline" desc="Recent cozy household moments." tone="cozy">
          <div className="cozy-card p-0">
            <ul className="divide-y divide-cozy-gray-200">
              {[
                { icon: '🥛', title: 'Added fresh milk to shopping', meta: 'Today, 2:30 PM', color: 'cozy-sage-soft' },
                { icon: '🏠', title: 'Paid monthly rent', meta: 'Yesterday', color: 'cozy-primary-soft' },
                { icon: '💖', title: 'Saved for family vacation', meta: '3 days ago', color: 'cozy-cream' },
              ].map((row, i) => (
                <li key={i} className="px-6 py-4 hover:bg-cozy-cream/50 transition-colors">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-cozy bg-${row.color} grid place-items-center mr-4 shadow-cozy-sm`}>
                      {row.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-cozy-text font-medium truncate">{row.title}</div>
                      <div className="text-xs text-cozy-text-muted">{row.meta}</div>
                    </div>
                    <span className="text-cozy-primary text-sm">💫</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </main>
    </Layout>
  );
}
