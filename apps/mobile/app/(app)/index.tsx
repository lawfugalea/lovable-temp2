import type { MobileDashboardResponse, MobileOnboardingResponse } from '@clankeep/contracts'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { fontFamilies, useAppTheme } from '@/theme'
import {
  AppButton,
  BrandHero,
  Card,
  EmptyState,
  ErrorBanner,
  ListRow,
  LoadingState,
  MetricTile,
  Screen,
  SectionHeader,
  useResponsive,
} from '@/ui'

type Destination = '/(app)/shopping' | '/(app)/plan' | '/(app)/notes' | '/(app)/medicine' | '/(app)/household' | '/(app)/finance' | '/(app)/banking'

export default function HomeScreen() {
  const router = useRouter() as unknown as { push: (route: string) => void }
  const { colors } = useAppTheme()
  const { compact, tablet } = useResponsive()
  const { bootstrap, request } = useAuth()
  const [data, setData] = useState<MobileDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [onboarding, setOnboarding] = useState<MobileOnboardingResponse | null>(null)
  const [error, setError] = useState('')
  const go = (route: Destination) => router.push(route)

  const load = useCallback(async () => {
    const householdId = bootstrap?.activeHouseholdId
    if (!householdId) {
      setData(null)
      return
    }
    setData(await request<MobileDashboardResponse>(`/api/mobile/v1/dashboard?householdId=${encodeURIComponent(householdId)}`))
  }, [bootstrap?.activeHouseholdId, request])

  useEffect(() => {
    setLoading(true)
    void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load Home.')).finally(() => setLoading(false))
  }, [load])

  const loadOnboarding = useCallback(async () => {
    // Best effort: a first-run card failing must never stop Home rendering.
    try {
      setOnboarding(await request<MobileOnboardingResponse>('/api/mobile/v1/onboarding/state'))
    } catch { setOnboarding(null) }
  }, [request])

  useEffect(() => { void loadOnboarding() }, [loadOnboarding])

  const dismissChecklist = async () => {
    setOnboarding(current => (current ? { ...current, user: { ...current.user, checklistDismissedAt: new Date().toISOString() } } : current))
    try {
      await request('/api/mobile/v1/onboarding/state', { method: 'PATCH', body: JSON.stringify({ checklistDismissed: true }) })
    } catch { void loadOnboarding() }
  }

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try { await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh Home.') } finally { setRefreshing(false) }
  }

  if (loading) return <LoadingState label="Preparing your household…" />
  if (!bootstrap?.activeHouseholdId) {
    return <Screen>
      <BrandHero eyebrow="WELCOME TO CLANKEEP" title={`Hello, ${bootstrap?.user.name || 'there'}.`} subtitle="Create your household to begin planning together." />
      <EmptyState icon="home-outline" title="Your household starts here" message="Choose a household name, then invite family and create child profiles." action={<AppButton label="Set up household" icon="arrow-forward" onPress={() => go('/(app)/household')} />} />
    </Screen>
  }

  // Hidden once dismissed or once everything is done, so it does not become
  // permanent furniture for an established household.
  const steps = onboarding?.steps
  const checklistItems = steps ? [
    { label: 'Add something to a shopping list', hint: 'Start the weekly shop', complete: steps.addedShoppingItem, href: '/(app)/shopping' },
    { label: 'Create a recurring chore', hint: 'Share what needs doing', complete: steps.createdChore, href: '/(app)/plan' },
    { label: 'Plan a dinner this week', hint: 'Decide once, not nightly', complete: steps.plannedMeal, href: '/(app)/plan' },
    { label: 'Write a shared note', hint: 'Lists, reminders, anything', complete: steps.wroteNote, href: '/(app)/notes' },
    { label: 'Invite someone to your household', hint: 'Plan together', complete: steps.invitedMember, href: '/(app)/household' },
  ] as const : []
  const doneCount = checklistItems.filter(item => item.complete).length
  const checklist = steps && !onboarding?.user.checklistDismissedAt && doneCount < checklistItems.length
    ? { items: checklistItems, done: doneCount }
    : null

  const firstName = bootstrap.user.name.split(' ')[0] || bootstrap.user.name
  const tileStyle = compact ? styles.tileFull : tablet ? styles.tileTablet : styles.tilePhone

  return (
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      <BrandHero
        eyebrow="YOUR HOUSEHOLD TODAY"
        title={`Welcome home, ${firstName}.`}
        subtitle={data ? `${data.household.name} is together in one calm place.` : 'Your household at a glance.'}
        action={<AppButton compact variant="secondary" label="Manage household" icon="settings-outline" onPress={() => go('/(app)/household')} />}
      />
      <ErrorBanner message={error} />

      {checklist ? (
        <Card style={styles.householdCard}>
          <View style={styles.checklistHead}>
            <View style={styles.flexOne}>
              <Text style={[styles.checklistTitle, { color: colors.text }]}>Getting started</Text>
              <Text style={[styles.checklistMeta, { color: colors.muted }]}>{checklist.done} of {checklist.items.length} done</Text>
            </View>
            <AppButton compact variant="secondary" label="Dismiss" onPress={() => void dismissChecklist()} />
          </View>
          {checklist.items.map(item => (
            <ListRow
              key={item.label}
              icon={item.complete ? 'checkmark-circle' : 'ellipse-outline'}
              iconColor={item.complete ? colors.success : colors.muted}
              title={item.label}
              subtitle={item.complete ? 'Done' : item.hint}
              onPress={() => go(item.href)}
            />
          ))}
        </Card>
      ) : null}

      {data ? <>
        <SectionHeader title="Your household" detail="People, invitations, children, reminders and account settings." />
        <Card style={styles.householdCard}><ListRow icon="people-outline" iconColor={colors.primary} title={`Manage ${data.household.name}`} subtitle="Members, children, household details & notifications" onPress={() => go('/(app)/household')} /></Card>
      </> : null}

      <SectionHeader title="At a glance" detail="Tap any card to open it." />
      {data ? <View style={styles.grid}>
        <MetricTile style={tileStyle} icon="cart-outline" label="Shopping" value={`${data.shopping.activeItems} items`} detail={`${data.shopping.lists} active lists`} color={colors.shopping} onPress={() => go('/(app)/shopping')} />
        <MetricTile style={tileStyle} icon="checkmark-circle-outline" label="Chores today" value={`${data.chores.completedToday}/${data.chores.dueToday}`} detail="completed today" color={colors.chores} onPress={() => go('/(app)/plan')} />
        <MetricTile style={tileStyle} icon="restaurant-outline" label="Tonight" value={data.meals.tonight || 'Not planned'} detail="dinner plan" color={colors.meals} onPress={() => go('/(app)/plan')} />
        <MetricTile style={tileStyle} icon="heart-outline" label="Health" value={`${data.medicine.activeCourses} active`} detail={`${data.medicine.dosesLastSevenDays} doses this week`} color={colors.medicine} onPress={() => go('/(app)/medicine')} />
        <MetricTile style={tileStyle} icon="wallet-outline" label="Finance" value="Money plan" detail="income, commitments, and goals" color={colors.finances} onPress={() => go('/(app)/finance')} />
        <MetricTile style={tileStyle} icon="business-outline" label="Banking" value="Connected accounts" detail="balances, activity, and insights" color={colors.finances} onPress={() => go('/(app)/banking')} />
        <MetricTile style={tileStyle} icon="document-text-outline" label="Notes" value="Family notes" detail="ideas and shared references" color={colors.notes} onPress={() => go('/(app)/notes')} />
      </View> : null}

      <SectionHeader title="Quick actions" detail="The things families do most." />
      <View style={styles.actions}>
        <Card style={styles.actionCard}><ListRow icon="add" iconColor={colors.shopping} title="Add a shopping item" subtitle="Open your active list" onPress={() => go('/(app)/shopping')} /></Card>
        <Card style={styles.actionCard}><ListRow icon="thermometer-outline" iconColor={colors.medicine} title="Record health" subtitle="Temperature, weight, medicine, or dose" onPress={() => go('/(app)/medicine')} /></Card>
        <Card style={styles.actionCard}><ListRow icon="document-text-outline" iconColor={colors.notes} title="Write a note" subtitle="Capture something for your household" onPress={() => go('/(app)/notes')} /></Card>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tilePhone: { flexBasis: '47%' },
  tileTablet: { flexBasis: '30%' },
  tileFull: { flexBasis: '100%' },
  actions: { gap: 10 },
  actionCard: { paddingHorizontal: 14, paddingVertical: 2 },
  householdCard: { paddingHorizontal: 14, paddingVertical: 4 },
  flexOne: { flex: 1 },
  checklistHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 4 },
  checklistTitle: { fontFamily: fontFamilies.displayBold, fontSize: 17 },
  checklistMeta: { fontFamily: fontFamilies.body, fontSize: 13, marginTop: 2 },
})
