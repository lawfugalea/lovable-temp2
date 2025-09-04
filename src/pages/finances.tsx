// src/pages/finances.tsx
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePageState } from '../hooks/usePageState';
import { useSession } from 'next-auth/react';
import { useHouseholdId } from '../lib/useHouseholdId';
import PageHeader from '@/components/ui/PageHeader';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';

type SplitMethod = 'equal' | 'proportional';
type Earner = { id: string; name: string; salary: number; keep: number };
type ExpenseCadence = 'monthly' | 'yearly';
type Expense = { id: string; name: string; amount: number; cadence: ExpenseCadence };
type Account = { id: string; name: string; target: number; isSavings?: boolean; expenses?: Expense[] };

const newId = () => Math.random().toString(36).slice(2, 9);
const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

const SAVINGS_TEMPLATES = [
  { key: 'classic20', label: 'Classic 20% (50/30/20, 80/20, 70/20/10)', pct: 20 },
  { key: 'light10', label: 'Light 10% (60/30/10)', pct: 10 },
  { key: 'retire15', label: 'Retirement 15%', pct: 15 },
  { key: 'aggressive30', label: 'Aggressive 30%', pct: 30 },
  { key: 'sprint40', label: 'Emergency sprint 40%', pct: 40 },
];

const Badge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 text-[10px] uppercase tracking-wide border border-fuchsia-200">
    {children}
  </span>
);

export default function FinancesPage() {
  const { status } = useSession();
  const { householdId, loading: hidLoading, error: hidError } = useHouseholdId();

  if (status === 'loading' || hidLoading) return <Layout><div className="min-h-[50vh] grid place-items-center text-gray-500">Loading…</div></Layout>;
  if (status === 'unauthenticated') return <Layout><div className="p-6 text-red-600">Sign in required</div></Layout>;
  if (!householdId) return <Layout><div className="min-h-[50vh] grid place-items-center text-gray-500">Creating or locating your household…</div></Layout>;

  return <Core householdId={householdId} hidError={hidError} />;
}

function Core({ householdId, hidError }: { householdId: string; hidError?: string | null }) {
  const [earners, setEarners] = useState<Earner[]>([
    { id: newId(), name: 'You', salary: 0, keep: 0 },
    { id: newId(), name: 'Partner', salary: 0, keep: 0 },
  ]);
  const [accounts, setAccounts] = useState<Account[]>([
    { id: newId(), name: 'Monthly Expense', target: 0, expenses: [] },
    { id: newId(), name: 'Expenses', target: 0, expenses: [] },
  ]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [months, setMonths] = useState(12);
  const [startingSavings, setStartingSavings] = useState(0);
  const [savingsPct, setSavingsPct] = useState(20);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('classic20');
  const [equalKeepInput, setEqualKeepInput] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  type FinanceState = { earners:Earner[]; accounts:Account[]; splitMethod:SplitMethod; months:number; startingSavings:number; savingsPct:number; selectedTemplateKey:string; };
  const { value, setValue, loading: psLoading, saving: psSaving, error: psError, saveNow } = usePageState<FinanceState>({
    householdId, page: 'finances',
    initial: { earners, accounts, splitMethod, months, startingSavings, savingsPct, selectedTemplateKey },
    saveDelayMs: 700,
  });

  const [didHydrate, setDidHydrate] = useState(false);
  useEffect(() => {
    if (psLoading || didHydrate) return;
    if (value?.earners) setEarners(value.earners);
    if (value?.accounts) setAccounts(value.accounts);
    if (value?.splitMethod) setSplitMethod(value.splitMethod);
    if (typeof value?.months === 'number') setMonths(value.months);
    if (typeof value?.startingSavings === 'number') setStartingSavings(value.startingSavings);
    if (typeof value?.savingsPct === 'number') setSavingsPct(value.savingsPct);
    if (typeof value?.selectedTemplateKey === 'string') setSelectedTemplateKey(value.selectedTemplateKey);
    setDidHydrate(true);
  }, [psLoading, value, didHydrate]);

  useEffect(() => {
    if (psLoading || !didHydrate) return;
    setValue({ earners, accounts, splitMethod, months, startingSavings, savingsPct, selectedTemplateKey });
  }, [psLoading, didHydrate, earners, accounts, splitMethod, months, startingSavings, savingsPct, selectedTemplateKey, setValue]);

  // derived
  const totalIncome = useMemo(() => earners.reduce((s, e) => s + (e.salary || 0), 0), [earners]);
  const totalKeep   = useMemo(() => earners.reduce((s, e) => s + (e.keep   || 0), 0), [earners]);
  const availableForHouse = Math.max(0, totalIncome - totalKeep);
  const autoSavingsTarget = Math.max(0, availableForHouse * (savingsPct / 100));
  const poolAfterSavings  = Math.max(0, availableForHouse - autoSavingsTarget);
  const allocatedTargets  = accounts.reduce((s, a) => s + (a.target || 0), 0);
  const overAlloc         = allocatedTargets > poolAfterSavings;

  // keep dashboard in sync (used by /dashboard)
  useEffect(() => {
    try { localStorage.setItem('hf_finances_summary', JSON.stringify({ income: totalIncome, keeps: totalKeep, savingsPct })); } catch {}
  }, [totalIncome, totalKeep, savingsPct]);

  const baseForProportional = Math.max(0, earners.reduce((s, e) => s + Math.max(0, e.salary - e.keep), 0));
  const weight = (e: Earner) => (baseForProportional > 0 ? Math.max(0, e.salary - e.keep) / baseForProportional : 0);
  const split = (target: number, e: Earner) =>
    target <= 0 || earners.length === 0 ? 0 : splitMethod === 'equal' ? target / earners.length : baseForProportional > 0 ? target * weight(e) : target / earners.length;

  const projection = useMemo(() => {
    const arr: { m: number; bal: number }[] = [];
    let bal = startingSavings;
    for (let i = 1; i <= Math.max(1, months); i++) { bal += autoSavingsTarget; arr.push({ m: i, bal }); }
    return arr;
  }, [startingSavings, months, autoSavingsTarget]);

  // known expenses helpers
  const monthlyFromExpense = (ex: Expense) => ex.cadence === 'monthly' ? ex.amount : ex.amount / 12;
  const accountMonthlyKnownTotal = (a: Account) => (a.expenses ?? []).reduce((s, ex) => s + monthlyFromExpense(ex), 0);
  const addKnownExpense = (accountId: string) => setAccounts(prev => prev.map(a => a.id !== accountId ? a : ({ ...a, expenses: [ ...(a.expenses ?? []), { id: newId(), name: 'New expense', amount: 0, cadence: 'monthly' as ExpenseCadence } ] })));
  const updateKnownExpense = (accountId: string, expenseId: string, patch: Partial<Expense>) => setAccounts(prev => prev.map(a => a.id !== accountId ? a : ({ ...a, expenses: (a.expenses ?? []).map(ex => ex.id === expenseId ? { ...ex, ...patch } : ex) })));
  const removeKnownExpense = (accountId: string, expenseId: string) => setAccounts(prev => prev.map(a => a.id !== accountId ? a : ({ ...a, expenses: (a.expenses ?? []).filter(ex => ex.id !== expenseId) })));
  const applyKnownToTarget = (accountId: string) => setAccounts(prev => prev.map(a => a.id !== accountId ? a : ({ ...a, target: Math.max(0, Math.round(accountMonthlyKnownTotal(a) * 100) / 100) })));

  // mutators
  const updateEarner  = (id: string, patch: Partial<Earner>) => setEarners(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
  const addEarner     = () => setEarners(p => [...p, { id: newId(), name: `Member ${p.length+1}`, salary: 0, keep: 0 }]);
  const handleRemoveEarner = (id: string) => { if (earners.length > 1) setEarners(p => p.filter(e => e.id !== id)); };
  const updateAccount = (id: string, patch: Partial<Account>) => setAccounts(p => p.map(a => a.id === id ? { ...a, ...patch } : a));
  const addAccount    = () => setAccounts(p => [...p, { id: newId(), name: `Account ${p.length+1}`, target: 0, expenses: [] }]);
  const removeAccount = (id: string) => setAccounts(p => p.filter(a => a.id !== id));
  const setEqualKeeps = (k: number) => setEarners(prev => prev.map(e => ({ ...e, keep: Math.max(0, k) })));
  const computeMaxEqualKeep = () => {
    const n = Math.max(1, earners.length); const S = totalIncome; const T = allocatedTargets; const P = Math.min(0.9999, Math.max(0, savingsPct / 100));
    const denom = (1 - P); if (denom <= 0) return 0; const rawK = (S - (T / denom)) / n;
    const k = Math.max(0, Math.min(rawK, ...earners.map(e => e.salary))); return isFinite(k) ? k : 0;
  };
  const applyMaxEqualKeep = () => { const k = computeMaxEqualKeep(); setEqualKeeps(k); setEqualKeepInput(Number(k.toFixed(2))); };
  const reset = () => {
    setEarners([{ id: newId(), name: 'You', salary: 0, keep: 0 },{ id: newId(), name: 'Partner', salary: 0, keep: 0 }]);
    setAccounts([{ id: newId(), name: 'Monthly Expense', target: 0, expenses: [] },{ id: newId(), name: 'Expenses', target: 0, expenses: [] }]);
    setSplitMethod('equal'); setMonths(12); setStartingSavings(0); setSavingsPct(20); setSelectedTemplateKey('classic20'); setEqualKeepInput(0); setSelectedAccountId(null);
  };

  return (
    <Layout>
      <Head><title>Finances – Houseflow</title></Head>

      <PageHeader
        title="Finances"
        subtitle="Fill fields and tweak to see projections."
        householdId={householdId}
        status={hidError ? <span className="text-red-600">{hidError}</span> : psLoading ? 'Loading…' : psSaving ? 'Saving…' : psError ? <span className="text-rose-600">{psError}</span> : 'All changes saved'}
      />

      {/* Summary bar */}
      <div className="rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 mx-4 sm:mx-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Summary</h2>
            <p className="opacity-95 text-sm sm:text-base">Personal keeps → account targets → <b>savings by %</b>.</p>
          </div>
          <button onClick={()=>saveNow?.()} className="rounded-xl border border-white/40 bg-white/15 px-3 py-1.5 text-xs hover:bg-white/20" title="Persist current values">Save now</button>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-[13px] sm:text-sm">
          <div className="bg-white/15 rounded-lg p-3"><div className="opacity-80">Total income</div><div className="font-semibold">{money(totalIncome)}</div></div>
          <div className="bg-white/15 rounded-lg p-3"><div className="opacity-80">Personal keeps</div><div className="font-semibold">{money(totalKeep)}</div></div>
          <div className="bg-white/15 rounded-lg p-3"><div className="opacity-80">Savings %</div><div className="font-semibold">{savingsPct}%</div></div>
          <div className="bg-white/15 rounded-lg p-3"><div className="opacity-80">Savings (auto)</div><div className="font-semibold">{money(autoSavingsTarget)}</div></div>
          <div className={`${allocatedTargets>poolAfterSavings ? 'bg-red-600/80' : 'bg-white/15'} rounded-lg p-3`}><div className="opacity-80">Pool after savings</div><div className="font-semibold">{money(poolAfterSavings)}</div></div>
        </div>
      </div>

      <div className="grid gap-3 mb-5 mx-4 sm:mx-6">
        <div className="flex items-center gap-3">
          <label className="font-medium text-sm sm:text-base">Split</label>
          <select value={splitMethod} onChange={(e)=>setSplitMethod(e.target.value as SplitMethod)} className="px-3 py-2 border rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="equal">Equal (even split)</option>
            <option value="proportional">Proportional (by salary − keep)</option>
          </select>
          <button onClick={reset} className="ml-auto px-3 py-2 rounded-md border hover:bg-gray-50">Reset</button>
        </div>
      </div>

      {/* main two columns */}
      <div className="mx-4 sm:mx-6">
        {/* savings */}
        <Section title="Savings" tone="fuchsia" desc="Pick a template and tweak the %">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Template</label>
              <select className="w-full px-3 py-2 border rounded-md" value={selectedTemplateKey} onChange={(e)=>{ setSelectedTemplateKey(e.target.value); const t = SAVINGS_TEMPLATES.find(x=>x.key===e.target.value); if (t) setSavingsPct(t.pct); }}>
                {SAVINGS_TEMPLATES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <p className="text-xs text-gray-600 mt-1">Savings is taken first from the pool (income − keeps).</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Savings percentage</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input type="number" className="w-20 border rounded px-2 py-1" value={savingsPct} min={0} max={100} onChange={(e)=>setSavingsPct(Math.max(0, Math.min(100, Number(e.target.value||0))))} />
                <input type="range" min={0} max={60} step={1} className="flex-1" value={savingsPct} onChange={(e)=>setSavingsPct(Number(e.target.value))} />
              </div>
            </div>
          </div>
          {overAlloc && <div className="mt-3 rounded-xl border border-red-300 bg-red-50 text-red-700 p-3">Your account targets ({money(allocatedTargets)}) exceed the pool after savings ({money(poolAfterSavings)}).</div>}
        </Section>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {/* earners */}
          <Section title="Earners" tone="indigo" actions={<button onClick={addEarner} className="px-3 py-2 rounded-md border hover:bg-gray-50">Add earner</button>}>
            <div className="rounded-xl border p-3 mb-3 bg-indigo-50/40">
              <div className="text-sm font-medium mb-2">Keep tools</div>
              <div className="grid gap-2 sm:flex sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Equal keep per earner (€)</span>
                  <input type="number" min={0} value={equalKeepInput} onChange={(e)=>setEqualKeepInput(Number(e.target.value||0))} className="border rounded px-2 py-1 w-28 placeholder-gray-400" />
                  <button onClick={()=>setEqualKeeps(equalKeepInput)} className="px-3 py-2 rounded-md border hover:bg-gray-50">Apply</button>
                </div>
                <button onClick={applyMaxEqualKeep} className="px-3 py-2 rounded-md border hover:bg-gray-50 w-full sm:w-auto">Max equal keep we can afford</button>
              </div>
              <p className="text-xs text-gray-600 mt-2">We clamp to the feasible maximum after taking savings first.</p>
            </div>
            <div className="space-y-3">
              {earners.map((e, idx)=>(
                <div key={e.id} className="rounded-xl border p-3 grid gap-3 sm:grid-cols-4 items-center overflow-hidden">
                  <input className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={e.name} onChange={(ev)=>updateEarner(e.id,{name:ev.target.value})} placeholder={`Member ${idx+1}`} />
                  <input type="number" min={0} className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={e.salary} onChange={(ev)=>updateEarner(e.id,{salary:Number(ev.target.value||0)})} placeholder="Salary €" />
                  <input type="number" min={0} className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={e.keep} onChange={(ev)=>updateEarner(e.id,{keep:Number(ev.target.value||0)})} placeholder="Personal keep €" />
                  <button onClick={()=>handleRemoveEarner(e.id)} disabled={earners.length<=1} className={`justify-self-start sm:justify-self-end px-3 py-2 rounded-md border transition ${earners.length<=1?'opacity-40 cursor-not-allowed':'hover:bg-gray-50 text-red-600'}`}>remove</button>
                </div>
              ))}
            </div>
          </Section>

          {/* accounts */}
          <Section title="Accounts (monthly targets)" tone="violet" actions={<button onClick={addAccount} className="px-3 py-2 rounded-md border hover:bg-gray-50">Add account</button>}>
            <div className="space-y-3">
              {accounts.map((a)=>{
                const isSelected = selectedAccountId === a.id;
                const monthlyKnown = accountMonthlyKnownTotal(a);
                return (
                  <div key={a.id} className={`rounded-xl border p-3 grid gap-3 sm:grid-cols-3 items-start overflow-hidden transition ${isSelected?'ring-2 ring-fuchsia-400/60':'hover:shadow-sm'}`}>
                    <div className="sm:col-span-3 grid gap-3 sm:grid-cols-3 items-center cursor-pointer" onClick={()=>setSelectedAccountId(isSelected?null:a.id)} title="Click to view known expenses">
                      <div className="flex items-center gap-2">
                        <input className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400" value={a.name} onClick={(e)=>e.stopPropagation()} onChange={(ev)=>updateAccount(a.id,{name:ev.target.value})} placeholder="Account name" />
                        {isSelected && <Badge>Selected</Badge>}
                      </div>
                      <input type="number" min={0} className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400" value={a.target} onClick={(e)=>e.stopPropagation()} onChange={(ev)=>updateAccount(a.id,{target:Number(ev.target.value||0)})} placeholder="Target €" />
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-600">Known (per month): <b>{money(monthlyKnown)}</b></div>
                        <button onClick={(e)=>{ e.stopPropagation(); removeAccount(a.id); if (isSelected) setSelectedAccountId(null); }} className="justify-self-start sm:justify-self-end px-3 py-2 rounded-md border hover:bg-gray-50 text-red-600">remove</button>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="sm:col-span-3 mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-800">Known expenses</h4>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>addKnownExpense(a.id)} className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-xs">+ Add expense</button>
                            <button onClick={()=>applyKnownToTarget(a.id)} className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-xs" title="Copy per-month known total to this account's target">Set target to known expenses</button>
                          </div>
                        </div>
                        {(a.expenses ?? []).length === 0 ? (
                          <div className="text-xs text-gray-600 mt-2">No known expenses yet. Click <b>+ Add expense</b> to start.</div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {(a.expenses ?? []).map((ex)=>(
                              <div key={ex.id} className="grid gap-2 sm:grid-cols-12 items-center bg-white rounded-lg border p-2">
                                <input className="sm:col-span-5 border rounded px-2 py-1 text-sm" value={ex.name} onChange={(e)=>updateKnownExpense(a.id, ex.id, { name: e.target.value })} placeholder="Name (e.g., Rent, Insurance)" />
                                <input type="number" min={0} className="sm:col-span-3 border rounded px-2 py-1 text-sm" value={ex.amount} onChange={(e)=>updateKnownExpense(a.id, ex.id, { amount: Number(e.target.value || 0) })} placeholder="Amount €" />
                                <select className="sm:col-span-3 border rounded px-2 py-1 text-sm" value={ex.cadence} onChange={(e)=>updateKnownExpense(a.id, ex.id, { cadence: e.target.value as ExpenseCadence })}>
                                  <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                                </select>
                                <button onClick={()=>removeKnownExpense(a.id, ex.id)} className="sm:col-span-1 justify-self-end px-2 py-1 rounded-md border text-red-600 text-xs hover:bg-gray-50">-</button>
                                <div className="sm:col-span-12 text-[11px] text-gray-600">Per month: <b>{money(monthlyFromExpense(ex))}</b></div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 text-xs text-gray-600">Tip: Mark <b>Yearly</b> items (e.g., insurance) — we convert to monthly by dividing by 12.</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* contributions */}
        <Section title="Recommended Contributions" tone="fuchsia">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead><tr className="text-left border-b"><th className="py-2 pr-4">Account</th>{earners.map(e=><th key={e.id} className="py-2 pr-4">{e.name}</th>)}<th className="py-2">Total</th></tr></thead>
              <tbody>
                {[...accounts, { id: 'savings', name: `Savings (auto ${savingsPct}%)`, target: autoSavingsTarget, isSavings: true }].map(a=>{
                  const per = earners.map(e=>split(a.target, e));
                  const total = per.reduce((s,n)=>s+n,0);
                  return (<tr key={a.id} className="border-b"><td className="py-2 pr-4 font-medium">{a.name}</td>{per.map((n,i)=><td key={i} className="py-2 pr-4">{money(n)}</td>)}<td className="py-2">{money(total)}</td></tr>);
                })}
                <tr className="font-semibold">
                  <td className="py-2 pr-4">Total per person</td>
                  {earners.map(e=>{
                    const sum = accounts.reduce((s,a)=>s+split(a.target,e),0)+split(autoSavingsTarget,e);
                    return <td key={e.id} className="py-2 pr-4">{money(sum)}</td>;
                  })}
                  <td className="py-2">{money(allocatedTargets + autoSavingsTarget)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* projection */}
        <Section title="Savings Projection" tone="indigo">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-700">Monthly savings used: <b>{money(autoSavingsTarget)}</b></div>
            <div className="flex items-center gap-3 text-sm">
              <label>Starting balance (€)
                <input type="number" className="border rounded px-2 py-1 ml-2 w-28" value={startingSavings} min={0} onChange={(e)=>setStartingSavings(Number(e.target.value||0))} />
              </label>
              <label>Months
                <input type="number" className="border rounded px-2 py-1 ml-2 w-20" value={months} min={1} onChange={(e)=>setMonths(Math.max(1, Number(e.target.value||1)))} />
              </label>
            </div>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-[380px] text-xs sm:text-sm">
              <thead><tr className="text-left border-b"><th className="py-2 pr-4">Month</th><th className="py-2">Projected Balance</th></tr></thead>
              <tbody>{projection.map(r=>(<tr key={r.m} className="border-b"><td className="py-2 pr-4">{r.m}</td><td className="py-2">{money(r.bal)}</td></tr>))}</tbody>
            </table>
          </div>
        </Section>
      </div>
    </Layout>
  );
}
