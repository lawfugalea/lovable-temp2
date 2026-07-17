import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Loader2,
  ReceiptText,
  Store,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import type { CurrencyFinanceInsights, FinanceInsights } from '@/lib/finance/insights'

type Props = {
  insights: FinanceInsights | null
  loading: boolean
  periodDays: number
  onPeriodChange: (days: number) => void
}

const categoryColors = [
  '#54796d', '#d48b70', '#78998f', '#c7945f', '#7289a5', '#9a7ca8', '#b57b72', '#6d8f9b',
  '#8d956d', '#a78367', '#7e8eb2', '#be8b9b', '#71977e', '#a99b6a', '#77808d', '#a2a6a0',
]

function money(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('en-MT', { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${code}`
  }
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat('en-MT', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00Z`))
}

function CashFlowChart({ data, currency }: { data: CurrencyFinanceInsights['daily']; currency: string }) {
  const buckets = useMemo(() => {
    const size = Math.max(1, Math.ceil(data.length / 14))
    const result: Array<{ date: string; income: number; outgoing: number }> = []
    for (let index = 0; index < data.length; index += size) {
      const slice = data.slice(index, index + size)
      result.push({
        date: slice[0]?.date || '',
        income: slice.reduce((total, day) => total + day.income, 0),
        outgoing: slice.reduce((total, day) => total + day.outgoing, 0),
      })
    }
    return result
  }, [data])
  const maximum = Math.max(1, ...buckets.flatMap(bucket => [bucket.income, bucket.outgoing]))
  const width = 760
  const height = 220
  const chartHeight = 160
  const groupWidth = width / Math.max(1, buckets.length)
  const barWidth = Math.min(18, groupWidth * 0.32)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-cozy-text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Money in</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cozy-primary" />Money out</span>
        </div>
        <span>Peak {money(maximum, currency)}</span>
      </div>
      <div className="overflow-x-auto">
        <svg className="h-56 min-w-[620px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Income and outgoing cash flow chart">
          {[0, 0.5, 1].map(ratio => {
            const y = 14 + chartHeight * ratio
            return <line key={ratio} x1="0" x2={width} y1={y} y2={y} stroke="currentColor" className="text-cozy-gray-200" strokeDasharray="4 5" />
          })}
          {buckets.map((bucket, index) => {
            const center = index * groupWidth + groupWidth / 2
            const incomeHeight = bucket.income / maximum * chartHeight
            const outgoingHeight = bucket.outgoing / maximum * chartHeight
            return (
              <g key={`${bucket.date}-${index}`}>
                <rect x={center - barWidth - 1} y={174 - incomeHeight} width={barWidth} height={incomeHeight} rx="4" fill="#10b981" opacity="0.85">
                  <title>{`${shortDate(bucket.date)} income: ${money(bucket.income, currency)}`}</title>
                </rect>
                <rect x={center + 1} y={174 - outgoingHeight} width={barWidth} height={outgoingHeight} rx="4" fill="#54796d">
                  <title>{`${shortDate(bucket.date)} outgoing: ${money(bucket.outgoing, currency)}`}</title>
                </rect>
                {(index === 0 || index === buckets.length - 1 || index % Math.ceil(buckets.length / 4) === 0) && (
                  <text x={center} y="204" textAnchor="middle" className="fill-cozy-text-muted text-[10px]">{shortDate(bucket.date)}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default function FinanceInsightsPanel({ insights, loading, periodDays, onPeriodChange }: Props) {
  const [currency, setCurrency] = useState('')
  useEffect(() => {
    if (!insights?.currencies.some(item => item.currency === currency)) {
      setCurrency(insights?.currencies[0]?.currency || '')
    }
  }, [currency, insights])
  const active = insights?.currencies.find(item => item.currency === currency) || insights?.currencies[0] || null

  return (
    <section className="space-y-4" aria-labelledby="finance-insights-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-cozy-primary">
            <BarChart3 className="h-4 w-4" /> Insights
          </div>
          <h2 id="finance-insights-title" className="mt-1 text-2xl font-bold text-cozy-text">Cash flow at a glance</h2>
          <p className="mt-1 text-sm text-cozy-text-muted">Calculated locally from booked transactions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {insights && insights.currencies.length > 1 && (
            <select
              className="h-9 rounded-lg border border-cozy-gray-300 bg-cozy-surface px-3 text-sm"
              value={currency}
              onChange={event => setCurrency(event.target.value)}
              aria-label="Insight currency"
            >
              {insights.currencies.map(item => <option key={item.currency}>{item.currency}</option>)}
            </select>
          )}
          <div className="flex rounded-lg border border-cozy-gray-200 bg-cozy-surface p-1">
            {[30, 90, 180, 365].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => onPeriodChange(days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${periodDays === days ? 'bg-cozy-primary text-white shadow-sm' : 'text-cozy-text-muted hover:text-cozy-text'}`}
              >
                {days === 365 ? '1y' : `${days}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !active && (
        <Card className="hover:-translate-y-0"><CardContent className="flex min-h-56 items-center justify-center text-sm text-cozy-text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Building insights…</CardContent></Card>
      )}
      {!loading && !active && (
        <Card className="hover:-translate-y-0"><CardContent className="py-12 text-center"><ReceiptText className="mx-auto mb-3 h-8 w-8 text-cozy-text-muted" /><p className="font-medium">No booked transactions in this period</p><p className="mt-1 text-sm text-cozy-text-muted">Try a longer range or another account.</p></CardContent></Card>
      )}
      {active && (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
            <Card className="hover:-translate-y-0"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-cozy-text-muted">Money in</p><p className="mt-2 text-2xl font-bold text-emerald-700">{money(active.summary.income, active.currency)}</p></div><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><ArrowDownLeft className="h-5 w-5" /></span></div><p className="mt-3 text-xs text-cozy-text-muted">Booked over {periodDays} days</p></CardContent></Card>
            <Card className="hover:-translate-y-0"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-cozy-text-muted">Money out</p><p className="mt-2 text-2xl font-bold text-cozy-text">{money(active.summary.outgoing, active.currency)}</p></div><span className="rounded-lg bg-cozy-primary-soft p-2 text-cozy-primary"><ArrowUpRight className="h-5 w-5" /></span></div><p className="mt-3 text-xs text-cozy-text-muted">{active.summary.outgoingChangePercent === null ? 'No prior-period comparison' : `${Math.abs(active.summary.outgoingChangePercent).toFixed(0)}% ${active.summary.outgoingChangePercent > 0 ? 'more' : 'less'} than prior period`}</p></CardContent></Card>
            <Card className="hover:-translate-y-0"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-cozy-text-muted">Net cash flow</p><p className={`mt-2 text-2xl font-bold ${active.summary.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(active.summary.net, active.currency)}</p></div><span className={`rounded-lg p-2 ${active.summary.net >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{active.summary.net >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}</span></div><p className="mt-3 text-xs text-cozy-text-muted">Income minus outgoing</p></CardContent></Card>
            <Card className="hover:-translate-y-0"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-cozy-text-muted">Daily average out</p><p className="mt-2 text-2xl font-bold text-cozy-text">{money(active.summary.averageOutgoing, active.currency)}</p></div><span className="rounded-lg bg-cozy-cream p-2 text-cozy-text"><ReceiptText className="h-5 w-5" /></span></div><p className="mt-3 text-xs text-cozy-text-muted">{active.summary.transactionCount} booked transactions</p></CardContent></Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
            <Card className="hover:-translate-y-0"><CardHeader><CardTitle className="text-lg">Cash-flow trend</CardTitle><CardDescription>{insights?.dateFrom} to {insights?.dateTo}</CardDescription></CardHeader><CardContent><CashFlowChart data={active.daily} currency={active.currency} /></CardContent></Card>
            <Card className="hover:-translate-y-0"><CardHeader><CardTitle className="text-lg">Spending categories</CardTitle><CardDescription>Share of all money out</CardDescription></CardHeader><CardContent className="space-y-4">{active.categories.slice(0, 8).map((item, index) => <div key={item.category}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-cozy-text">{item.category}</span><span className="text-cozy-text-muted">{money(item.amount, active.currency)}</span></div><div className="h-2 overflow-hidden rounded-full bg-cozy-gray-100"><div className="h-full rounded-full" style={{ width: `${Math.max(2, item.percentage)}%`, backgroundColor: categoryColors[index % categoryColors.length] }} /></div><p className="mt-1 text-[11px] text-cozy-text-muted">{item.count} transactions · {item.percentage.toFixed(0)}%</p></div>)}{!active.categories.length && <p className="py-8 text-center text-sm text-cozy-text-muted">No outgoing transactions.</p>}</CardContent></Card>
          </div>

          <Card className="hover:-translate-y-0"><CardHeader><div className="flex items-center gap-2"><Store className="h-5 w-5 text-cozy-primary" /><CardTitle className="text-lg">Top merchants and payees</CardTitle></div><CardDescription>Largest outgoing totals in the selected period</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{active.merchants.slice(0, 8).map((merchant, index) => <div key={merchant.merchantName} className="rounded-xl border border-cozy-gray-200 bg-cozy-warm/40 p-4"><div className="flex items-start justify-between gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cozy-primary-soft text-xs font-bold text-cozy-primary">{index + 1}</span><span className="text-right font-semibold text-cozy-text">{money(merchant.amount, active.currency)}</span></div><p className="mt-3 truncate font-medium text-cozy-text" title={merchant.merchantName}>{merchant.merchantName}</p><p className="mt-1 text-xs text-cozy-text-muted">{merchant.category} · {merchant.count} payments</p></div>)}{!active.merchants.length && <p className="col-span-full py-8 text-center text-sm text-cozy-text-muted">No outgoing merchants in this period.</p>}</div></CardContent></Card>
        </>
      )}
    </section>
  )
}

function CategoryDrilldown({ data, category, onClose }: { data: CurrencyFinanceInsights; category: string; onClose: () => void }) {
  const [merchantFilter, setMerchantFilter] = useState('ALL')
  const [transactionSort, setTransactionSort] = useState<'recent' | 'amount'>('recent')

  useEffect(() => {
    setMerchantFilter('ALL')
  }, [category])

  if (category === 'ALL') return null
  const categorySummary = data.categories.find(item => item.category === category)
  if (!categorySummary) return null
  const categoryMerchants = data.merchants
    .filter(item => item.category === category)
    .sort((left, right) => right.amount - left.amount)
  const visibleTransactions = data.transactions
    .filter(item => item.category === category && (merchantFilter === 'ALL' || item.merchantName === merchantFilter))
    .sort((left, right) => transactionSort === 'amount'
      ? right.amount - left.amount
      : right.date.localeCompare(left.date) || right.amount - left.amount)
  const filteredTotal = visibleTransactions.reduce((total, transaction) => total + transaction.amount, 0)

  return (
    <Card className="border-cozy-primary/30 bg-cozy-primary-soft/10 hover:-translate-y-0">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cozy-primary px-2.5 py-1 text-xs font-semibold text-white">Drill-down</span>
              <CardTitle className="text-xl">{category}</CardTitle>
            </div>
            <CardDescription className="mt-2">Every merchant and transaction included in this category.</CardDescription>
          </div>
          <button type="button" onClick={onClose} className="self-start rounded-lg border border-cozy-gray-300 bg-white px-3 py-2 text-xs font-medium">Close drill-down</button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-cozy-gray-200 bg-white p-4"><p className="text-xs text-cozy-text-muted">Total spent</p><p className="mt-1 text-xl font-bold">{money(categorySummary.amount, data.currency)}</p></div>
          <div className="rounded-xl border border-cozy-gray-200 bg-white p-4"><p className="text-xs text-cozy-text-muted">Transactions</p><p className="mt-1 text-xl font-bold">{categorySummary.count}</p></div>
          <div className="rounded-xl border border-cozy-gray-200 bg-white p-4"><p className="text-xs text-cozy-text-muted">Average purchase</p><p className="mt-1 text-xl font-bold">{money(categorySummary.average, data.currency)}</p></div>
          <div className="rounded-xl border border-cozy-gray-200 bg-white p-4"><p className="text-xs text-cozy-text-muted">Previous period</p><p className="mt-1 text-xl font-bold">{money(categorySummary.previousAmount, data.currency)}</p></div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">Where the money went</h3>{merchantFilter !== 'ALL' && <button type="button" className="text-xs font-medium text-cozy-primary" onClick={() => setMerchantFilter('ALL')}>Clear merchant filter</button>}</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {categoryMerchants.map(merchant => (
              <button key={merchant.merchantName} type="button" onClick={() => setMerchantFilter(current => current === merchant.merchantName ? 'ALL' : merchant.merchantName)} className={`rounded-xl border p-3 text-left transition ${merchantFilter === merchant.merchantName ? 'border-cozy-primary bg-cozy-primary-soft' : 'border-cozy-gray-200 bg-white hover:border-cozy-primary/50'}`}>
                <div className="flex items-start justify-between gap-3"><span className="truncate text-sm font-medium" title={merchant.merchantName}>{merchant.merchantName}</span><span className="whitespace-nowrap text-sm font-semibold">{money(merchant.amount, data.currency)}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cozy-gray-100"><div className="h-full rounded-full bg-cozy-primary" style={{ width: `${Math.max(3, merchant.amount / categorySummary.amount * 100)}%` }} /></div>
                <p className="mt-1.5 text-[11px] text-cozy-text-muted">{merchant.count} purchase{merchant.count === 1 ? '' : 's'} · {(merchant.amount / categorySummary.amount * 100).toFixed(1)}%</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-cozy-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-cozy-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-semibold">Transactions{merchantFilter !== 'ALL' ? ` · ${merchantFilter}` : ''}</h3><p className="mt-0.5 text-xs text-cozy-text-muted">{visibleTransactions.length} items totalling {money(filteredTotal, data.currency)}</p></div>
            <select value={transactionSort} onChange={event => setTransactionSort(event.target.value as 'recent' | 'amount')} className="h-9 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm"><option value="recent">Newest first</option><option value="amount">Largest first</option></select>
          </div>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="sticky top-0 bg-white"><tr className="border-b text-left text-xs text-cozy-text-muted"><th className="px-4 py-3">Date</th><th>Merchant</th><th>Details</th><th>Account</th><th className="pr-4 text-right">Amount</th></tr></thead>
              <tbody>{visibleTransactions.map(transaction => <tr key={transaction.id} className="border-b border-cozy-gray-100 last:border-0"><td className="whitespace-nowrap px-4 py-3">{shortDate(transaction.date)}</td><td className="font-medium">{transaction.merchantName}</td><td className="max-w-64 truncate text-cozy-text-muted" title={transaction.detail || ''}>{transaction.detail || '—'}</td><td className="text-cozy-text-muted">{transaction.accountName || '—'}</td><td className="whitespace-nowrap pr-4 text-right font-semibold">{money(transaction.amount, data.currency)}</td></tr>)}</tbody>
            </table>
            {!visibleTransactions.length && <p className="p-8 text-center text-sm text-cozy-text-muted">No transactions match this merchant.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export function FinanceStatisticsPanel({ insights, loading, periodDays, onPeriodChange }: Props) {
  const [currency, setCurrency] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState<"amount" | "count" | "change" | "name">("amount")
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc")
  useEffect(() => {
    if (!insights?.currencies.some(item => item.currency === currency)) setCurrency(insights?.currencies[0]?.currency || "")
  }, [currency, insights])
  const active = insights?.currencies.find(item => item.currency === currency) || insights?.currencies[0] || null
  const categories = useMemo(() => {
    if (!active) return []
    return [...active.categories].sort((left, right) => {
      const direction = sortDirection === "desc" ? -1 : 1
      if (sortBy === "name") return left.category.localeCompare(right.category) * direction
      if (sortBy === "count") return (left.count - right.count) * direction
      if (sortBy === "change") return ((left.changePercent || 0) - (right.changePercent || 0)) * direction
      return (left.amount - right.amount) * direction
    })
  }, [active, sortBy, sortDirection])
  const merchants = useMemo(() => {
    if (!active) return []
    const filtered = categoryFilter === "ALL" ? active.merchants : active.merchants.filter(item => item.category === categoryFilter)
    return [...filtered].sort((left, right) => {
      const direction = sortDirection === "desc" ? -1 : 1
      if (sortBy === "name") return left.merchantName.localeCompare(right.merchantName) * direction
      if (sortBy === "count") return (left.count - right.count) * direction
      return (left.amount - right.amount) * direction
    })
  }, [active, categoryFilter, sortBy, sortDirection])
  const monthly = useMemo(() => {
    const groups = new Map<string, { income: number; outgoing: number }>()
    for (const day of active?.daily || []) {
      const key = day.date.slice(0, 7)
      const group = groups.get(key) || { income: 0, outgoing: 0 }
      group.income += day.income
      group.outgoing += day.outgoing
      groups.set(key, group)
    }
    return [...groups].map(([month, values]) => ({ month, ...values }))
  }, [active])
  const monthlyMax = Math.max(1, ...monthly.map(item => Math.max(item.income, item.outgoing)))

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="flex items-center gap-2 text-sm font-medium text-cozy-primary"><BarChart3 className="h-4 w-4" /> Detailed analytics</div><h2 className="mt-1 text-2xl font-bold">Statistics</h2><p className="mt-1 text-sm text-cozy-text-muted">Compare categories, merchants, and cash flow with the previous equivalent period.</p></div>
      <div className="flex flex-wrap gap-2">{insights && insights.currencies.length > 1 && <select className="h-9 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm" value={currency} onChange={event => setCurrency(event.target.value)}>{insights.currencies.map(item => <option key={item.currency}>{item.currency}</option>)}</select>}<div className="flex rounded-lg border border-cozy-gray-200 bg-white p-1">{[30, 90, 180, 365].map(days => <button key={days} type="button" onClick={() => onPeriodChange(days)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${periodDays === days ? "bg-cozy-primary text-white" : "text-cozy-text-muted"}`}>{days === 365 ? "1y" : `${days}d`}</button>)}</div></div>
    </div>
    {loading && !active ? <Card><CardContent className="flex min-h-56 items-center justify-center text-sm text-cozy-text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Building statistics…</CardContent></Card> : !active ? <Card><CardContent className="py-12 text-center text-sm text-cozy-text-muted">No booked transactions in this period.</CardContent></Card> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:-translate-y-0"><CardContent className="p-5"><p className="text-sm text-cozy-text-muted">Total spending</p><p className="mt-2 text-2xl font-bold">{money(active.summary.outgoing, active.currency)}</p><p className="mt-2 text-xs text-cozy-text-muted">{active.summary.outgoingChangePercent === null ? "No previous comparison" : `${Math.abs(active.summary.outgoingChangePercent).toFixed(0)}% ${active.summary.outgoingChangePercent >= 0 ? "more" : "less"} than before`}</p></CardContent></Card>
        <Card className="hover:-translate-y-0"><CardContent className="p-5"><p className="text-sm text-cozy-text-muted">Bills & utilities</p><p className="mt-2 text-2xl font-bold">{money(active.summary.billsTotal, active.currency)}</p><p className="mt-2 text-xs text-cozy-text-muted">{active.summary.outgoing > 0 ? (active.summary.billsTotal / active.summary.outgoing * 100).toFixed(0) : 0}% of spending</p></CardContent></Card>
        <Card className="hover:-translate-y-0"><CardContent className="p-5"><p className="text-sm text-cozy-text-muted">Groceries</p><p className="mt-2 text-2xl font-bold">{money(active.summary.groceriesTotal, active.currency)}</p><p className="mt-2 text-xs text-cozy-text-muted">Average outgoing transaction {money(active.summary.averageTransaction, active.currency)}</p></CardContent></Card>
        <Card className="hover:-translate-y-0"><CardContent className="p-5"><p className="text-sm text-cozy-text-muted">Savings rate</p><p className={`mt-2 text-2xl font-bold ${(active.summary.savingsRate || 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>{active.summary.savingsRate === null ? "—" : `${active.summary.savingsRate.toFixed(1)}%`}</p><p className="mt-2 text-xs text-cozy-text-muted">Largest expense {money(active.summary.largestExpense, active.currency)}</p></CardContent></Card>
      </div>
      <Card className="hover:-translate-y-0"><CardHeader><CardTitle className="text-lg">Monthly cash flow</CardTitle><CardDescription>Income and outgoing totals across the selected period.</CardDescription></CardHeader><CardContent><div className="flex h-56 items-end gap-2 overflow-x-auto border-b border-cozy-gray-200 pb-6">{monthly.map(item => <div key={item.month} className="relative flex min-w-14 flex-1 items-end justify-center gap-1" title={`${item.month}: ${money(item.income, active.currency)} in, ${money(item.outgoing, active.currency)} out`}><div className="w-4 rounded-t bg-emerald-500" style={{ height: `${Math.max(2, item.income / monthlyMax * 180)}px` }} /><div className="w-4 rounded-t bg-cozy-primary" style={{ height: `${Math.max(2, item.outgoing / monthlyMax * 180)}px` }} /><span className="absolute mt-6 text-[10px] text-cozy-text-muted">{item.month.slice(5)}</span></div>)}</div><div className="mt-3 flex gap-4 text-xs text-cozy-text-muted"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Income</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-cozy-primary" />Outgoing</span></div></CardContent></Card>
      <Card className="hover:-translate-y-0"><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle className="text-lg">Category breakdown</CardTitle><CardDescription>Select a category to see every merchant and underlying transaction.</CardDescription></div><div className="flex gap-2"><select className="h-9 rounded-lg border border-cozy-gray-300 bg-white px-3 text-sm" value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}><option value="amount">Sort by amount</option><option value="count">Sort by frequency</option><option value="change">Sort by change</option><option value="name">Sort by name</option></select><button type="button" className="rounded-lg border border-cozy-gray-300 px-3 text-sm" onClick={() => setSortDirection(value => value === "desc" ? "asc" : "desc")}>{sortDirection === "desc" ? "High to low" : "Low to high"}</button></div></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs text-cozy-text-muted"><th className="py-3">Category</th><th>Spent</th><th>Share</th><th>Transactions</th><th>Average</th><th>Largest</th><th>vs previous</th></tr></thead><tbody>{categories.map(item => <tr key={item.category} className={`cursor-pointer border-b border-cozy-gray-100 ${categoryFilter === item.category ? "bg-cozy-primary-soft/60" : "hover:bg-cozy-warm/50"}`} onClick={() => setCategoryFilter(current => current === item.category ? "ALL" : item.category)}><td className="py-3 font-medium"><span className="mr-2 inline-block text-cozy-primary">{categoryFilter === item.category ? '▾' : '›'}</span>{item.category}</td><td>{money(item.amount, active.currency)}</td><td>{item.percentage.toFixed(1)}%</td><td>{item.count}</td><td>{money(item.average, active.currency)}</td><td>{money(item.largest, active.currency)}</td><td className={item.changePercent === null ? "text-cozy-text-muted" : item.changePercent > 0 ? "text-red-700" : "text-emerald-700"}>{item.changePercent === null ? "New" : `${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(0)}%`}</td></tr>)}</tbody></table></div></CardContent></Card>
      <CategoryDrilldown data={active} category={categoryFilter} onClose={() => setCategoryFilter("ALL")} />
      <Card className="hover:-translate-y-0"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-lg">Merchants {categoryFilter !== "ALL" ? `· ${categoryFilter}` : ""}</CardTitle><CardDescription>Sortable merchant totals and purchase frequency.</CardDescription></div>{categoryFilter !== "ALL" && <button type="button" className="rounded-lg border border-cozy-gray-300 px-3 py-2 text-xs" onClick={() => setCategoryFilter("ALL")}>Show all</button>}</div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[660px] text-sm"><thead><tr className="border-b text-left text-xs text-cozy-text-muted"><th className="py-3">Merchant</th><th>Category</th><th>Total</th><th>Purchases</th><th>Average</th><th>Share</th></tr></thead><tbody>{merchants.map(item => <tr key={item.merchantName} className="border-b border-cozy-gray-100"><td className="py-3 font-medium">{item.merchantName}</td><td>{item.category}</td><td>{money(item.amount, active.currency)}</td><td>{item.count}</td><td>{money(item.average, active.currency)}</td><td>{item.percentage.toFixed(1)}%</td></tr>)}</tbody></table></div>{!merchants.length && <p className="py-8 text-center text-sm text-cozy-text-muted">No merchants in this category.</p>}</CardContent></Card>
    </>}
  </section>
}
