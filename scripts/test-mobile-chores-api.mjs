import { createHash, randomBytes } from 'node:crypto'
import process from 'node:process'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { encode } from 'next-auth/jwt'

const envFile = process.env.CLANKEEP_ENV_FILE
if (!envFile) throw new Error('CLANKEEP_ENV_FILE must point to an existing ignored server environment file')
const loaded = dotenv.config({ path: envFile, override: false })
if (loaded.error) throw new Error('Could not load the configured server environment file')
const secret = process.env.NEXTAUTH_SECRET
if (!secret) throw new Error('NEXTAUTH_SECRET is required')
const apiBaseUrl = process.env.CLANKEEP_MOBILE_API_URL || 'http://127.0.0.1:3001'
const prisma = new PrismaClient()
let sessionId = null
let choreId = null

async function api(path, token, init) {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${init?.method || 'GET'} ${path} failed with ${response.status}: ${body.error || 'unknown error'}`)
  return body
}

function expect(condition, message) { if (!condition) throw new Error(message) }
function localDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Malta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  return parts
}

try {
  const user = await prisma.user.findFirst({
    where: { memberships: { some: {} } },
    select: { id: true, email: true, name: true, password: true, isDemo: true, memberships: { take: 1, select: { householdId: true } } },
  })
  if (!user?.password || !user.memberships[0]) throw new Error('No eligible household member exists for the smoke test')
  const passwordVersion = createHash('sha256').update(user.password).digest('base64url')
  const session = await prisma.mobileSession.create({ data: {
    userId: user.id, refreshTokenHash: createHash('sha256').update(randomBytes(48)).digest('base64url'),
    passwordVersion, deviceName: 'Automated mobile chores smoke test', platform: 'ios', expiresAt: new Date(Date.now() + 600_000),
  } })
  sessionId = session.id
  const token = await encode({ secret, maxAge: 600, token: {
    sub: user.id, email: user.email, name: user.name ?? user.email, isAdmin: false, isDemo: user.isDemo,
    passwordVersion, mobileSessionId: session.id, tokenType: 'mobile-access',
  } })
  const householdId = user.memberships[0].householdId
  const date = localDateOnly()
  const weekday = ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1
  const created = await api('/api/mobile/v1/chores', token, { method: 'POST', body: JSON.stringify({ householdId, title: `Codex mobile chore smoke ${Date.now()}`, recurrenceType: 'WEEKLY', daysOfWeek: [weekday] }) })
  choreId = created.chore.id
  const managed = await api(`/api/mobile/v1/chores?householdId=${encodeURIComponent(householdId)}`, token)
  expect(managed.chores.some(item => item.id === choreId), 'Created chore was not returned by management')
  const updated = await api(`/api/mobile/v1/chores/${encodeURIComponent(choreId)}`, token, { method: 'PATCH', body: JSON.stringify({ householdId, title: 'Codex mobile chore renamed', recurrenceType: 'WEEKLY', daysOfWeek: [weekday], active: true }) })
  expect(updated.chore.title === 'Codex mobile chore renamed', 'Chore update did not persist')
  const path = `/api/mobile/v1/chores/today?householdId=${encodeURIComponent(householdId)}&date=${date}`
  let today = await api(path, token)
  expect(today.items.some(item => item.id === choreId && item.status === 'PENDING'), 'Temporary chore was not pending')
  await api('/api/mobile/v1/chores/complete', token, { method: 'POST', body: JSON.stringify({ householdId, choreId, dueDate: date, status: 'DONE' }) })
  today = await api(path, token)
  expect(today.items.some(item => item.id === choreId && item.status === 'DONE'), 'Temporary chore was not completed')
  await api('/api/mobile/v1/chores/complete', token, { method: 'DELETE', body: JSON.stringify({ householdId, choreId, dueDate: date }) })
  today = await api(path, token)
  expect(today.items.some(item => item.id === choreId && item.status === 'PENDING'), 'Temporary chore was not reopened')
  await api(`/api/mobile/v1/chores/${encodeURIComponent(choreId)}`, token, { method: 'DELETE', body: JSON.stringify({ householdId }) })
  choreId = null
  console.log('Mobile chores API smoke test passed; temporary records will be removed.')
} finally {
  if (choreId) await prisma.chore.deleteMany({ where: { id: choreId } })
  if (sessionId) await prisma.mobileSession.deleteMany({ where: { id: sessionId } })
  await prisma.$disconnect()
}
