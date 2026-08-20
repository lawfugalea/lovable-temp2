import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque'
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans'
import { useFonts } from 'expo-font'
import { AuthProvider } from '@/auth/AuthProvider'
import { NotificationProvider } from '@/notifications/NotificationProvider'
import { AppThemeProvider, useAppTheme } from '@/theme'

function AppRoot() {
  const { colors, dark } = useAppTheme()
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  })
  if (!fontsLoaded) return null
  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style={dark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade_from_bottom' }} />
      </NotificationProvider>
    </AuthProvider>
  )
}

export default function RootLayout() {
  return <SafeAreaProvider><AppThemeProvider><AppRoot /></AppThemeProvider></SafeAreaProvider>
}
