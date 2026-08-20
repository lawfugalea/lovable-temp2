import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { useAppTheme } from '@/theme'

export default function Index() {
  const { colors } = useAppTheme()
  const { status } = useAuth()
  if (status === 'loading') {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>
  }
  return <Redirect href={status === 'signed-in' ? '/(app)' : '/login'} />
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
