import type { MobileFinanceSubscriptionsResponse, MobileMealWeekResponse, MobileMedicineOverviewResponse, MobileTodayChoresResponse } from '@clankeep/contracts'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AppState, Platform } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'

const SETTINGS_KEY = 'clankeep.mobile.notification-settings.v1'
const CHANNEL_ID = 'clankeep-reminders'
const MAX_SCHEDULED = 60

export type NotificationCategory = 'medicine' | 'chores' | 'meals' | 'finance'
export type NotificationPreferences = { enabled: boolean } & Record<NotificationCategory, boolean>
type PermissionState = 'undetermined' | 'granted' | 'denied'
type Reminder = { id: string; title: string; body: string; date: Date; route: string }

type NotificationContextValue = {
  preferences: NotificationPreferences
  permission: PermissionState
  ready: boolean
  syncing: boolean
  scheduledCount: number
  error: string
  testing: boolean
  setEnabled: (enabled: boolean) => Promise<boolean>
  setCategory: (category: NotificationCategory, enabled: boolean) => Promise<void>
  sync: () => Promise<void>
  sendTest: () => Promise<boolean>
}

const defaults: NotificationPreferences = { enabled: false, medicine: true, chores: true, meals: true, finance: true }
const NotificationContext = createContext<NotificationContextValue | null>(null)

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
})

function dateOnly(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(value: string, amount: number) {
  const parts = value.split('-')
  const year = Number(parts[0]); const month = Number(parts[1]); const day = Number(parts[2])
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + amount)
  return dateOnly(date)
}

function localTime(value: string, hour: number, minute = 0) {
  const parts = value.slice(0, 10).split('-')
  const year = Number(parts[0]); const month = Number(parts[1]); const day = Number(parts[2])
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

function readableAmount(value: string | number | null, currency: string) {
  if (value === null) return ''
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function reminderPlan(input: {
  medicine?: MobileMedicineOverviewResponse
  chores?: MobileTodayChoresResponse[]
  meals?: MobileMealWeekResponse
  finance?: MobileFinanceSubscriptionsResponse
}, now = new Date()): Reminder[] {
  const reminders: Reminder[] = []
  for (const item of input.medicine?.medicines || []) {
    if (!item.nextDoseAt || item.isPrn || !item.scheduleVerified || item.dailyLimitReached) continue
    reminders.push({ id: `medicine-${item.id}-${item.nextDoseAt}`, title: `Medicine reminder for ${item.childName}`, body: `Check ${item.name} · ${item.dosage} in Clankeep before recording the dose.`, date: new Date(item.nextDoseAt), route: '/(app)/medicine' })
  }
  for (const day of input.chores || []) {
    const pending = day.items.filter(item => item.status === 'PENDING')
    if (!pending.length) continue
    const body = pending.length === 1 ? pending[0]!.title : `${pending[0]!.title} and ${pending.length - 1} more`
    reminders.push({ id: `chores-${day.date}`, title: `${pending.length} chore${pending.length === 1 ? '' : 's'} due`, body, date: localTime(day.date, 9), route: '/(app)/plan' })
  }
  for (const entry of input.meals?.entries || []) {
    const meal = entry.recipe?.name || entry.freeText
    if (!meal) continue
    reminders.push({ id: `meal-${entry.date}`, title: "Tonight's meal plan", body: meal, date: localTime(entry.date, 16, 30), route: '/(app)/plan' })
  }
  for (const item of input.finance?.subscriptions || []) {
    if (!item.nextExpectedDate) continue
    const date = localTime(item.nextExpectedDate, 9)
    date.setDate(date.getDate() - Math.max(0, item.reminderDays))
    const amount = readableAmount(item.expectedAmount, item.currency)
    reminders.push({ id: `finance-${item.id || item.displayName}-${item.nextExpectedDate}`, title: 'Upcoming recurring payment', body: `${item.displayName}${amount ? ` · ${amount}` : ''}`, date, route: '/(app)/banking' })
  }
  const earliest = now.getTime() + 30_000
  const latest = now.getTime() + 180 * 86_400_000
  return reminders.filter(item => Number.isFinite(item.date.getTime()) && item.date.getTime() >= earliest && item.date.getTime() <= latest).sort((left, right) => left.date.getTime() - right.date.getTime()).slice(0, MAX_SCHEDULED)
}

function parsedPreferences(value: string | null): NotificationPreferences {
  if (!value) return defaults
  try {
    const parsed = JSON.parse(value) as Partial<NotificationPreferences>
    return { enabled: parsed.enabled === true, medicine: parsed.medicine !== false, chores: parsed.chores !== false, meals: parsed.meals !== false, finance: parsed.finance !== false }
  } catch { return defaults }
}

async function prepareAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Clankeep reminders', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 180, 250], lightColor: '#4D6BFF' })
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter() as unknown as { push: (route: string) => void }
  const { status, bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaults)
  const [permission, setPermission] = useState<PermissionState>('undetermined')
  const [ready, setReady] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [scheduledCount, setScheduledCount] = useState(0)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([SecureStore.getItemAsync(SETTINGS_KEY), Notifications.getPermissionsAsync()]).then(([stored, current]) => {
      if (!active) return
      setPreferences(parsedPreferences(stored))
      setPermission(current.granted ? 'granted' : current.canAskAgain ? 'undetermined' : 'denied')
      setReady(true)
    }).catch(() => { if (active) { setError('Could not read notification settings.'); setReady(true) } })
    return () => { active = false }
  }, [])

  const persist = useCallback(async (next: NotificationPreferences) => {
    setPreferences(next)
    await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(next))
  }, [])

  const syncWith = useCallback(async (next: NotificationPreferences) => {
    if (!next.enabled || permission !== 'granted' || status !== 'signed-in' || !householdId) return
    setSyncing(true); setError('')
    try {
      await prepareAndroidChannel()
      const today = dateOnly()
      const tasks: Promise<unknown>[] = []
      const keys: NotificationCategory[] = []
      if (next.medicine) { keys.push('medicine'); tasks.push(request<MobileMedicineOverviewResponse>(`/api/mobile/v1/medicine/overview?householdId=${encodeURIComponent(householdId)}`)) }
      if (next.chores) { keys.push('chores'); tasks.push(Promise.all(Array.from({ length: 7 }, (_, offset) => { const date = addDays(today, offset); return request<MobileTodayChoresResponse>(`/api/mobile/v1/chores/today?householdId=${encodeURIComponent(householdId)}&date=${date}`) }))) }
      if (next.meals) { keys.push('meals'); tasks.push(request<MobileMealWeekResponse>(`/api/mobile/v1/meals/week?householdId=${encodeURIComponent(householdId)}&from=${today}&to=${addDays(today, 6)}`)) }
      if (next.finance) { keys.push('finance'); tasks.push(request<MobileFinanceSubscriptionsResponse>(`/api/mobile/v1/finance/subscriptions?householdId=${encodeURIComponent(householdId)}`)) }
      const settled = await Promise.allSettled(tasks)
      const data: Parameters<typeof reminderPlan>[0] = {}
      let successful = 0
      settled.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        successful += 1
        if (keys[index] === 'medicine') data.medicine = result.value as MobileMedicineOverviewResponse
        if (keys[index] === 'chores') data.chores = result.value as MobileTodayChoresResponse[]
        if (keys[index] === 'meals') data.meals = result.value as MobileMealWeekResponse
        if (keys[index] === 'finance') data.finance = result.value as MobileFinanceSubscriptionsResponse
      })
      if (tasks.length && !successful) throw new Error('Reminder data is temporarily unavailable')
      const reminders = reminderPlan(data)
      await Notifications.cancelAllScheduledNotificationsAsync()
      for (const reminder of reminders) {
        await Notifications.scheduleNotificationAsync({
          identifier: `clankeep-${reminder.id}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120),
          content: { title: reminder.title, body: reminder.body, sound: true, data: { route: reminder.route, source: 'clankeep-reminder' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL_ID },
        })
      }
      setScheduledCount(reminders.length)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh reminders.') } finally { setSyncing(false) }
  }, [householdId, permission, request, status])

  const sync = useCallback(() => syncWith(preferences), [preferences, syncWith])

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      const next = { ...preferences, enabled: false }
      await persist(next)
      await Notifications.cancelAllScheduledNotificationsAsync()
      setScheduledCount(0); setError('')
      return true
    }
    const current = await Notifications.getPermissionsAsync()
    const result = current.granted ? current : current.canAskAgain ? await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } }) : current
    const granted = result.granted
    setPermission(granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied')
    if (!granted) { setError('Notifications are disabled in your phone settings.'); return false }
    const next = { ...preferences, enabled: true }
    await persist(next)
    await syncWith(next)
    return true
  }, [persist, preferences, syncWith])

  const setCategory = useCallback(async (category: NotificationCategory, enabled: boolean) => {
    const next = { ...preferences, [category]: enabled }
    await persist(next)
    if (next.enabled) await syncWith(next)
  }, [persist, preferences, syncWith])

  const sendTest = useCallback(async () => {
    if (permission !== 'granted') { setError('Allow notifications on this phone before sending a test.'); return false }
    setTesting(true); setError('')
    try {
      await prepareAndroidChannel()
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Clankeep test reminder', body: 'Notifications are working. Tap to open Health.', sound: true, data: { route: '/(app)/medicine', source: 'clankeep-test' } },
        trigger: null,
      })
      return true
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send the test notification.'); return false } finally { setTesting(false) }
  }, [permission])

  useEffect(() => {
    if (!ready) return
    if (status !== 'signed-in') {
      void Notifications.cancelAllScheduledNotificationsAsync().then(() => setScheduledCount(0))
      return
    }
    if (preferences.enabled && permission === 'granted' && householdId) void syncWith(preferences)
  }, [householdId, permission, preferences, ready, status, syncWith])

  useEffect(() => {
    const appState = AppState.addEventListener('change', next => { if (next === 'active' && preferences.enabled) void syncWith(preferences) })
    const response = Notifications.addNotificationResponseReceivedListener(event => {
      const route = event.notification.request.content.data?.route
      if (typeof route === 'string' && /^\/\(app\)\/(medicine|plan|finance)$/.test(route)) router.push(route)
    })
    return () => { appState.remove(); response.remove() }
  }, [preferences, router, syncWith])

  const value = useMemo<NotificationContextValue>(() => ({ preferences, permission, ready, syncing, scheduledCount, error, testing, setEnabled, setCategory, sync, sendTest }), [error, permission, preferences, ready, scheduledCount, sendTest, setCategory, setEnabled, sync, syncing, testing])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const value = useContext(NotificationContext)
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider')
  return value
}
