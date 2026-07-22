import type { MobileFinanceCoachResponse, MobileFinanceCommitment, MobileFinanceGoal, MobileFinanceIncome, MobileFinanceInsightsResponse, MobileFinanceOverviewResponse, MobileFinancePlannerResponse, MobileFinanceSubscriptionsResponse, MobileFinanceTransaction, MobileFinanceTransactionsResponse, MobilePlannerFrequency } from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { DateTimeField } from '@/DateTimeField'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import { AppButton, BrandHero, Card, Chip, EmptyState, ErrorBanner, Field, InfoBanner, ListRow, LoadingState, MetricTile, Screen, SectionHeader, SheetHeader, StatusPill, useResponsive } from '@/ui'

type FinanceView = 'overview' | 'plan' | 'coach' | 'activity' | 'insights' | 'subscriptions'
type CoachState = { kind: 'idle' } | { kind: 'consent'; preview: Extract<MobileFinanceCoachResponse, { requiresConsent: true }>['preview'] } | { kind: 'result'; result: Extract<MobileFinanceCoachResponse, { requiresConsent: false }> }
type EntryEditor =
  | { kind: 'income'; id?: string; label: string; amount: string; frequency: MobilePlannerFrequency; userId: string }
  | { kind: 'commitment'; id?: string; label: string; amount: string; frequency: MobilePlannerFrequency; userId: string; category: string; essential: boolean }
  | { kind: 'goal'; id?: string; name: string; target: string; saved: string; targetDate: string }

const views: { value: FinanceView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'overview', label: 'Overview', icon: 'grid-outline' }, { value: 'plan', label: 'Plan', icon: 'calculator-outline' },
  { value: 'coach', label: 'AI Coach', icon: 'sparkles-outline' },
  { value: 'activity', label: 'Activity', icon: 'swap-vertical-outline' }, { value: 'insights', label: 'Insights', icon: 'sparkles-outline' },
  { value: 'subscriptions', label: 'Subscriptions', icon: 'repeat-outline' },
]
const frequencies: { value: MobilePlannerFrequency; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' }, { value: 'FOUR_WEEKLY', label: 'Every 4 weeks' }, { value: 'MONTHLY', label: 'Monthly' },
  { value: 'BIMONTHLY', label: 'Every 2 months' }, { value: 'QUARTERLY', label: 'Quarterly' }, { value: 'ANNUAL', label: 'Yearly' },
]
const categories = [
  ['housing', 'Housing'], ['utilities', 'Utilities'], ['loans', 'Loans & cards'], ['insurance', 'Insurance'], ['transport', 'Transport'],
  ['education', 'School & childcare'], ['subscriptions', 'Subscriptions'], ['health', 'Health'], ['food', 'Food budget'], ['lifestyle', 'Lifestyle'], ['other', 'Other'],
] as const

function eurosFromCents(value: number) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value / 100) }
function money(value: string | number, currency: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0) }
function amountInput(cents: number) { return (cents / 100).toFixed(2) }
function frequencyLabel(value: MobilePlannerFrequency) { return frequencies.find(item => item.value === value)?.label || value }
function categoryLabel(value: string) { return categories.find(item => item[0] === value)?.[1] || value }
function dateLabel(value: string | null) { return value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date' }

export default function FinanceScreen() {
  const { colors } = useAppTheme()
  const { tablet } = useResponsive()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [view, setView] = useState<FinanceView>('overview')
  const [planner, setPlanner] = useState<MobileFinancePlannerResponse | null>(null)
  const [overview, setOverview] = useState<MobileFinanceOverviewResponse | null>(null)
  const [transactions, setTransactions] = useState<MobileFinanceTransaction[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [insights, setInsights] = useState<MobileFinanceInsightsResponse | null>(null)
  const [subscriptions, setSubscriptions] = useState<MobileFinanceSubscriptionsResponse | null>(null)
  const [coach, setCoach] = useState<CoachState>({ kind: 'idle' })
  const [editor, setEditor] = useState<EntryEditor | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const coachPending = useRef(false)

  const handleError = useCallback((reason: unknown, fallback: string) => {
    if (reason instanceof ApiError && reason.code === 'upgrade_required') { setUpgradeRequired(true); setError(''); return }
    setError(reason instanceof Error ? reason.message : fallback)
  }, [])
  const loadCore = useCallback(async () => {
    if (!householdId) return
    const query = `householdId=${encodeURIComponent(householdId)}`
    const [nextPlanner, nextOverview] = await Promise.all([
      request<MobileFinancePlannerResponse>(`/api/mobile/v1/finance/planner?${query}`),
      request<MobileFinanceOverviewResponse>(`/api/mobile/v1/finance/overview?${query}`),
    ])
    setPlanner(nextPlanner); setOverview(nextOverview); setUpgradeRequired(false)
  }, [householdId, request])
  const loadTransactions = useCallback(async (cursor?: string | null) => {
    if (!householdId) return
    const result = await request<MobileFinanceTransactionsResponse>(`/api/mobile/v1/finance/transactions?householdId=${encodeURIComponent(householdId)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
    setTransactions(current => cursor ? [...current, ...result.transactions] : result.transactions); setNextCursor(result.nextCursor)
  }, [householdId, request])
  const loadInsights = useCallback(async () => { if (!householdId) return; setInsights(await request<MobileFinanceInsightsResponse>(`/api/mobile/v1/finance/insights?householdId=${encodeURIComponent(householdId)}&days=90`)) }, [householdId, request])
  const loadSubscriptions = useCallback(async () => { if (!householdId) return; setSubscriptions(await request<MobileFinanceSubscriptionsResponse>(`/api/mobile/v1/finance/subscriptions?householdId=${encodeURIComponent(householdId)}`)) }, [householdId, request])
  useEffect(() => { setLoading(true); void loadCore().catch(reason => handleError(reason, 'Could not load Finance.')).finally(() => setLoading(false)) }, [handleError, loadCore])
  useEffect(() => {
    if (!overview?.bankEnabled) return
    if (view === 'activity' && !transactions.length) { setBusy('load-view'); void loadTransactions().catch(reason => handleError(reason, 'Could not load activity.')).finally(() => setBusy('')) }
    if (view === 'insights' && !insights) { setBusy('load-view'); void loadInsights().catch(reason => handleError(reason, 'Could not load insights.')).finally(() => setBusy('')) }
    if (view === 'subscriptions' && !subscriptions) { setBusy('load-view'); void loadSubscriptions().catch(reason => handleError(reason, 'Could not load subscriptions.')).finally(() => setBusy('')) }
  }, [handleError, insights, loadInsights, loadSubscriptions, loadTransactions, overview?.bankEnabled, subscriptions, transactions.length, view])
  const refresh = async () => {
    setRefreshing(true); setError('')
    try {
      await loadCore()
      if (view === 'activity' && overview?.bankEnabled) await loadTransactions()
      if (view === 'insights' && overview?.bankEnabled) await loadInsights()
      if (view === 'subscriptions' && overview?.bankEnabled) await loadSubscriptions()
    } catch (reason) { handleError(reason, 'Could not refresh Finance.') } finally { setRefreshing(false) }
  }
  const openIncome = (item?: MobileFinanceIncome) => setEditor({ kind: 'income', id: item?.id, label: item?.label || '', amount: item ? amountInput(item.amountCents) : '', frequency: item?.frequency || 'MONTHLY', userId: item?.userId || '' })
  const openCommitment = (item?: MobileFinanceCommitment) => setEditor({ kind: 'commitment', id: item?.id, label: item?.label || '', amount: item ? amountInput(item.amountCents) : '', frequency: item?.frequency || 'MONTHLY', userId: item?.userId || '', category: item?.category || 'other', essential: item?.essential ?? true })
  const openGoal = (item?: MobileFinanceGoal) => setEditor({ kind: 'goal', id: item?.id, name: item?.name || '', target: item ? amountInput(item.targetCents) : '', saved: item ? amountInput(item.savedCents) : '', targetDate: item?.targetDate || '' })
  const saveEntry = async () => {
    if (!householdId || !editor) return
    setBusy('save'); setError('')
    try {
      await request(`/api/mobile/v1/finance/planner/${editor.kind}`, { method: editor.id ? 'PATCH' : 'POST', body: JSON.stringify({ householdId, ...editor }) })
      const next = await request<MobileFinancePlannerResponse>(`/api/mobile/v1/finance/planner?householdId=${encodeURIComponent(householdId)}`)
      setPlanner(next); setEditor(null)
    } catch (reason) { handleError(reason, 'Could not save this planner entry.') } finally { setBusy('') }
  }
  const deleteEntry = (entry: EntryEditor) => Alert.alert('Delete this entry?', 'This removes it from the shared household plan.', [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { if (!householdId || !entry.id) return; setBusy('delete'); void request(`/api/mobile/v1/finance/planner/${entry.kind}`, { method: 'DELETE', body: JSON.stringify({ householdId, id: entry.id }) }).then(async () => { setPlanner(await request<MobileFinancePlannerResponse>(`/api/mobile/v1/finance/planner?householdId=${encodeURIComponent(householdId)}`)); setEditor(null) }).catch(reason => handleError(reason, 'Could not delete this entry.')).finally(() => setBusy('')) } }])
  const requestCoach = async (consent = false) => {
    if (!householdId || coachPending.current) return
    coachPending.current = true
    setBusy('coach'); setError('')
    try {
      const result = await request<MobileFinanceCoachResponse>('/api/mobile/v1/finance/planner/coach', { method: 'POST', body: JSON.stringify({ householdId, ...(consent ? { consent: true } : {}) }) })
      setCoach(result.requiresConsent ? { kind: 'consent', preview: result.preview } : { kind: 'result', result })
    } catch (reason) { handleError(reason, 'Could not build your savings plan.') } finally { coachPending.current = false; setBusy('') }
  }
  const validEditor = useMemo(() => editor?.kind === 'goal' ? Boolean(editor.name.trim() && editor.target.trim()) : Boolean(editor?.label.trim() && editor.amount.trim()), [editor])
  const visibleViews = overview?.bankEnabled ? views : views.filter(item => item.value === 'overview' || item.value === 'plan' || item.value === 'coach')

  if (!householdId) return <Screen><EmptyState icon="wallet-outline" title="Create a household first" message="Finance becomes available after your household is set up." /></Screen>
  if (loading) return <LoadingState label="Loading your money plan…" />
  if (upgradeRequired) return <Screen><BrandHero eyebrow="FINANCE" title="A calmer view of your money" subtitle="Plan income, commitments and goals together, with private bank insights when available." compact /><EmptyState icon="diamond-outline" title="Finance is in the Family plan" message="Your current web and mobile features keep working. Upgrade on the Clankeep website whenever you are ready." /></Screen>
  return <>
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      <BrandHero eyebrow="FINANCE" title="Your money, clearly" subtitle="A private household plan with balances, activity and useful patterns in one calm view." compact />
      <ErrorBanner message={error} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewTabs}>{visibleViews.map(item => <Chip key={item.value} label={item.label} icon={item.icon} selected={view === item.value} tone={colors.finances} onPress={() => setView(item.value)} />)}</ScrollView>
      {view === 'overview' && planner && overview ? <OverviewView planner={planner} overview={overview} onOpenPlan={() => setView('plan')} /> : null}
      {view === 'plan' && planner ? <PlanView planner={planner} tablet={tablet} onIncome={openIncome} onCommitment={openCommitment} onGoal={openGoal} /> : null}
      {view === 'coach' && planner ? <CoachView planner={planner} state={coach} busy={busy === 'coach'} onRequest={requestCoach} onCancel={() => setCoach({ kind: 'idle' })} /> : null}
      {view === 'activity' && overview?.bankEnabled ? <ActivityView transactions={transactions} nextCursor={nextCursor} busy={busy} onMore={() => { setBusy('more'); void loadTransactions(nextCursor).catch(reason => handleError(reason, 'Could not load more activity.')).finally(() => setBusy('')) }} /> : null}
      {view === 'insights' && overview?.bankEnabled ? <InsightsView insights={insights} loading={busy === 'load-view'} /> : null}
      {view === 'subscriptions' && overview?.bankEnabled ? <SubscriptionsView data={subscriptions} loading={busy === 'load-view'} /> : null}
      <InfoBanner title="AI privacy" message="AI coaching uses only the rounded, redacted summary shown for your approval. Your household calculations remain authoritative." />
    </Screen>
    <Modal visible={Boolean(editor)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditor(null)}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.modal, { backgroundColor: colors.background }]}><SheetHeader title={`${editor?.id ? 'Edit' : 'Add'} ${editor?.kind || 'entry'}`} onClose={() => setEditor(null)} action={<AppButton compact label="Save" busy={busy === 'save'} disabled={!validEditor} onPress={() => void saveEntry()} />} />
        {editor ? <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          {editor.kind === 'goal' ? <><Field label="Goal name" leadingIcon="flag-outline" placeholder="Emergency fund" value={editor.name} onChangeText={name => setEditor({ ...editor, name })} /><Field label="Target amount (€)" leadingIcon="wallet-outline" keyboardType="decimal-pad" placeholder="5000" value={editor.target} onChangeText={target => setEditor({ ...editor, target })} /><Field label="Saved so far (€)" leadingIcon="checkmark-circle-outline" keyboardType="decimal-pad" placeholder="0" value={editor.saved} onChangeText={saved => setEditor({ ...editor, saved })} /><DateTimeField label="Target date" mode="date" optional minimumDate={new Date()} value={editor.targetDate} onChange={targetDate => setEditor({ ...editor, targetDate })} /></> : <><Field label={editor.kind === 'income' ? 'Income name' : 'Commitment name'} leadingIcon={editor.kind === 'income' ? 'cash-outline' : 'receipt-outline'} placeholder={editor.kind === 'income' ? 'Salary' : 'Rent'} value={editor.label} onChangeText={label => setEditor({ ...editor, label })} /><Field label="Amount (€)" leadingIcon="wallet-outline" keyboardType="decimal-pad" placeholder="0.00" value={editor.amount} onChangeText={amount => setEditor({ ...editor, amount })} /><ChoiceSection title="Frequency">{frequencies.map(item => <Chip key={item.value} label={item.label} selected={editor.frequency === item.value} tone={colors.finances} onPress={() => setEditor({ ...editor, frequency: item.value })} />)}</ChoiceSection>{planner?.members.length ? <ChoiceSection title="For whom"><Chip label="Household" selected={!editor.userId} tone={colors.finances} onPress={() => setEditor({ ...editor, userId: '' })} />{planner.members.map(member => <Chip key={member.userId} label={member.name} selected={editor.userId === member.userId} tone={colors.finances} onPress={() => setEditor({ ...editor, userId: member.userId })} />)}</ChoiceSection> : null}{editor.kind === 'commitment' ? <><ChoiceSection title="Category">{categories.map(([value, label]) => <Chip key={value} label={label} selected={editor.category === value} tone={colors.finances} onPress={() => setEditor({ ...editor, category: value })} />)}</ChoiceSection><Pressable accessibilityRole="switch" accessibilityState={{ checked: editor.essential }} onPress={() => setEditor({ ...editor, essential: !editor.essential })} style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.flex}><Text style={[styles.switchTitle, { color: colors.text }]}>Essential commitment</Text><Text style={[styles.switchHint, { color: colors.muted }]}>Needed before flexible household spending.</Text></View><Switch value={editor.essential} onValueChange={essential => setEditor({ ...editor, essential })} trackColor={{ false: colors.borderStrong, true: colors.primary }} /></Pressable></> : null}</>}
          {editor.id ? <AppButton fullWidth variant="danger" label="Delete entry" icon="trash-outline" busy={busy === 'delete'} onPress={() => deleteEntry(editor)} /> : null}
        </ScrollView> : null}
      </SafeAreaView>
    </Modal>
  </>
}

function ChoiceSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme()
  return <View style={styles.choice}><Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text><View style={styles.choiceChips}>{children}</View></View>
}

function OverviewView({ planner, overview, onOpenPlan }: { planner: MobileFinancePlannerResponse; overview: MobileFinanceOverviewResponse; onOpenPlan: () => void }) {
  const { colors } = useAppTheme()
  return <View style={styles.sectionStack}>
    <SectionHeader title="This month" detail="Based on your household plan" />
    <View style={styles.metrics}><MetricTile icon="flash-outline" label="Safe to spend weekly" value={eurosFromCents(planner.summary.safeToSpendWeeklyCents)} detail="after planned commitments" color={colors.finances} /><MetricTile icon="trending-up-outline" label="Monthly breathing room" value={eurosFromCents(planner.summary.disposableCents)} detail="income minus commitments" color={planner.summary.disposableCents >= 0 ? colors.success : colors.danger} /></View>
    <Card tone="primary"><View style={styles.planPrompt}><View style={[styles.planIcon, { backgroundColor: colors.primary }]}><Ionicons name="calculator-outline" size={24} color="#FFFFFF" /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.text }]}>Your plan is always editable</Text><Text style={[styles.cardBody, { color: colors.muted }]}>{planner.incomes.length} income source{planner.incomes.length === 1 ? '' : 's'}, {planner.commitments.length} commitment{planner.commitments.length === 1 ? '' : 's'}, and {planner.goals.length} goal{planner.goals.length === 1 ? '' : 's'}.</Text></View><AppButton compact variant="secondary" label="Open plan" onPress={onOpenPlan} /></View></Card>
    {overview.bankEnabled ? <><SectionHeader title="Balances" detail="Account snapshot" /><View style={styles.metrics}>{overview.totals.map(total => <MetricTile key={total.currency} icon="wallet-outline" label={`Total · ${total.currency}`} value={money(total.amount, total.currency)} detail={`${overview.accounts.length} visible account${overview.accounts.length === 1 ? '' : 's'}`} color={colors.finances} />)}</View>{overview.accounts.map(account => <Card key={account.id} style={styles.rowCard}><ListRow icon="card-outline" iconColor={colors.finances} title={account.displayName} subtitle={account.maskedIdentifier || (account.shared ? 'Shared account' : 'Private account')} trailing={<Text style={[styles.rowAmount, { color: colors.text }]}>{account.balance ? money(account.balance.amount, account.balance.currency) : '—'}</Text>} /></Card>)}<SectionHeader title="Recent activity" />{overview.recentTransactions.slice(0, 6).map(transaction => <TransactionRow key={transaction.id} transaction={transaction} />)}</> : null}
  </View>
}

function PlanView({ planner, tablet, onIncome, onCommitment, onGoal }: { planner: MobileFinancePlannerResponse; tablet: boolean; onIncome: (item?: MobileFinanceIncome) => void; onCommitment: (item?: MobileFinanceCommitment) => void; onGoal: (item?: MobileFinanceGoal) => void }) {
  const { colors } = useAppTheme()
  return <View style={styles.sectionStack}>
    <View style={styles.metrics}><MetricTile icon="arrow-down-circle-outline" label="Monthly income" value={eurosFromCents(planner.summary.monthlyIncomeCents)} color={colors.success} /><MetricTile icon="receipt-outline" label="Monthly commitments" value={eurosFromCents(planner.summary.monthlyCommitmentsCents)} color={colors.meals} /><MetricTile icon="sparkles-outline" label="Left to plan" value={eurosFromCents(planner.summary.disposableCents)} color={colors.finances} /></View>
    <View style={[styles.planColumns, tablet && styles.planColumnsTablet]}><View style={styles.planColumn}><SectionHeader title="Income" detail="Regular household income" action={<AppButton compact variant="secondary" label="Add" icon="add" onPress={() => onIncome()} />} />{planner.incomes.length ? planner.incomes.map(item => <PlannerRow key={item.id} icon="cash-outline" color={colors.success} title={item.label} subtitle={`${frequencyLabel(item.frequency)} · ${eurosFromCents(item.amountCents)}`} onPress={() => onIncome(item)} />) : <EmptyState icon="cash-outline" title="No income yet" message="Add income to calculate a realistic weekly amount." />}</View><View style={styles.planColumn}><SectionHeader title="Commitments" detail="Bills and planned spending" action={<AppButton compact variant="secondary" label="Add" icon="add" onPress={() => onCommitment()} />} />{planner.commitments.length ? planner.commitments.map(item => <PlannerRow key={item.id} icon="receipt-outline" color={item.essential ? colors.meals : colors.notes} title={item.label} subtitle={`${categoryLabel(item.category)} · ${frequencyLabel(item.frequency)} · ${eurosFromCents(item.amountCents)}`} onPress={() => onCommitment(item)} />) : <EmptyState icon="receipt-outline" title="No commitments yet" message="Add rent, bills and regular budgets to complete the plan." />}</View></View>
    <SectionHeader title="Savings goals" detail={`Suggested emergency fund: ${eurosFromCents(planner.suggestedEmergencyFundCents)}`} action={<AppButton compact variant="secondary" label="Add goal" icon="add" onPress={() => onGoal()} />} />
    {planner.goals.length ? <View style={styles.goalGrid}>{planner.goals.map(goal => <Pressable key={goal.id} accessibilityRole="button" onPress={() => onGoal(goal)} style={({ pressed }) => [styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}><View style={styles.goalHead}><View style={[styles.goalIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="flag-outline" size={21} color={colors.finances} /></View><StatusPill label={`${Math.round(goal.progress * 100)}%`} tone={goal.progress >= 1 ? 'success' : 'primary'} /></View><Text style={[styles.goalTitle, { color: colors.text }]}>{goal.name}</Text><Text style={[styles.cardBody, { color: colors.muted }]}>{eurosFromCents(goal.savedCents)} of {eurosFromCents(goal.targetCents)} · {dateLabel(goal.targetDate)}</Text><View style={[styles.progressTrack, { backgroundColor: colors.backgroundRaised }]}><View style={[styles.progressFill, { width: `${Math.max(2, goal.progress * 100)}%`, backgroundColor: colors.finances }]} /></View></Pressable>)}</View> : <EmptyState icon="flag-outline" title="No savings goals" message="Add an emergency fund, holiday or another goal worth keeping visible." />}
  </View>
}

function CoachView({ planner, state, busy, onRequest, onCancel }: { planner: MobileFinancePlannerResponse; state: CoachState; busy: boolean; onRequest: (consent?: boolean) => void; onCancel: () => void }) {
  const { colors } = useAppTheme()
  if (!planner.aiConfigured) return <EmptyState icon="sparkles-outline" title="AI coaching is not configured" message="The household plan and calculations work fully without AI. A server administrator must configure DeepSeek before coaching can run." />
  if (!planner.incomes.length && !planner.commitments.length) return <EmptyState icon="calculator-outline" title="Build your plan first" message="Add income and commitments in Plan, then the coach can suggest realistic next steps." />
  if (state.kind === 'idle') return <EmptyState icon="sparkles-outline" title="Build a personalised savings plan" message="The coach receives rounded household totals only—never member names, bank accounts, identities, or exact dates." action={<AppButton label="Build my savings plan" icon="sparkles-outline" busy={busy} onPress={() => onRequest(false)} />} />
  if (state.kind === 'consent') return <View style={styles.sectionStack}>
    <InfoBanner title="Review before anything is sent" message="This is a one-time consent. The exact redacted summary below would be sent to DeepSeek for optional analysis; your local calculations remain authoritative." />
    <Card><View style={styles.coachPreview}><View style={styles.metrics}><MetricTile icon="people-outline" label="Household size" value={String(state.preview.memberCount)} color={colors.finances} /><MetricTile icon="arrow-down-circle-outline" label="Monthly income" value={`€${state.preview.monthlyIncomeEur}`} color={colors.success} /><MetricTile icon="receipt-outline" label="Commitments" value={`€${state.preview.monthlyCommitmentsEur}`} color={colors.meals} /><MetricTile icon="trending-up-outline" label="Disposable" value={`€${state.preview.disposableEur}`} color={state.preview.disposableEur >= 0 ? colors.finances : colors.danger} /></View><Text style={[styles.cardBody, { color: colors.muted }]}>Also included: {state.preview.categories.length} aggregated spending categories and {state.preview.goals.length} sanitised savings goal{state.preview.goals.length === 1 ? '' : 's'}. No names, account data, identities, or exact dates.</Text><View style={styles.coachActions}><AppButton variant="ghost" label="Not now" onPress={onCancel} /><AppButton label="Agree and analyse" icon="lock-closed-outline" busy={busy} onPress={() => onRequest(true)} /></View></View></Card>
  </View>
  return <View style={styles.sectionStack}>
    <Card tone="primary"><View style={styles.coachSummary}><View style={[styles.coachIcon, { backgroundColor: colors.finances }]}><Ionicons name="sparkles" size={23} color="#FFFFFF" /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.text }]}>Your savings perspective</Text><Text style={[styles.coachBody, { color: colors.text }]}>{state.result.summary}</Text><Text style={[styles.cardBody, { color: colors.muted }]}>Generated {new Date(state.result.generatedAt).toLocaleString()} · guidance, not regulated financial advice</Text></View></View></Card>
    <View style={styles.coachGrid}>{state.result.observations.map((observation, index) => <Card key={`${observation.title}-${index}`} style={styles.coachCard}><View style={styles.coachObservationHead}><Text style={[styles.cardTitle, styles.flex, { color: colors.text }]}>{observation.title}</Text>{observation.confidence !== null ? <StatusPill label={`${Math.round(observation.confidence * 100)}%`} tone="primary" /> : null}</View><Text style={[styles.coachBody, { color: colors.muted }]}>{observation.explanation}</Text><View style={[styles.coachSuggestion, { backgroundColor: colors.primarySoft }]}><Ionicons name="arrow-forward-circle-outline" size={19} color={colors.primary} /><Text style={[styles.coachSuggestionText, { color: colors.text }]}>{observation.suggestion}</Text></View></Card>)}</View>
    <AppButton fullWidth variant="secondary" label="Review and refresh" icon="refresh-outline" busy={busy} onPress={() => onRequest(false)} />
  </View>
}

function ActivityView({ transactions, nextCursor, busy, onMore }: { transactions: MobileFinanceTransaction[]; nextCursor: string | null; busy: string; onMore: () => void }) {
  return <View style={styles.sectionStack}><SectionHeader title="Activity" detail="Newest transactions first" />{transactions.length ? <>{transactions.map(transaction => <TransactionRow key={transaction.id} transaction={transaction} />)}{nextCursor ? <AppButton fullWidth variant="secondary" label="Load more" busy={busy === 'more'} onPress={onMore} /> : null}</> : busy === 'load-view' ? <LoadingState label="Loading activity…" /> : <EmptyState icon="swap-vertical-outline" title="No activity found" message="Booked and pending transactions will appear here after bank sync." />}</View>
}

function TransactionRow({ transaction }: { transaction: MobileFinanceTransaction }) {
  const { colors } = useAppTheme(); const incoming = transaction.signedAmount >= 0
  return <Card style={styles.rowCard}><ListRow icon={incoming ? 'arrow-down-outline' : 'arrow-up-outline'} iconColor={incoming ? colors.success : colors.coral} title={transaction.merchantName || transaction.counterparty || 'Transaction'} subtitle={transaction.account.displayName} meta={`${dateLabel(transaction.bookingDate)} · ${transaction.category}`} trailing={<Text style={[styles.rowAmount, { color: incoming ? colors.success : colors.text }]}>{money(transaction.signedAmount, transaction.currency)}</Text>} /></Card>
}

function InsightsView({ insights, loading }: { insights: MobileFinanceInsightsResponse | null; loading: boolean }) {
  const { colors } = useAppTheme()
  if (loading && !insights) return <LoadingState label="Finding spending patterns…" />
  if (!insights?.currencies.length) return <EmptyState icon="sparkles-outline" title="Not enough activity yet" message="Insights appear once booked transactions are available." />
  return <View style={styles.sectionStack}><SectionHeader title="90-day insights" detail={`${dateLabel(insights.dateFrom)} – ${dateLabel(insights.dateTo)}`} />{insights.currencies.map(currency => <View key={currency.currency} style={styles.sectionStack}><View style={styles.metrics}><MetricTile icon="arrow-down-circle-outline" label="Income" value={money(currency.summary.income, currency.currency)} color={colors.success} /><MetricTile icon="arrow-up-circle-outline" label="Outgoing" value={money(currency.summary.outgoing, currency.currency)} color={colors.coral} /><MetricTile icon="leaf-outline" label="Savings rate" value={currency.summary.savingsRate === null ? '—' : `${currency.summary.savingsRate.toFixed(0)}%`} color={colors.finances} /></View><SectionHeader title={`Top categories · ${currency.currency}`} />{currency.categories.slice(0, 8).map(category => <Card key={category.category} style={styles.insightCard}><View style={styles.insightHead}><Text style={[styles.cardTitle, { color: colors.text }]}>{category.category}</Text><Text style={[styles.rowAmount, { color: colors.text }]}>{money(category.amount, currency.currency)}</Text></View><View style={[styles.progressTrack, { backgroundColor: colors.backgroundRaised }]}><View style={[styles.progressFill, { width: `${Math.max(2, category.percentage)}%`, backgroundColor: colors.finances }]} /></View><Text style={[styles.cardBody, { color: colors.muted }]}>{category.percentage.toFixed(0)}% of outgoing · {category.count} transaction{category.count === 1 ? '' : 's'}</Text></Card>)}</View>)}</View>
}

function SubscriptionsView({ data, loading }: { data: MobileFinanceSubscriptionsResponse | null; loading: boolean }) {
  const { colors } = useAppTheme()
  if (loading && !data) return <LoadingState label="Checking recurring payments…" />
  if (!data?.subscriptions.length) return <EmptyState icon="repeat-outline" title="No recurring payments found" message="Likely subscriptions appear after enough bank activity is available." />
  return <View style={styles.sectionStack}><SectionHeader title="Recurring payments" detail={`${data.reminders.length} due reminder${data.reminders.length === 1 ? '' : 's'}`} />{data.subscriptions.map((item, index) => <Card key={item.id || `${item.displayName}-${index}`} style={styles.rowCard}><ListRow icon="repeat-outline" iconColor={item.dueState === 'OVERDUE' ? colors.danger : colors.notes} title={item.displayName} subtitle={`${item.cadence.toLowerCase()} · ${item.account?.displayName || 'Bank account'}`} meta={item.nextExpectedDate ? `Next expected ${dateLabel(item.nextExpectedDate)}` : `${item.occurrenceCount} observed payments`} trailing={<View style={styles.subscriptionAmount}><Text style={[styles.rowAmount, { color: colors.text }]}>{item.expectedAmount === null ? '—' : money(item.expectedAmount, item.currency)}</Text><StatusPill label={item.dueState || (item.status === 'CONFIRMED' ? 'Confirmed' : 'Detected')} tone={item.dueState === 'OVERDUE' ? 'danger' : item.dueState === 'DUE' ? 'warning' : item.status === 'CONFIRMED' ? 'success' : 'neutral'} /></View>} /></Card>)}</View>
}

function PlannerRow({ icon, color, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useAppTheme()
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.plannerRow, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.planIcon, { backgroundColor: color + '1F' }]}><Ionicons name={icon} size={21} color={color} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.cardBody, { color: colors.muted }]}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.subtle} /></Pressable>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  viewTabs: { gap: spacing.xs, paddingRight: spacing.md },
  sectionStack: { gap: spacing.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  planPrompt: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  planIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fontFamilies.bodyBold, fontSize: 15, lineHeight: 20 },
  cardBody: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  rowCard: { paddingVertical: 2 },
  rowAmount: { fontFamily: fontFamilies.bodyBold, fontSize: 14, textAlign: 'right' },
  planColumns: { gap: spacing.md },
  planColumnsTablet: { flexDirection: 'row', alignItems: 'flex-start' },
  planColumn: { flex: 1, gap: spacing.sm },
  plannerRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.medium },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goalCard: { flexGrow: 1, flexBasis: 220, minHeight: 154, borderRadius: radii.large, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  goalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontFamily: fontFamilies.displayBold, fontSize: 18, marginTop: spacing.sm },
  progressTrack: { height: 7, borderRadius: 99, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: 99 },
  insightCard: { padding: spacing.sm },
  insightHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  subscriptionAmount: { alignItems: 'flex-end', gap: spacing.xs },
  coachPreview: { gap: spacing.md },
  coachActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
  coachSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  coachIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  coachBody: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  coachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  coachCard: { flexGrow: 1, flexBasis: 260, gap: spacing.sm },
  coachObservationHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  coachSuggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.medium },
  coachSuggestionText: { flex: 1, fontFamily: fontFamilies.bodySemiBold, fontSize: 13, lineHeight: 19 },
  modal: { flex: 1 },
  form: { width: '100%', maxWidth: 700, alignSelf: 'center', gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xxl },
  choice: { gap: spacing.sm },
  choiceTitle: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13 },
  choiceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  switchRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.medium, padding: spacing.md },
  switchTitle: { fontFamily: fontFamilies.bodyBold, fontSize: 15 },
  switchHint: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  pressed: { opacity: 0.72 },
})
