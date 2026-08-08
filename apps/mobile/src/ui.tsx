import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps, ReactNode } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { breakpoints, fontFamilies, gradients, radii, shadows, spacing, useAppTheme } from '@/theme'

export type IconName = ComponentProps<typeof Ionicons>['name']

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions()
  return {
    width,
    height,
    fontScale,
    compact: width < breakpoints.compact || fontScale > 1.3,
    tablet: width >= breakpoints.tablet,
    wide: width >= breakpoints.wide,
  }
}

export function Screen({ children, refreshing = false, onRefresh, testID, contentStyle, safeTop = true }: {
  children: ReactNode
  refreshing?: boolean
  onRefresh?: () => void
  testID?: string
  contentStyle?: StyleProp<ViewStyle>
  safeTop?: boolean
}) {
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  const responsive = useResponsive()
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        testID={testID}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.screen,
          { paddingTop: (safeTop ? insets.top : 0) + spacing.sm, paddingBottom: insets.bottom + (responsive.tablet ? 36 : 98) },
          responsive.tablet && styles.screenTablet,
          responsive.wide && styles.screenWide,
          contentStyle,
        ]}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  )
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  const { colors } = useAppTheme()
  const { tablet } = useResponsive()
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, tablet && styles.titleTablet, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  )
}

export function BrandHero({ eyebrow, title, subtitle, action, compact = false }: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
  compact?: boolean
}) {
  const { dark } = useAppTheme()
  return (
    <LinearGradient colors={dark ? gradients.calmDark : gradients.calm} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, compact && styles.heroCompact]}>
      <View pointerEvents="none" style={styles.heroOrbOne} />
      <View pointerEvents="none" style={styles.heroOrbTwo} />
      <View style={styles.heroBody}>
        {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
        <Text style={[styles.heroTitle, dark && styles.heroTitleDark, compact && styles.heroTitleCompact]}>{title}</Text>
        {subtitle ? <Text style={[styles.heroSubtitle, dark && styles.heroSubtitleDark]}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.heroAction}>{action}</View> : null}
    </LinearGradient>
  )
}

export function SectionHeader({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  const { colors } = useAppTheme()
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {detail ? <Text style={[styles.sectionDetail, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      {action}
    </View>
  )
}

export function Card({ children, tone = 'default', style }: {
  children: ReactNode
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  style?: StyleProp<ViewStyle>
}) {
  const { colors, dark } = useAppTheme()
  const toneStyles = {
    default: { backgroundColor: colors.card, borderColor: colors.border },
    primary: { backgroundColor: colors.primarySoft, borderColor: dark ? colors.borderStrong : '#D9DDFF' },
    success: { backgroundColor: colors.successSoft, borderColor: dark ? colors.borderStrong : '#CBEBDD' },
    warning: { backgroundColor: colors.warningSoft, borderColor: dark ? colors.borderStrong : '#F2DDB9' },
    danger: { backgroundColor: colors.dangerSoft, borderColor: dark ? colors.borderStrong : '#F3CCD5' },
  }
  return <View style={[styles.card, toneStyles[tone], style]}>{children}</View>
}

export function AppButton({ label, onPress, icon, variant = 'primary', disabled = false, busy = false, compact = false, fullWidth = false, style }: {
  label: string
  onPress: () => void
  icon?: IconName
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  busy?: boolean
  compact?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useAppTheme()
  const variantStyle = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
    danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  }[variant]
  const foreground = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.muted : colors.primaryDark
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        compact && styles.buttonCompact,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        (disabled || busy) && styles.disabled,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={foreground} /> : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 17 : 19} color={foreground} /> : null}
          <Text numberOfLines={2} style={[styles.buttonText, compact && styles.buttonTextCompact, { color: foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

export function IconButton({ icon, label, onPress, danger = false, disabled = false, filled = false }: {
  icon: IconName
  label: string
  onPress: () => void
  danger?: boolean
  disabled?: boolean
  filled?: boolean
}) {
  const { colors } = useAppTheme()
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: filled ? colors.primary : colors.card, borderColor: filled ? colors.primary : colors.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={21} color={filled ? '#FFFFFF' : danger ? colors.danger : colors.primary} />
    </Pressable>
  )
}

export function Field({ label, hint, error, leadingIcon, ...props }: TextInputProps & { label: string; hint?: string; error?: string; leadingIcon?: IconName }) {
  const { colors } = useAppTheme()
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: error ? colors.danger : colors.border }, props.multiline && styles.multilineWrap]}>
        {leadingIcon ? <Ionicons name={leadingIcon} size={20} color={colors.subtle} /> : null}
        <TextInput placeholderTextColor={colors.subtle} selectionColor={colors.primary} style={[styles.input, { color: colors.text }, props.multiline && styles.multiline, props.style]} {...props} />
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.fieldHint, { color: colors.danger }]}>{error}</Text> : hint ? <Text style={[styles.fieldHint, { color: colors.muted }]}>{hint}</Text> : null}
    </View>
  )
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const { colors } = useAppTheme()
  if (!message) return null
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: colors.dangerSoft }]}>
      <Ionicons name="alert-circle-outline" size={21} color={colors.danger} />
      <Text style={[styles.bannerBody, { color: colors.danger }]}>{message}</Text>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          hitSlop={12}
          onPress={onDismiss}
        >
          <Ionicons name="close-outline" size={21} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  )
}

export function InfoBanner({ title, message, tone = 'primary' }: { title: string; message: string; tone?: 'primary' | 'warning' | 'success' }) {
  const { colors } = useAppTheme()
  const background = tone === 'warning' ? colors.warningSoft : tone === 'success' ? colors.successSoft : colors.primarySoft
  const foreground = tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.primaryDark
  return (
    <View style={[styles.banner, { backgroundColor: background }]}>
      <Ionicons name={tone === 'warning' ? 'shield-checkmark-outline' : tone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline'} size={21} color={foreground} />
      <View style={styles.flex}>
        <Text style={[styles.bannerTitle, { color: foreground }]}>{title}</Text>
        <Text style={[styles.bannerText, { color: colors.text }]}>{message}</Text>
      </View>
    </View>
  )
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: ReactNode }) {
  const { colors } = useAppTheme()
  return (
    <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LinearGradient colors={[colors.primary + '24', colors.purple + '18']} style={styles.emptyIcon}>
        <Ionicons name={icon} size={27} color={colors.primary} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.muted }]}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  )
}

export function SegmentedControl<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string; icon?: IconName }[]
  onChange: (value: T) => void
}) {
  const { colors } = useAppTheme()
  return (
    <View style={[styles.segmented, { backgroundColor: colors.backgroundRaised }]}>
      {options.map(option => {
        const selected = value === option.value
        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, selected && { backgroundColor: colors.card, borderColor: colors.border }]}>
            {option.icon ? <Ionicons name={option.icon} size={17} color={selected ? colors.primary : colors.muted} /> : null}
            <Text numberOfLines={1} style={[styles.segmentText, { color: selected ? colors.text : colors.muted }]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Chip({ label, selected = false, onPress, icon, tone }: {
  label: string
  selected?: boolean
  onPress?: () => void
  icon?: IconName
  tone?: string
}) {
  const { colors } = useAppTheme()
  const foreground = selected ? '#FFFFFF' : tone || colors.text
  const backgroundColor = selected ? tone || colors.primary : colors.card
  const body = (
    <>
      {icon ? <Ionicons name={icon} size={15} color={foreground} /> : null}
      <Text numberOfLines={1} style={[styles.chipText, { color: foreground }]}>{label}</Text>
    </>
  )
  if (!onPress) return <View style={[styles.chip, { backgroundColor, borderColor: selected ? backgroundColor : colors.border }]}>{body}</View>
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, { backgroundColor, borderColor: selected ? backgroundColor : colors.border }, pressed && styles.pressed]}>{body}</Pressable>
}

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }) {
  const { colors } = useAppTheme()
  const map = {
    neutral: { backgroundColor: colors.backgroundRaised, color: colors.muted },
    primary: { backgroundColor: colors.primarySoft, color: colors.primaryDark },
    success: { backgroundColor: colors.successSoft, color: colors.success },
    warning: { backgroundColor: colors.warningSoft, color: colors.warning },
    danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  }
  return <View style={[styles.status, { backgroundColor: map[tone].backgroundColor }]}><Text style={[styles.statusText, { color: map[tone].color }]}>{label}</Text></View>
}

export function MetricTile({ icon, label, value, detail, color, onPress, style }: {
  icon: IconName
  label: string
  value: string
  detail?: string
  color: string
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useAppTheme()
  const body = (
    <>
      <View style={[styles.metricIcon, { backgroundColor: color + '1F' }]}><Ionicons name={icon} size={21} color={color} /></View>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      {detail ? <Text numberOfLines={2} style={[styles.metricDetail, { color: colors.muted }]}>{detail}</Text> : null}
    </>
  )
  const cardStyle = [styles.metric, { backgroundColor: colors.card, borderColor: colors.border }, style]
  if (!onPress) return <View style={cardStyle}>{body}</View>
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>{body}</Pressable>
}

export function ListRow({ icon, iconColor, title, subtitle, meta, onPress, trailing }: {
  icon?: IconName
  iconColor?: string
  title: string
  subtitle?: string
  meta?: string
  onPress?: () => void
  trailing?: ReactNode
}) {
  const { colors } = useAppTheme()
  const content = (
    <>
      {icon ? <View style={[styles.rowIcon, { backgroundColor: (iconColor || colors.primary) + '1D' }]}><Ionicons name={icon} size={20} color={iconColor || colors.primary} /></View> : null}
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
        {meta ? <Text style={[styles.rowMeta, { color: colors.subtle }]}>{meta}</Text> : null}
      </View>
      {trailing || (onPress ? <Ionicons name="chevron-forward" size={19} color={colors.subtle} /> : null)}
    </>
  )
  if (!onPress) return <View style={styles.listRow}>{content}</View>
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}>{content}</Pressable>
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.loading, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.loadingMark, { backgroundColor: colors.primarySoft }]}><ActivityIndicator size="large" color={colors.primary} /></View>
      <Text style={[styles.loadingText, { color: colors.muted }]}>{label}</Text>
    </View>
  )
}

export function Skeleton({ height = 18, width = '100%', radius = 10 }: { height?: number; width?: ViewStyle['width']; radius?: number }) {
  const { colors } = useAppTheme()
  return <View accessibilityElementsHidden style={{ height, width, borderRadius: radius, backgroundColor: colors.skeleton }} />
}

export function SheetHeader({ title, subtitle, onClose, action }: { title: string; subtitle?: string; onClose: () => void; action?: ReactNode }) {
  const { colors } = useAppTheme()
  return (
    <View style={[styles.sheetHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <IconButton icon="close" label="Close" onPress={onClose} />
      <View style={styles.sheetHeading}>
        <Text numberOfLines={1} style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={[styles.sheetSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.sheetAction}>{action || <View style={styles.sheetSpacer} />}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },
  screen: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  screenTablet: { maxWidth: 940, paddingHorizontal: spacing.xl, gap: spacing.lg },
  screenWide: { maxWidth: 1160 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1 },
  headerAction: { paddingTop: 3 },
  eyebrow: { fontFamily: fontFamilies.bodyBold, fontSize: 11, letterSpacing: 1.65, textTransform: 'uppercase' },
  title: { fontFamily: fontFamilies.displayBold, fontSize: 30, lineHeight: 35, letterSpacing: -0.7, marginTop: 5 },
  titleTablet: { fontSize: 38, lineHeight: 43 },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 21, marginTop: 6 },
  hero: { minHeight: 192, borderRadius: radii.xlarge, padding: spacing.lg, overflow: 'hidden', justifyContent: 'space-between' },
  heroCompact: { minHeight: 160 },
  heroOrbOne: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(77,107,255,.14)', right: -50, top: -55 },
  heroOrbTwo: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(123,97,255,.12)', right: 45, bottom: -75 },
  heroBody: { maxWidth: 620 },
  heroEyebrow: { color: '#4D6BFF', fontFamily: fontFamilies.bodyBold, fontSize: 11, letterSpacing: 1.55, textTransform: 'uppercase' },
  heroTitle: { color: '#111827', fontFamily: fontFamilies.displayExtraBold, fontSize: 31, lineHeight: 36, letterSpacing: -0.8, marginTop: 7 },
  heroTitleDark: { color: '#F8FAFC' },
  heroTitleCompact: { fontSize: 27, lineHeight: 32 },
  heroSubtitle: { color: '#4B5563', fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 520 },
  heroSubtitleDark: { color: '#CBD5E1' },
  heroAction: { marginTop: spacing.md, alignSelf: 'flex-start' },
  sectionHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  sectionTitle: { fontFamily: fontFamilies.displayBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.25 },
  sectionDetail: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  card: { borderRadius: radii.large, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, ...shadows.card },
  button: { minHeight: Platform.OS === 'ios' ? 48 : 50, maxWidth: '100%', borderRadius: radii.pill, paddingHorizontal: 19, paddingVertical: 9, borderWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  buttonCompact: { minHeight: Platform.OS === 'ios' ? 42 : 48, paddingHorizontal: 14, paddingVertical: 7 },
  buttonText: { flexShrink: 1, textAlign: 'center', fontFamily: fontFamilies.bodyBold, fontSize: 15, lineHeight: 19 },
  buttonTextCompact: { fontSize: 13, lineHeight: 16 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  rowPressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  iconButton: { width: Platform.OS === 'ios' ? 44 : 48, height: Platform.OS === 'ios' ? 44 : 48, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 7 },
  fieldLabel: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13, lineHeight: 17 },
  fieldHint: { fontFamily: fontFamilies.body, fontSize: 11, lineHeight: 16 },
  inputWrap: { minHeight: 52, borderRadius: radii.medium, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  multilineWrap: { minHeight: 112, alignItems: 'flex-start', paddingTop: 1 },
  input: { flex: 1, minHeight: 50, paddingVertical: 12, fontFamily: fontFamilies.body, fontSize: 16 },
  multiline: { minHeight: 108, paddingTop: 13, textAlignVertical: 'top' },
  banner: { borderRadius: radii.medium, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bannerBody: { flex: 1, fontFamily: fontFamilies.bodyMedium, fontSize: 13, lineHeight: 19 },
  bannerTitle: { fontFamily: fontFamilies.bodyBold, fontSize: 13, lineHeight: 17 },
  bannerText: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 18, marginTop: 3 },
  empty: { alignItems: 'center', borderWidth: 1, borderRadius: radii.xlarge, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fontFamilies.displayBold, fontSize: 19, lineHeight: 24, marginTop: 14, textAlign: 'center' },
  emptyText: { fontFamily: fontFamilies.body, textAlign: 'center', lineHeight: 20, marginTop: 6, maxWidth: 420 },
  emptyAction: { marginTop: spacing.md, maxWidth: '100%' },
  segmented: { flexDirection: 'row', borderRadius: radii.medium, padding: 4, gap: 3 },
  segment: { flex: 1, minHeight: Platform.OS === 'ios' ? 40 : 48, borderRadius: 11, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentText: { flexShrink: 1, fontFamily: fontFamilies.bodySemiBold, fontSize: 13 },
  chip: { minHeight: Platform.OS === 'ios' ? 38 : 48, maxWidth: '100%', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chipText: { flexShrink: 1, fontFamily: fontFamilies.bodySemiBold, fontSize: 13 },
  status: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 11, lineHeight: 14 },
  metric: { flexGrow: 1, flexBasis: 150, minHeight: 152, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.large, padding: 14, ...shadows.card },
  metricIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontFamily: fontFamilies.bodySemiBold, fontSize: 11, lineHeight: 15, marginTop: 11 },
  metricValue: { fontFamily: fontFamilies.displayBold, fontSize: 22, lineHeight: 26, letterSpacing: -0.35, marginTop: 3 },
  metricDetail: { fontFamily: fontFamilies.body, fontSize: 11, lineHeight: 15, marginTop: 3 },
  listRow: { minHeight: Platform.OS === 'ios' ? 58 : 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fontFamilies.bodySemiBold, fontSize: 15, lineHeight: 20 },
  rowSubtitle: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  rowMeta: { fontFamily: fontFamilies.body, fontSize: 11, lineHeight: 15, marginTop: 2 },
  loading: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: 13 },
  loadingMark: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14 },
  sheetHeader: { minHeight: Platform.OS === 'ios' ? 64 : 68, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetHeading: { flex: 1 },
  sheetTitle: { textAlign: 'center', fontFamily: fontFamilies.displayBold, fontSize: 18 },
  sheetSubtitle: { textAlign: 'center', fontFamily: fontFamilies.body, fontSize: 12, marginTop: 2 },
  sheetAction: { minWidth: 48, alignItems: 'flex-end' },
  sheetSpacer: { width: 44, height: 44 },
})
