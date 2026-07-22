import { Redirect, Tabs } from 'expo-router'
import { useWindowDimensions } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { useAppTheme } from '@/theme'
import { ClanTabBar } from '@/navigation/ClanTabBar'

export default function AppLayout() {
  const { status } = useAuth()
  const { colors } = useAppTheme()
  const { width } = useWindowDimensions()
  if (status === 'loading') return null
  if (status !== 'signed-in') return <Redirect href="/login" />
  return (
    <Tabs tabBar={props => <ClanTabBar {...props} />} screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: colors.background },
      tabBarPosition: width >= 768 ? 'left' : 'bottom',
      animation: 'shift',
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="shopping" options={{ title: 'Shop' }} />
      <Tabs.Screen name="finance" options={{ title: 'Finance' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="medicine" options={{ title: 'Health' }} />
      <Tabs.Screen name="chores" options={{ href: null }} />
      <Tabs.Screen name="meals" options={{ href: null }} />
      <Tabs.Screen name="household" options={{ href: null }} />
    </Tabs>
  )
}
