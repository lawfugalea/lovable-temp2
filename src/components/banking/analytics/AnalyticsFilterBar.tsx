/**
 * Period, account and currency, plus how complete the answer is.
 *
 * The coverage badge sits here rather than beside every figure: stating it once,
 * next to the control that caused it, is enough.
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { coverageLabel } from '@/lib/finance/format'
import type { CoverageInfo } from '@/lib/finance/analytics-types'
import type { Account } from '../types'

export const ANALYTICS_PERIODS = [30, 90, 180, 365] as const

export type AnalyticsFilterBarProps = {
  period: number
  account: string
  currency: string
  currencies: string[]
  accounts: Account[]
  coverage: CoverageInfo | null
  onChange: (patch: { period?: number; account?: string; currency?: string }) => void
}

export function AnalyticsFilterBar({
  period,
  account,
  currency,
  currencies,
  accounts,
  coverage,
  onChange,
}: AnalyticsFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={String(period)}
          onValueChange={value => { if (value) onChange({ period: Number(value) }) }}
          aria-label="Period to analyse"
        >
          {ANALYTICS_PERIODS.map(days => (
            <ToggleGroupItem key={days} value={String(days)} aria-label={`Last ${days} days`}>
              {days}d
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <select
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          value={account}
          onChange={event => onChange({ account: event.target.value })}
          aria-label="Filter by account"
        >
          <option value="">All accounts</option>
          {accounts.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}
        </select>

        {/* Only worth showing when there is a choice to make. */}
        {currencies.length > 1 && (
          <select
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            value={currency}
            onChange={event => onChange({ currency: event.target.value })}
            aria-label="Currency"
          >
            {currencies.map(code => <option key={code} value={code}>{code}</option>)}
          </select>
        )}

        {coverage && !coverage.complete && (
          <Badge variant="outline" title={coverageLabel(coverage)} className="font-normal">
            Based on {coverage.coveredDays} of {coverage.periodDays} days
          </Badge>
        )}
      </div>

      <Link
        href="/banking"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  )
}
