import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Platform, useColorScheme } from 'react-native'

export type ThemeMode = 'light' | 'dark'

const brand = {
  blue: '#4D6BFF',
  purple: '#7B61FF',
  teal: '#20C5C8',
  coral: '#FF6B6B',
  amber: '#EF7B06',
  green: '#29A467',
} as const

const light = {
  ...brand,
  primary: brand.blue,
  primaryDark: '#3450E6',
  primarySoft: '#EEF1FF',
  background: '#F8FAFC',
  backgroundRaised: '#F1F5F9',
  card: '#FFFFFF',
  cardMuted: '#F8FAFC',
  text: '#111827',
  muted: '#4B5563',
  subtle: '#94A3B8',
  border: '#E5E7EB',
  borderStrong: '#CBD5E1',
  overlay: 'rgba(15, 23, 42, 0.48)',
  danger: '#DC3545',
  dangerSoft: '#FFF0F1',
  success: '#16805B',
  successSoft: '#EAF8F2',
  warning: '#A45E08',
  warningSoft: '#FFF5E6',
  shopping: brand.teal,
  finances: brand.blue,
  medicine: brand.coral,
  meals: brand.amber,
  notes: brand.purple,
  chores: brand.green,
  tabBar: 'rgba(255, 255, 255, 0.98)',
  input: '#FFFFFF',
  skeleton: '#E9EDF4',
} as const

const dark = {
  ...brand,
  blue: '#7087FF',
  purple: '#9B87FF',
  teal: '#36D0D2',
  coral: '#FF8585',
  amber: '#F6A13A',
  green: '#54C98A',
  primary: '#7087FF',
  primaryDark: '#AAB6FF',
  primarySoft: '#202B55',
  background: '#0F172A',
  backgroundRaised: '#141F35',
  card: '#182238',
  cardMuted: '#202C43',
  text: '#F8FAFC',
  muted: '#CBD5E1',
  subtle: '#94A3B8',
  border: '#334155',
  borderStrong: '#475569',
  overlay: 'rgba(2, 6, 23, 0.72)',
  danger: '#FF8585',
  dangerSoft: '#44232D',
  success: '#54C98A',
  successSoft: '#17382D',
  warning: '#F6A13A',
  warningSoft: '#402F18',
  shopping: '#36D0D2',
  finances: '#7087FF',
  medicine: '#FF8585',
  meals: '#F6A13A',
  notes: '#9B87FF',
  chores: '#54C98A',
  tabBar: 'rgba(24, 34, 56, 0.98)',
  input: '#141F35',
  skeleton: '#27344D',
} as const

export type ThemeColors = { [K in keyof typeof light]: string }

export type AppTheme = {
  mode: ThemeMode
  dark: boolean
  colors: ThemeColors
}

const ThemeContext = createContext<AppTheme>({ mode: 'light', dark: false, colors: light })

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const value = useMemo<AppTheme>(() => {
    const mode: ThemeMode = scheme === 'dark' ? 'dark' : 'light'
    return { mode, dark: mode === 'dark', colors: (mode === 'dark' ? dark : light) as ThemeColors }
  }, [scheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  return useContext(ThemeContext)
}

// Kept for pure helpers and non-rendered configuration. Rendered components use
// useAppTheme so Android and iOS both respond to appearance changes at runtime.
export const colors = light

export const gradients = {
  primary: ['#4D6BFF', '#7B61FF'] as const,
  secondary: ['#20C5C8', '#4D6BFF'] as const,
  accent: ['#FF6B6B', '#7B61FF'] as const,
  calm: ['#EEF1FF', '#F4EEFF'] as const,
  calmDark: ['#202B55', '#302653'] as const,
} as const

export const fontFamilies = {
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemiBold: 'InstrumentSans_600SemiBold',
  bodyBold: 'InstrumentSans_700Bold',
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
} as const

export const radii = { small: 10, medium: 14, large: 20, xlarge: 28, pill: 999 } as const
export const spacing = { xxs: 4, xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 } as const
export const breakpoints = { compact: 360, tablet: 768, wide: 1024 } as const

export const shadows = {
  card: Platform.select({
    ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 22 },
    android: { elevation: 2 },
    default: {},
  }),
  floating: Platform.select({
    ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 28 },
    android: { elevation: 8 },
    default: {},
  }),
} as const

