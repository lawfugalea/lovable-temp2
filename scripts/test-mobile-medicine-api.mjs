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

function expect(condition, message) { if (!condition) throw new Error(message) }

try {
  const user = await prisma.user.findFirst({
    where: { memberships: { some: {} } },
    select: { id: true, email: true, name: true, password: true, isDemo: true, memberships: { take: 1, select: { householdId: true } } },
  })
  if (!user?.password || !user.memberships[0]) throw new Error('No eligible household member exists for the smoke test')
  const householdId = user.memberships[0].householdId
  const before = await Promise.all([
    prisma.medicine.count({ where: { householdId } }),
    prisma.medicineDose.count({ where: { child: { householdId } } }),
    prisma.feverReading.count({ where: { child: { householdId } } }),
    prisma.healthEpisode.count({ where: { householdId } }),
    prisma.weightMeasurement.count({ where: { child: { householdId } } }),
  ])
  const passwordVersion = createHash('sha256').update(user.password).digest('base64url')
  const session = await prisma.mobileSession.create({ data: {
    userId: user.id, refreshTokenHash: createHash('sha256').update(randomBytes(48)).digest('base64url'), passwordVersion,
    deviceName: 'Automated mobile medicine read-only smoke test', platform: 'ios', expiresAt: new Date(Date.now() + 600_000),
  } })
  sessionId = session.id
  const token = await encode({ secret, maxAge: 600, token: {
    sub: user.id, email: user.email, name: user.name ?? user.email, isAdmin: false, isDemo: user.isDemo,
    passwordVersion, mobileSessionId: session.id, tokenType: 'mobile-access',
  } })
  const url = `${apiBaseUrl}/api/mobile/v1/medicine/overview?householdId=${encodeURIComponent(householdId)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({}))
  expect(response.status === 200, `Medicine overview failed with ${response.status}`)
  expect(Array.isArray(body.children) && Array.isArray(body.medicines) && Array.isArray(body.recentDoses) && Array.isArray(body.recentFeverReadings) && Array.isArray(body.recentEpisodes) && Array.isArray(body.recentWeights), 'Health overview arrays are missing')
  const rejected = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' })
  expect(rejected.status === 405, `Medicine overview POST should be 405, got ${rejected.status}`)
  const after = await Promise.all([
    prisma.medicine.count({ where: { householdId } }),
    prisma.medicineDose.count({ where: { child: { householdId } } }),
    prisma.feverReading.count({ where: { child: { householdId } } }),
    prisma.healthEpisode.count({ where: { householdId } }),
    prisma.weightMeasurement.count({ where: { child: { householdId } } }),
  ])
  expect(before.every((count, index) => count === after[index]), 'Read-only overview changed health data')
  console.log('Mobile health read-only API smoke test passed; health-record counts were unchanged.')
} finally {
  if (sessionId) await prisma.mobileSession.deleteMany({ where: { id: sessionId } })
  await prisma.$disconnect()
}
