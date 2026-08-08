import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ChoresScreen from './chores'
import MealsScreen from './meals'
import PantryView from '@/PantryView'
import { fontFamilies, spacing, useAppTheme } from '@/theme'
import { SegmentedControl } from '@/ui'

type PlanView = 'chores' | 'meals' | 'pantry'

export default function PlanScreen() {
  const { colors } = useAppTheme()
  const [view, setView] = useState<PlanView>('chores')
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={[styles.top, { backgroundColor: colors.background }]}>
        <View style={styles.topContent}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>FAMILY PLAN</Text>
          <SegmentedControl value={view} onChange={setView} options={[
            { value: 'chores', label: 'Chores', icon: 'checkmark-circle-outline' },
            { value: 'meals', label: 'Meals', icon: 'restaurant-outline' },
            { value: 'pantry', label: 'Pantry', icon: 'file-tray-full-outline' },
          ]} />
        </View>
      </SafeAreaView>
      <View style={styles.content}>{view === 'chores' ? <ChoresScreen /> : view === 'meals' ? <MealsScreen /> : <PantryView />}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  top: { width: '100%' },
  topContent: { width: '100%', maxWidth: 940, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: 7 },
  eyebrow: { fontFamily: fontFamilies.bodyBold, fontSize: 11, letterSpacing: 1.55 },
  content: { flex: 1 },
})

