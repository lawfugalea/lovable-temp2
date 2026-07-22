import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('mobile reminders are local, opt-in, and limited to verified scheduled medicines', () => {
  const provider = readFileSync('apps/mobile/src/notifications/NotificationProvider.tsx', 'utf8')
  assert.match(provider, /expo-notifications/)
  assert.match(provider, /enabled: false/)
  assert.match(provider, /requestPermissionsAsync/)
  assert.match(provider, /item\.isPrn \|\| !item\.scheduleVerified/)
  assert.match(provider, /nextDoseAt/)
  assert.match(provider, /cancelAllScheduledNotificationsAsync/)
  assert.match(provider, /status !== 'signed-in'/)
  assert.match(provider, /title: 'Clankeep test reminder'/)
  assert.match(provider, /route: '\/\(app\)\/medicine'/)
  assert.match(provider, /addNotificationResponseReceivedListener/)
})

test('notification controls cover dated household areas and remain visible in Family & Account', () => {
  const provider = readFileSync('apps/mobile/src/notifications/NotificationProvider.tsx', 'utf8')
  for (const path of ['/medicine/overview', '/chores/today', '/meals/week', '/finance/subscriptions']) assert.match(provider, new RegExp(path))
  const family = readFileSync('apps/mobile/app/(app)/household.tsx', 'utf8')
  for (const label of ['Medicine doses', 'Due chores', 'Planned meals', 'Recurring payments']) assert.match(family, new RegExp(label))
  assert.match(family, /phone reminders can be delayed|Phone reminders can be delayed/)
  assert.match(family, /Send test notification/)
})
