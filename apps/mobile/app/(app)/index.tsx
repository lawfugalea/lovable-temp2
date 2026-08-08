import type { MobileDashboardResponse } from '@clankeep/contracts'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { useAppTheme } from '@/theme'
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
})
