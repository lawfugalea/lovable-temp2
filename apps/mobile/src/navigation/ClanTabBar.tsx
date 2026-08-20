import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { fontFamilies, shadows, useAppTheme } from '@/theme'
import { useResponsive, type IconName } from '@/ui'

const visibleRoutes = ['index', 'plan', 'shopping', 'finance', 'banking', 'notes', 'medicine'] as const
const labels: Record<(typeof visibleRoutes)[number], string> = {
  index: 'Home',
  plan: 'Plan',
  shopping: 'Shop',
  finance: 'Finance',
  banking: 'Bank',
  notes: 'Notes',
  medicine: 'Health',
}
const icons: Record<(typeof visibleRoutes)[number], { active: IconName; idle: IconName }> = {
  index: { active: 'home', idle: 'home-outline' },
  plan: { active: 'calendar', idle: 'calendar-outline' },
  shopping: { active: 'cart', idle: 'cart-outline' },
  finance: { active: 'wallet', idle: 'wallet-outline' },
  banking: { active: 'business', idle: 'business-outline' },
  notes: { active: 'document-text', idle: 'document-text-outline' },
  medicine: { active: 'heart', idle: 'heart-outline' },
}

export function ClanTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { colors } = useAppTheme()
  const { tablet, compact } = useResponsive()
  const routes = state.routes.filter((route): route is typeof route & { name: (typeof visibleRoutes)[number] } => visibleRoutes.includes(route.name as (typeof visibleRoutes)[number]))
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        tablet ? styles.rail : styles.bottom,
        {
          backgroundColor: colors.tabBar,
          borderColor: colors.border,
          paddingBottom: tablet ? Math.max(insets.bottom, 12) : Math.max(insets.bottom, 7),
          paddingTop: tablet ? Math.max(insets.top, 16) : 7,
        },
      ]}
    >
      {tablet ? <View style={[styles.railMark, { backgroundColor: colors.primary }]}><Text style={styles.railMarkText}>ck</Text></View> : null}
      <View style={[styles.items, tablet && styles.railItems]}>
        {routes.map(route => {
          const routeIndex = state.routes.findIndex(item => item.key === route.key)
          const focused = state.index === routeIndex
          const color = focused ? colors.primary : colors.subtle
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params)
          }
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={labels[route.name]}
              accessibilityState={{ selected: focused }}
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [
                styles.item,
                compact && styles.itemCompact,
                tablet && styles.railItem,
                focused && { backgroundColor: colors.primarySoft },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={focused ? icons[route.name].active : icons[route.name].idle} size={tablet ? 23 : compact ? 20 : 22} color={color} />
              <Text maxFontSizeMultiplier={1.35} numberOfLines={1} style={[styles.label, compact && styles.labelCompact, tablet && styles.railLabel, { color }]}>{labels[route.name]}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  bottom: { minHeight: 70, ...shadows.floating },
  rail: { width: 104, borderTopWidth: 0, borderRightWidth: StyleSheet.hairlineWidth, alignItems: 'center', paddingHorizontal: 9 },
  items: { flex: 1, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around' },
  railItems: { width: '100%', flexDirection: 'column', justifyContent: 'flex-start', gap: 5, marginTop: 26 },
  item: { flex: 1, minWidth: 48, minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3, marginHorizontal: 1 },
  itemCompact: { minWidth: 40, borderRadius: 12, gap: 2, marginHorizontal: 0 },
  railItem: { width: '100%', flex: 0, minHeight: 66, marginHorizontal: 0 },
  label: { fontFamily: fontFamilies.bodySemiBold, fontSize: 10, lineHeight: 13 },
  labelCompact: { fontSize: 9 },
  railLabel: { fontSize: 11 },
  pressed: { opacity: 0.66 },
  railMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  railMarkText: { color: '#FFFFFF', fontFamily: fontFamilies.displayExtraBold, fontSize: 19, letterSpacing: -1 },
})
