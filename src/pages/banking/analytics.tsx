/**
 * Banking analytics.
 *
 * Every filter is in the URL, so a view can be sent to somebody or bookmarked.
 * Only the period, account and currency cause a refetch — category, merchant,
 * sort and view are all answered from the payload already in hand, which is what
 * makes the drilldown feel instant and browser-back free.
 */
import { useSession } from 'next-auth/react'
import { BarChart3, ShieldCheck, Wallet } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import UpgradeGate from '@/components/UpgradeGate'
import { EmptyState } from '@/components/ui/EmptyState'
import { bankDisplayName } from '@/lib/finance/bank-name'
import { AnalyticsSkeleton } from '@/components/banking/BankingSkeletons'
import { BankingShell } from '@/components/banking/BankingShell'
import { CashFlowBlock } from '@/components/banking/CashFlowBlock'
import { DataQualityNote } from '@/components/banking/DataQualityNote'
import {
  ANALYTICS_PERIODS,
  AnalyticsFilterBar,
} from '@/components/banking/analytics/AnalyticsFilterBar'
import {
  AnalyticsCategorySection,
  type CategorySort,
  type SortDirection,
} from '@/components/banking/analytics/AnalyticsCategorySection'
import { AnalyticsDrilldown } from '@/components/banking/analytics/AnalyticsDrilldown'
import { AnalyticsMerchantSection } from '@/components/banking/analytics/AnalyticsMerchantSection'
import { AnalyticsMonthlySection } from '@/components/banking/analytics/AnalyticsMonthlySection'
import { AnalyticsSummaryRow } from '@/components/banking/analytics/AnalyticsSummaryRow'
import { AnalyticsTransfersSection } from '@/components/banking/analytics/AnalyticsTransfersSection'
import { useBankingAnalytics, useBankingOverview, useHouseholdId } from '@/hooks/useBankingData'
import { filterField, useUrlFilters, type FilterSpec } from '@/hooks/useUrlFilters'
import { FINANCE_CATEGORIES } from '@/lib/finance/enrichment'

type AnalyticsFilters = {
  period: number
  account: string
  currency: string
  category: string
  merchant: string
  sort: CategorySort
  dir: SortDirection
}

const FILTER_SPEC: FilterSpec<AnalyticsFilters> = {
  period: filterField.numberOneOf(ANALYTICS_PERIODS, 90),
  account: filterField.text(),
  currency: filterField.text(),
  category: {
    default: '',
    // Only a real category can be drilled into; anything else is dropped rather
    // than rendering an empty panel for a category that does not exist.
    parse: raw => (FINANCE_CATEGORIES as readonly string[]).includes(raw) ? raw : null,
  },
  merchant: filterField.text(),
  sort: filterField.oneOf(['amount', 'count', 'change', 'name'] as const, 'amount'),
  dir: filterField.oneOf(['asc', 'desc'] as const, 'desc'),
}

export default function BankingAnalyticsPage() {
  const { status } = useSession()
  const { householdId, loading: householdLoading } = useHouseholdId()
  const banking = useBankingOverview(householdId, status === 'authenticated')
  const { filters, setFilters } = useUrlFilters(FILTER_SPEC)

  const overview = banking.overview
  const analytics = useBankingAnalytics({
    householdId,
    days: filters.period,
    accountId: filters.account || undefined,
    currency: filters.currency || undefined,
    enabled: Boolean(overview?.bankEnabled && overview.accounts.length),
    reloadKey: banking.reloadKey,
  })

  if (householdLoading || banking.loading || status === 'loading') {
    return (
      <ModernAppShell title="Banking analytics">
        <div className="mx-auto max-w-7xl"><AnalyticsSkeleton /></div>
      </ModernAppShell>
    )
  }

  if (banking.upgradeRequired) {
    return (
      <ModernAppShell title="Banking analytics">
        <div className="mx-auto max-w-3xl pt-8">
          <UpgradeGate
            icon={ShieldCheck}
            module="finances"
            title="See where your money actually goes"
            description="The Family plan adds read-only banking, spending analytics, recurring-payment detection, and optional coaching."
            bullets={['Category and merchant breakdowns', 'Month-on-month comparisons', 'No payment access']}
          />
        </div>
      </ModernAppShell>
    )
  }

  const active = analytics.active
  const currency = active?.currency ?? 'EUR'
  const selectedCategory = active?.categories.find(category => category.category === filters.category) ?? null

  return (
    <BankingShell
      activeTab="analytics"
      heading="Where your money goes"
      description="Spending by category and merchant, compared with the period before."
      notice={banking.notice}
      error={banking.error || analytics.error}
      onCallbackNotice={banking.setNotice}
      onCallbackError={banking.setError}
    >
      {!overview?.bankEnabled ? (
        <EmptyState
          icon={ShieldCheck}
          module="banking"
          title="Open Banking isn't switched on here"
          description="Your household finance plan still works under Finance."
        />
      ) : !overview.accounts.length ? (
        <EmptyState
          icon={Wallet}
          module="banking"
          title="Nothing to analyse yet"
          description={`Connect ${bankDisplayName(overview.bankName)} from the dashboard and this fills in once the first transactions arrive.`}
        />
      ) : (
        <div className="space-y-6">
          <AnalyticsFilterBar
            period={filters.period}
            account={filters.account}
            currency={filters.currency || currency}
            currencies={analytics.data?.currencies.map(entry => entry.currency) ?? []}
            accounts={overview.accounts}
            coverage={active?.coverage ?? null}
            onChange={patch => setFilters(patch)}
          />

          {analytics.loading && !active ? (
            <AnalyticsSkeleton />
          ) : !active ? (
            <EmptyState
              icon={BarChart3}
              module="banking"
              title={`Nothing booked in the last ${filters.period} days`}
              description="Try a longer period, or clear the account filter."
            />
          ) : (
            <div className={`space-y-6 ${analytics.loading ? 'opacity-60' : ''}`} aria-busy={analytics.loading}>
              <AnalyticsSummaryRow
                summary={active.summary}
                coverage={active.coverage}
                currency={currency}
                periodDays={filters.period}
              />

              <CashFlowBlock
                daily={active.daily}
                range={{ from: active.coverage.dateFrom, to: active.coverage.dateTo }}
                periodDays={filters.period}
                currency={currency}
                internalTransfers={active.internalTransfers}
              />

              <AnalyticsMonthlySection
                monthly={active.monthly}
                currentMonth={active.currentMonth}
                currency={currency}
              />

              <AnalyticsCategorySection
                categories={active.categories}
                comparable={active.coverage.previousCovered}
                periodDays={filters.period}
                currency={currency}
                selected={filters.category}
                sort={filters.sort}
                direction={filters.dir}
                // Changing category invalidates the merchant beneath it.
                onSelect={category => setFilters({ category, merchant: '' })}
                onSort={(sort, dir) => setFilters({ sort, dir })}
              />

              {selectedCategory && (
                <AnalyticsDrilldown
                  category={selectedCategory}
                  merchant={filters.merchant}
                  transactions={active.transactions}
                  currency={currency}
                  onSelectMerchant={merchant => setFilters({ merchant })}
                  onClear={() => setFilters({ category: '', merchant: '' })}
                />
              )}

              <AnalyticsMerchantSection merchants={active.merchants} currency={currency} />

              <AnalyticsTransfersSection internalTransfers={active.internalTransfers} currency={currency} />

              <DataQualityNote
                dataQuality={active.dataQuality}
                internalTransfers={active.internalTransfers}
                coverage={active.coverage}
                currency={currency}
              />
            </div>
          )}
        </div>
      )}
    </BankingShell>
  )
}
