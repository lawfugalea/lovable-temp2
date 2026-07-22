import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('mobile theme uses Clankeep brand colors, exact fonts, and system appearance', () => {
  const theme = readFileSync('apps/mobile/src/theme.tsx', 'utf8')
  for (const color of ['#4D6BFF', '#7B61FF', '#20C5C8', '#FF6B6B', '#EF7B06', '#29A467']) assert.match(theme, new RegExp(color))
  assert.match(theme, /BricolageGrotesque/)
  assert.match(theme, /InstrumentSans/)
  assert.match(theme, /useColorScheme/)
  assert.match(theme, /tablet: 768/)
})

test('the branded navigation exposes exactly the approved six destinations', () => {
  const tabBar = readFileSync('apps/mobile/src/navigation/ClanTabBar.tsx', 'utf8')
  assert.match(tabBar, /\['index', 'plan', 'shopping', 'finance', 'notes', 'medicine'\]/)
  for (const label of ['Home', 'Plan', 'Shop', 'Finance', 'Notes', 'Health']) assert.match(tabBar, new RegExp(`'${label}'`))
  assert.match(tabBar, /tablet \? styles\.rail : styles\.bottom/)
})

test('Expo configuration ships brand assets, adaptive layout, and dark splash', () => {
  const config = JSON.parse(readFileSync('apps/mobile/app.json', 'utf8')) as { expo: Record<string, unknown> }
  assert.equal(config.expo.userInterfaceStyle, 'automatic')
  assert.equal(config.expo.icon, './assets/icon.png')
  const android = config.expo.android as { softwareKeyboardLayoutMode: string; adaptiveIcon: { foregroundImage: string } }
  assert.equal(android.softwareKeyboardLayoutMode, 'resize')
  assert.equal(android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png')
  assert.match(JSON.stringify(config.expo.plugins), /splash-icon-dark\.png/)
  assert.match(JSON.stringify(config.expo.plugins), /expo-notifications/)
  assert.match(JSON.stringify(android), /SCHEDULE_EXACT_ALARM/)
})

test('Finance keeps planner and consented AI coaching native while bank surfaces stay enabled-account only', () => {
  const screen = readFileSync('apps/mobile/app/(app)/finance.tsx', 'utf8')
  assert.match(screen, /\/finance\/planner\/\$\{editor\.kind\}/)
  assert.match(screen, /\/finance\/planner\/coach/)
  assert.match(screen, /Review before anything is sent/)
  assert.match(screen, /const visibleViews = overview\?\.bankEnabled/)
  assert.match(screen, /title="AI privacy"/)
  assert.doesNotMatch(screen, /Bank data is read-only in the app|Bank view is not enabled yet/)
  assert.doesNotMatch(screen, /connections\/start|transactions\/.*correction|\/rules/)
})

test('the permanent Expo launcher keeps a fixed restricted development address', () => {
  const launcher = readFileSync('scripts/start-mobile-stable-dev.mjs', 'utf8')
  assert.match(launcher, /clankeep-dev\.217-160-174-130\.sslip\.io/)
  assert.match(launcher, /CLANKEEP_MOBILE_PROXY_PORT.*3012/)
  assert.match(launcher, /EXPO_PACKAGER_PROXY_URL/)
  const gateway = readFileSync('scripts/start-mobile-dev-gateway.mjs', 'utf8')
  assert.match(gateway, /blockedApiRequest/)
  assert.match(gateway, /response\.writeHead\(404/)
})
