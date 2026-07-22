import { Redirect, useRouter } from 'expo-router'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthProvider'
import { ApiError } from '@/api'
import { BrandLogo } from '@/BrandLogo'
import { fontFamilies, gradients, radii, shadows, spacing, useAppTheme } from '@/theme'
import { AppButton, ErrorBanner, Field } from '@/ui'

export default function LoginScreen() {
  const { colors, dark } = useAppTheme()
  const { status, login } = useAuth()
  const router = useRouter() as unknown as { push: (route: string) => void }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (status === 'signed-in') return <Redirect href="/(app)" />

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true)
    setError('')
    try {
      await login({
        email,
        password,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceName: `${Platform.OS} ${Platform.Version}`,
      })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not connect to Clankeep.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={dark ? gradients.calmDark : gradients.calm} style={styles.brandPanel}>
            <View style={styles.orb} />
            <BrandLogo />
            <Text style={[styles.brandLine, { color: colors.muted }]}>The private HQ for everything your household shares.</Text>
          </LinearGradient>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>WELCOME HOME</Text>
            <Text style={[styles.title, { color: colors.text }]}>Sign in to your clan</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Your plans, lists, notes, money, and health records are waiting.</Text>
            <ErrorBanner message={error} />
            <Field label="Email" leadingIcon="mail-outline" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="you@example.com" value={email} />
            <View>
              <Field label="Password" leadingIcon="lock-closed-outline" autoCapitalize="none" autoComplete="current-password" onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Your password" secureTextEntry={!showPassword} returnKeyType="go" value={password} />
              <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} accessibilityRole="button" hitSlop={8} onPress={() => setShowPassword(value => !value)} style={styles.passwordToggle}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgot}><Text style={[styles.link, { color: colors.primary }]}>Forgot password?</Text></Pressable>
            <AppButton fullWidth label="Sign in" icon="arrow-forward" busy={busy} onPress={() => void submit()} />
          </View>
          <View style={styles.createRow}>
            <Text style={[styles.createText, { color: colors.muted }]}>New to Clankeep?</Text>
            <Pressable onPress={() => router.push('/register')}><Text style={[styles.link, { color: colors.primary }]}>Create an account</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 560, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  brandPanel: { minHeight: 188, borderRadius: radii.xlarge, padding: spacing.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  orb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(123,97,255,.12)', right: -65, top: -70 },
  brandLine: { maxWidth: 350, textAlign: 'center', fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20, marginTop: -4 },
  card: { borderRadius: radii.xlarge, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: 15, ...shadows.card },
  eyebrow: { fontFamily: fontFamilies.bodyBold, fontSize: 11, letterSpacing: 1.55 },
  title: { fontFamily: fontFamilies.displayBold, fontSize: 29, lineHeight: 34, letterSpacing: -0.65 },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20, marginBottom: 2 },
  passwordToggle: { position: 'absolute', right: 12, bottom: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  forgot: { minHeight: 38, alignSelf: 'flex-end', justifyContent: 'center', marginTop: -8 },
  link: { fontFamily: fontFamilies.bodyBold, fontSize: 14 },
  createRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, paddingVertical: 4 },
  createText: { fontFamily: fontFamilies.body, fontSize: 14 },
})

