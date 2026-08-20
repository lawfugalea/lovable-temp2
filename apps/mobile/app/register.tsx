import type { MobileCaptchaResponse, MobileRegisterResponse } from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError, publicRequest } from '@/api'
import { BrandLogo } from '@/BrandLogo'
import { fontFamilies, radii, shadows, spacing, useAppTheme } from '@/theme'
import { AppButton, ErrorBanner, Field } from '@/ui'

export default function RegisterScreen() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', answer: '' })
  const [captcha, setCaptcha] = useState<MobileCaptchaResponse | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const loadCaptcha = useCallback(async () => {
    try {
      setCaptcha(await publicRequest<MobileCaptchaResponse>('/api/mobile/v1/auth/captcha'))
      setForm(current => ({ ...current, answer: '' }))
    } catch {
      setError('Could not load the security check.')
    }
  }, [])
  useEffect(() => { void loadCaptcha() }, [loadCaptcha])

  const submit = async () => {
    if (!captcha || !accepted) return setError('Complete the security check and accept the Terms and Privacy Policy.')
    setBusy(true)
    setError('')
    try {
      await publicRequest<MobileRegisterResponse>('/api/mobile/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, captchaId: captcha.id, captchaAnswer: form.answer, acceptedTerms: true }),
      })
      router.replace('/login')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not create the account.')
      await loadCaptcha()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Sign in</Text></Pressable>
          <BrandLogo compact />
          <Text style={[styles.eyebrow, { color: colors.primary }]}>WELCOME TO CLANKEEP</Text>
          <Text style={[styles.title, { color: colors.text }]}>Bring your household together.</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Create an account now, then start a household or join through an invitation.</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ErrorBanner message={error} />
            <Field label="Your name" leadingIcon="person-outline" autoComplete="name" value={form.name} onChangeText={name => setForm(current => ({ ...current, name }))} />
            <Field label="Email" leadingIcon="mail-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={form.email} onChangeText={email => setForm(current => ({ ...current, email }))} />
            <View>
              <Field label="Password" leadingIcon="lock-closed-outline" secureTextEntry={!showPassword} autoComplete="new-password" hint="Use at least 8 characters and avoid common passwords." value={form.password} onChangeText={password => setForm(current => ({ ...current, password }))} />
              <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(value => !value)} style={styles.passwordToggle}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} /></Pressable>
            </View>
            <Field label={captcha?.question || 'Loading security check…'} leadingIcon="shield-checkmark-outline" keyboardType="number-pad" value={form.answer} onChangeText={answer => setForm(current => ({ ...current, answer }))} />
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted(current => !current)} style={styles.terms}>
              <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={25} color={accepted ? colors.primary : colors.muted} />
              <Text style={[styles.termsText, { color: colors.text }]}>I accept Clankeep’s Terms and Privacy Policy.</Text>
            </Pressable>
            <AppButton fullWidth label="Create account" icon="arrow-forward" busy={busy} disabled={!form.name.trim() || !form.email.trim() || form.password.length < 8 || !form.answer.trim() || !accepted} onPress={() => void submit()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xxl, gap: 10 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start' },
  backText: { fontFamily: fontFamilies.bodySemiBold },
  eyebrow: { fontFamily: fontFamilies.bodyBold, fontSize: 11, letterSpacing: 1.55, marginTop: spacing.sm },
  title: { fontFamily: fontFamilies.displayExtraBold, fontSize: 32, lineHeight: 37, letterSpacing: -0.8, marginTop: 2 },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
  card: { borderRadius: radii.xlarge, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  passwordToggle: { position: 'absolute', right: 12, top: 26, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  terms: { minHeight: 52, flexDirection: 'row', gap: 10, alignItems: 'center' },
  termsText: { flex: 1, fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 19 },
})

