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

      <main className="mx-4 sm:mx-6 my-5 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-blue-100 grid place-items-center">🧺</div>
                <div>
                  <div className="font-semibold">Shopping List</div>
                  <div className="text-xs text-gray-500">{firstListId ? `${activeCount} items` : 'No list yet'}</div>
                </div>
              </div>
              <Link href="/shopping" className="rounded-xl bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black">Add</Link>
            </div>
            <div className="mt-3">
              <Link href="/shopping" className="w-full inline-flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <span>+ Quick Add</span><span className="text-gray-400">›</span>
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-rose-100 grid place-items-center">💰</div>
                <div>
                  <div className="font-semibold">Finances</div>
                  <div className="text-xs text-gray-500">€{income.toFixed(0)} • €{keeps.toFixed(0)} • €{savings.toFixed(2)}</div>
                </div>
              </div>
              <Link href="/finances" className="rounded-xl bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black">Add</Link>
            </div>
            <div className="mt-3">
              <Link href="/finances" className="w-full inline-flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <span>Quick Add</span><span className="text-gray-400">›</span>
              </Link>
            </div>
          </Card>
        </div>

        <Section title="Timeline" desc="Recent household activity." tone="indigo">
          <Card className="p-0">
            <ul className="divide-y">
              {[
                { icon: '🍼', title: 'Added Milk to the shopping list', meta: 'Apr 22' },
                { icon: '🏦', title: 'Paid Rent', meta: 'Apr 1' },
                { icon: '💸', title: 'Transferred to savings', meta: 'Mar 25' },
              ].map((row, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-xl bg-gray-50 grid place-items-center mr-3">{row.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-800 truncate">{row.title}</div>
                      <div className="text-xs text-gray-500">{row.meta}</div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      </main>
    </Layout>
  );
}
