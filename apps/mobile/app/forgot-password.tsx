import type { MobileForgotPasswordResponse } from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError, publicRequest } from '@/api'
import { BrandLogo } from '@/BrandLogo'
import { fontFamilies, radii, shadows, spacing, useAppTheme } from '@/theme'
import { AppButton, ErrorBanner, Field, InfoBanner } from '@/ui'

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await publicRequest<MobileForgotPasswordResponse>('/api/mobile/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      setSent(true)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not request a reset link.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Sign in</Text></Pressable>
          <View style={styles.content}>
            <BrandLogo compact />
            <Text style={[styles.eyebrow, { color: colors.primary }]}>ACCOUNT RECOVERY</Text>
            <Text style={[styles.title, { color: colors.text }]}>Reset your password.</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Enter your email. The secure reset link opens in your browser, then you can return here to sign in.</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ErrorBanner message={error} />
              {sent ? (
                <><InfoBanner tone="success" title="Check your email" message="If that address has an account, a reset link is on its way." /><AppButton fullWidth variant="secondary" label="Back to sign in" onPress={() => router.back()} /></>
              ) : (
                <><Field label="Email" leadingIcon="mail-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} /><AppButton fullWidth label="Send reset link" icon="mail-outline" busy={busy} disabled={!email.trim()} onPress={() => void submit()} /></>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: 580, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xl },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start' },
  backText: { fontFamily: fontFamilies.bodySemiBold },
  content: { flex: 1, justifyContent: 'center', gap: 12, paddingBottom: 60 },
  eyebrow: { fontFamily: fontFamilies.bodyBold, fontSize: 11, letterSpacing: 1.55, marginTop: spacing.sm },
  title: { fontFamily: fontFamilies.displayExtraBold, fontSize: 32, lineHeight: 37, letterSpacing: -0.8 },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
  card: { borderRadius: radii.xlarge, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md, ...shadows.card },
})

