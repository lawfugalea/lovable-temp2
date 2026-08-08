import type {
  MobileFinanceInsightsResponse,
  MobileFinanceOverviewResponse,
  MobileFinanceSubscriptionsResponse,
  MobileFinanceTransaction,
  MobileFinanceTransactionsResponse,
} from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ApiError } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { fontFamilies, spacing, useAppTheme } from '@/theme'
import {
  AppButton,
  BrandHero,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  InfoBanner,
  ListRow,
  LoadingState,
  MetricTile,
  Screen,
  SectionHeader,
  StatusPill,
} from '@/ui'

type BankingView = 'overview' | 'activity' | 'insights' | 'subscriptions'

const views: { value: BankingView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'overview', label: 'Accounts', icon: 'card-outline' },
  { value: 'activity', label: 'Activity', icon: 'swap-vertical-outline' },
  { value: 'insights', label: 'Insights', icon: 'stats-chart-outline' },
  { value: 'subscriptions', label: 'Subscriptions', icon: 'repeat-outline' },
]

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0)
}
function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'
}

export default function BankingScreen() {
  const { colors } = useAppTheme()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [view, setView] = useState<BankingView>('overview')
  const [overview, setOverview] = useState<MobileFinanceOverviewResponse | null>(null)
  const [transactions, setTransactions] = useState<MobileFinanceTransaction[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [insights, setInsights] = useState<MobileFinanceInsightsResponse | null>(null)
  const [subscriptions, setSubscriptions] = useState<MobileFinanceSubscriptionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [upgradeRequired, setUpgradeRequired] = useState(false)

  const handleError = useCallback((reason: unknown, fallback: string) => {
    if (reason instanceof ApiError && reason.code === 'upgrade_required') {
      setUpgradeRequired(true)
      setError('')
      return
    }
    setError(reason instanceof Error ? reason.message : fallback)
  }, [])

  const loadOverview = useCallback(async () => {
    if (!householdId) return
    const next = await request<MobileFinanceOverviewResponse>(`/api/mobile/v1/finance/overview?householdId=${encodeURIComponent(householdId)}`)
    setOverview(next)
    setUpgradeRequired(false)
  }, [householdId, request])

  const loadTransactions = useCallback(async (cursor?: string | null) => {
    if (!householdId) return
    const result = await request<MobileFinanceTransactionsResponse>(
      `/api/mobile/v1/finance/transactions?householdId=${encodeURIComponent(householdId)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    )
    setTransactions(current => cursor ? [...current, ...result.transactions] : result.transactions)
    setNextCursor(result.nextCursor)
  }, [householdId, request])

  const loadInsights = useCallback(async () => {
    if (!householdId) return
    setInsights(await request<MobileFinanceInsightsResponse>(`/api/mobile/v1/finance/insights?householdId=${encodeURIComponent(householdId)}&days=90`))
  }, [householdId, request])

  const loadSubscriptions = useCallback(async () => {
    if (!householdId) return
    setSubscriptions(await request<MobileFinanceSubscriptionsResponse>(`/api/mobile/v1/finance/subscriptions?householdId=${encodeURIComponent(householdId)}`))
  }, [householdId, request])

  useEffect(() => {
    setLoading(true)
    void loadOverview().catch(reason => handleError(reason, 'Could not load Banking.')).finally(() => setLoading(false))
  }, [handleError, loadOverview])

  useEffect(() => {
    if (!overview?.bankEnabled) return
    if (view === 'activity' && !transactions.length) {
      setBusy('load-view')
      void loadTransactions().catch(reason => handleError(reason, 'Could not load activity.')).finally(() => setBusy(''))
    }
    if (view === 'insights' && !insights) {
      setBusy('load-view')
      void loadInsights().catch(reason => handleError(reason, 'Could not load insights.')).finally(() => setBusy(''))
    }
    if (view === 'subscriptions' && !subscriptions) {
      setBusy('load-view')
      void loadSubscriptions().catch(reason => handleError(reason, 'Could not load subscriptions.')).finally(() => setBusy(''))
    }
  }, [handleError, insights, loadInsights, loadSubscriptions, loadTransactions, overview?.bankEnabled, subscriptions, transactions.length, view])

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try {
      await loadOverview()
      if (view === 'activity' && overview?.bankEnabled) await loadTransactions()
      if (view === 'insights' && overview?.bankEnabled) await loadInsights()
      if (view === 'subscriptions' && overview?.bankEnabled) await loadSubscriptions()
    } catch (reason) {
      handleError(reason, 'Could not refresh Banking.')
    } finally {
      setRefreshing(false)
    }
  }

  if (!householdId) {
    return <Screen><EmptyState icon="business-outline" title="Create a household first" message="Banking becomes available after your household is set up." /></Screen>
  }
  if (loading && !overview) return <Screen><LoadingState label="Loading connected banking…" /></Screen>
  if (upgradeRequired) {
    return (
      <Screen>
        <BrandHero eyebrow="BANKING" title="Connected accounts, kept separate" subtitle="Read-only balances, activity, and insights when Open Banking is enabled." compact />
        <EmptyState icon="diamond-outline" title="Banking is in the Family plan" message="Upgrade on the Clankeep website whenever you are ready." />
      </Screen>
    )
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <BrandHero eyebrow="BANKING" title="Your connected banking" subtitle="Balances and bank activity in a separate read-only space." compact />
      <InfoBanner title="Read-only access" message="Clankeep can display approved account data but cannot move money or make payments." />
      {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}
      {!overview?.bankEnabled ? (
        <EmptyState icon="business-outline" title="Open Banking is not enabled yet" message="Connected balances and transactions will live here. Your household plan remains under Finance." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewTabs}>
            {views.map(item => <Chip key={item.value} label={item.label} icon={item.icon} selected={view === item.value} tone={colors.finances} onPress={() => setView(item.value)} />)}
          </ScrollView>
          {view === 'overview' ? <OverviewView overview={overview} /> : null}
          {view === 'activity' ? <ActivityView transactions={transactions} nextCursor={nextCursor} busy={busy} onMore={() => { setBusy('more'); void loadTransactions(nextCursor).catch(reason => handleError(reason, 'Could not load more activity.')).finally(() => setBusy('')) }} /> : null}
          {view === 'insights' ? <InsightsView insights={insights} loading={busy === 'load-view'} /> : null}
          {view === 'subscriptions' ? <SubscriptionsView data={subscriptions} loading={busy === 'load-view'} /> : null}
        </>
      )}
    </Screen>
  )
}

function OverviewView({ overview }: { overview: MobileFinanceOverviewResponse }) {
  const { colors } = useAppTheme()
  if (!overview.accounts.length) {
    return <EmptyState icon="card-outline" title="No connected accounts" message="Connect or manage your bank from the Banking page on the Clankeep website." />
  }
  return (
    <View style={styles.sectionStack}>
      <SectionHeader title="Balances" detail="Account snapshot" />
      <View style={styles.metrics}>
        {overview.totals.map(total => <MetricTile key={total.currency} icon="wallet-outline" label={`Total · ${total.currency}`} value={money(total.amount, total.currency)} detail={`${overview.accounts.length} visible account${overview.accounts.length === 1 ? '' : 's'}`} color={colors.finances} />)}
      </View>
      {overview.accounts.map(account => (
        <Card key={account.id} style={styles.rowCard}>
          <ListRow icon="card-outline" iconColor={colors.finances} title={account.displayName} subtitle={account.maskedIdentifier || (account.shared ? 'Shared account' : 'Private account')} trailing={<Text style={[styles.rowAmount, { color: colors.text }]}>{account.balance ? money(account.balance.amount, account.balance.currency) : '—'}</Text>} />
        </Card>
      ))}
      <SectionHeader title="Recent activity" />
      {overview.recentTransactions.length
        ? overview.recentTransactions.slice(0, 6).map(transaction => <TransactionRow key={transaction.id} transaction={transaction} />)
        : <EmptyState icon="swap-vertical-outline" title="No recent activity" message="Transactions will appear after your next bank sync." />}
    </View>
  )
}

function ActivityView({ transactions, nextCursor, busy, onMore }: { transactions: MobileFinanceTransaction[]; nextCursor: string | null; busy: string; onMore: () => void }) {
  return (
    <View style={styles.sectionStack}>
      <SectionHeader title="Activity" detail="Newest transactions first" />
      {transactions.length ? (
        <>
          {transactions.map(transaction => <TransactionRow key={transaction.id} transaction={transaction} />)}
          {nextCursor ? <AppButton fullWidth variant="secondary" label="Load more" busy={busy === 'more'} onPress={onMore} /> : null}
        </>
      ) : busy === 'load-view'
        ? <LoadingState label="Loading activity…" />
        : <EmptyState icon="swap-vertical-outline" title="No activity found" message="Booked and pending transactions will appear here after bank sync." />}
    </View>
  )
}

function TransactionRow({ transaction }: { transaction: MobileFinanceTransaction }) {
  const { colors } = useAppTheme()
  const incoming = transaction.signedAmount >= 0
  return (
    <Card style={styles.rowCard}>
      <ListRow icon={incoming ? 'arrow-down-outline' : 'arrow-up-outline'} iconColor={incoming ? colors.success : colors.coral} title={transaction.merchantName || transaction.counterparty || 'Transaction'} subtitle={transaction.account.displayName} meta={`${dateLabel(transaction.bookingDate)} · ${transaction.category}`} trailing={<Text style={[styles.rowAmount, { color: incoming ? colors.success : colors.text }]}>{money(transaction.signedAmount, transaction.currency)}</Text>} />
    </Card>
  )
}

function InsightsView({ insights, loading }: { insights: MobileFinanceInsightsResponse | null; loading: boolean }) {
  const { colors } = useAppTheme()
  if (loading && !insights) return <LoadingState label="Finding spending patterns…" />
  if (!insights?.currencies.length) return <EmptyState icon="sparkles-outline" title="Not enough activity yet" message="Insights appear once booked transactions are available." />
  return (
    <View style={styles.sectionStack}>
      <SectionHeader title="90-day insights" detail={`${dateLabel(insights.dateFrom)} – ${dateLabel(insights.dateTo)}`} />
      {insights.currencies.map(currency => (
        <View key={currency.currency} style={styles.sectionStack}>
          <View style={styles.metrics}>
            <MetricTile icon="arrow-down-circle-outline" label="Income" value={money(currency.summary.income, currency.currency)} color={colors.success} />
            <MetricTile icon="arrow-up-circle-outline" label="Outgoing" value={money(currency.summary.outgoing, currency.currency)} color={colors.coral} />
            <MetricTile icon="leaf-outline" label="Savings rate" value={currency.summary.savingsRate === null ? '—' : `${currency.summary.savingsRate.toFixed(0)}%`} color={colors.finances} />
          </View>
          <SectionHeader title={`Top categories · ${currency.currency}`} />
          {currency.categories.slice(0, 8).map(category => (
            <Card key={category.category} style={styles.insightCard}>
              <View style={styles.insightHead}><Text style={[styles.cardTitle, { color: colors.text }]}>{category.category}</Text><Text style={[styles.rowAmount, { color: colors.text }]}>{money(category.amount, currency.currency)}</Text></View>
              <View style={[styles.progressTrack, { backgroundColor: colors.backgroundRaised }]}><View style={[styles.progressFill, { width: `${Math.max(2, category.percentage)}%`, backgroundColor: colors.finances }]} /></View>
              <Text style={[styles.cardBody, { color: colors.muted }]}>{category.percentage.toFixed(0)}% of outgoing · {category.count} transaction{category.count === 1 ? '' : 's'}</Text>
            </Card>
          ))}
        </View>
      ))}
    </View>
  )
}

function SubscriptionsView({ data, loading }: { data: MobileFinanceSubscriptionsResponse | null; loading: boolean }) {
  const { colors } = useAppTheme()
  if (loading && !data) return <LoadingState label="Checking recurring payments…" />
  if (!data?.subscriptions.length) return <EmptyState icon="repeat-outline" title="No recurring payments found" message="Likely subscriptions appear after enough bank activity is available." />
  return (
    <View style={styles.sectionStack}>
      <SectionHeader title="Recurring payments" detail={`${data.reminders.length} due reminder${data.reminders.length === 1 ? '' : 's'}`} />
      {data.subscriptions.map((item, index) => (
        <Card key={item.id || `${item.displayName}-${index}`} style={styles.rowCard}>
          <ListRow icon="repeat-outline" iconColor={item.dueState === 'OVERDUE' ? colors.danger : colors.notes} title={item.displayName} subtitle={`${item.cadence.toLowerCase()} · ${item.account?.displayName || 'Bank account'}`} meta={item.nextExpectedDate ? `Next expected ${dateLabel(item.nextExpectedDate)}` : `${item.occurrenceCount} observed payments`} trailing={<View style={styles.subscriptionAmount}><Text style={[styles.rowAmount, { color: colors.text }]}>{item.expectedAmount === null ? '—' : money(item.expectedAmount, item.currency)}</Text><StatusPill label={item.dueState || (item.status === 'CONFIRMED' ? 'Confirmed' : 'Detected')} tone={item.dueState === 'OVERDUE' ? 'danger' : item.dueState === 'DUE' ? 'warning' : item.status === 'CONFIRMED' ? 'success' : 'neutral'} /></View>} />
        </Card>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  viewTabs: { gap: spacing.xs, paddingRight: spacing.md },
  sectionStack: { gap: spacing.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rowCard: { paddingVertical: 2 },
  rowAmount: { fontFamily: fontFamilies.bodyBold, fontSize: 14, textAlign: 'right' },
  insightCard: { padding: spacing.sm },
  insightHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { fontFamily: fontFamilies.bodyBold, fontSize: 15, lineHeight: 20 },
  cardBody: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  progressTrack: { height: 7, borderRadius: 99, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: 99 },
  subscriptionAmount: { alignItems: 'flex-end', gap: spacing.xs },
})
