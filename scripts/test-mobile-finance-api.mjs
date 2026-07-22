import { createHash, randomBytes } from 'node:crypto'
import process from 'node:process'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
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
const tag = `mobile-finance-smoke-${Date.now()}-${randomBytes(4).toString('hex')}`
let userId = null
let householdId = null

function expect(condition, message) { if (!condition) throw new Error(message) }
async function api(path, token, init = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } })
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

try {
  const password = await bcrypt.hash(randomBytes(32).toString('base64url'), 10)
  const user = await prisma.user.create({ data: { email: `${tag}@example.invalid`, name: 'Mobile finance smoke', password, acceptedTermsAt: new Date(), termsVersion: 'smoke-test' } })
  userId = user.id
  const household = await prisma.household.create({ data: { name: tag, ownerId: user.id, plan: 'FAMILY', planSource: 'ADMIN', country: 'MT', members: { create: { userId: user.id, role: 'OWNER' } } } })
  householdId = household.id
  await prisma.user.update({ where: { id: user.id }, data: { activeHouseholdId: household.id } })
  const passwordVersion = createHash('sha256').update(password).digest('base64url')
  const session = await prisma.mobileSession.create({ data: { userId: user.id, refreshTokenHash: createHash('sha256').update(randomBytes(48)).digest('base64url'), passwordVersion, deviceName: 'Automated mobile finance smoke test', platform: 'ios', expiresAt: new Date(Date.now() + 600_000) } })
  const token = await encode({ secret, maxAge: 600, token: { sub: user.id, email: user.email, name: user.name, isAdmin: false, isDemo: false, passwordVersion, mobileSessionId: session.id, tokenType: 'mobile-access' } })
  const query = `householdId=${encodeURIComponent(household.id)}`

  const firstPlan = await api(`/api/mobile/v1/finance/planner?${query}`, token)
  expect(firstPlan.response.status === 200, `Initial planner GET failed with ${firstPlan.response.status}`)
  expect(firstPlan.body.incomes?.length === 0 && firstPlan.body.commitments?.length === 0 && firstPlan.body.goals?.length === 0, 'Temporary planner was not empty')
  expect(typeof firstPlan.body.aiConfigured === 'boolean', 'Planner did not report AI availability')
  const overview = await api(`/api/mobile/v1/finance/overview?${query}`, token)
  expect(overview.response.status === 200 && overview.body.bankEnabled === false, `Planner-only overview failed with ${overview.response.status}`)
  const bankDenied = await api(`/api/mobile/v1/finance/transactions?${query}`, token)
  expect(bankDenied.response.status === 403, `Bank-only route should be denied with 403, got ${bankDenied.response.status}`)

  const income = await api('/api/mobile/v1/finance/planner/income', token, { method: 'POST', body: JSON.stringify({ householdId: household.id, label: 'Smoke income', amount: '2400', frequency: 'MONTHLY' }) })
  const commitment = await api('/api/mobile/v1/finance/planner/commitment', token, { method: 'POST', body: JSON.stringify({ householdId: household.id, label: 'Smoke rent', amount: '900', frequency: 'MONTHLY', category: 'housing', essential: true }) })
  const goal = await api('/api/mobile/v1/finance/planner/goal', token, { method: 'POST', body: JSON.stringify({ householdId: household.id, name: 'Smoke goal', target: '5000', saved: '250', targetDate: '2027-12-31' }) })
  expect(income.response.status === 201 && commitment.response.status === 201 && goal.response.status === 201, 'A planner create request failed')
  const updated = await api('/api/mobile/v1/finance/planner/income', token, { method: 'PATCH', body: JSON.stringify({ householdId: household.id, id: income.body.id, label: 'Smoke income updated', amount: '2500', frequency: 'MONTHLY' }) })
  expect(updated.response.status === 200, `Income PATCH failed with ${updated.response.status}`)

  const populated = await api(`/api/mobile/v1/finance/planner?${query}`, token)
  expect(populated.response.status === 200, `Populated planner GET failed with ${populated.response.status}`)
  expect(populated.body.incomes?.[0]?.label === 'Smoke income updated', 'Updated income did not round-trip')
  expect(populated.body.summary?.monthlyIncomeCents === 250000 && populated.body.summary?.monthlyCommitmentsCents === 90000, 'Planner summary is incorrect')
  const coachPreview = await api('/api/mobile/v1/finance/planner/coach', token, { method: 'POST', body: JSON.stringify({ householdId: household.id }) })
  if (populated.body.aiConfigured) {
    expect(coachPreview.response.status === 200 && coachPreview.body.requiresConsent === true, `AI coach privacy preview failed with ${coachPreview.response.status}`)
    expect(coachPreview.body.preview?.memberCount === 1 && coachPreview.body.preview?.monthlyIncomeEur === 2500, 'AI coach preview did not use redacted planner aggregates')
    expect(!JSON.stringify(coachPreview.body.preview).includes(user.email), 'AI coach preview exposed a user identity')
    expect(await prisma.financeAiPreference.count({ where: { userId: user.id } }) === 0, 'Preview-only AI coach request persisted consent')
  } else {
    expect(coachPreview.response.status === 503, `Unconfigured AI coach should return 503, got ${coachPreview.response.status}`)
  }

  for (const [kind, id] of [['income', income.body.id], ['commitment', commitment.body.id], ['goal', goal.body.id]]) {
    const removed = await api(`/api/mobile/v1/finance/planner/${kind}`, token, { method: 'DELETE', body: JSON.stringify({ householdId: household.id, id }) })
    expect(removed.response.status === 200, `${kind} DELETE failed with ${removed.response.status}`)
  }
  const emptyAgain = await api(`/api/mobile/v1/finance/planner?${query}`, token)
  expect(emptyAgain.body.incomes?.length === 0 && emptyAgain.body.commitments?.length === 0 && emptyAgain.body.goals?.length === 0, 'Temporary planner entries were not removed')
  console.log('Mobile Finance API smoke test passed; temporary planner records round-tripped and were removed.')
} finally {
  if (householdId) await prisma.household.deleteMany({ where: { id: householdId, name: tag } })
  if (userId) await prisma.user.deleteMany({ where: { id: userId, email: `${tag}@example.invalid` } })
  const [households, users, sessions, incomes, commitments, goals, aiPreferences] = await Promise.all([
    prisma.household.count({ where: { name: tag } }), prisma.user.count({ where: { email: `${tag}@example.invalid` } }),
    userId ? prisma.mobileSession.count({ where: { userId } }) : 0, householdId ? prisma.incomeSource.count({ where: { householdId } }) : 0,
    householdId ? prisma.commitment.count({ where: { householdId } }) : 0, householdId ? prisma.savingsGoal.count({ where: { householdId } }) : 0,
    userId ? prisma.financeAiPreference.count({ where: { userId } }) : 0,
  ])
  if ([households, users, sessions, incomes, commitments, goals, aiPreferences].some(Boolean)) throw new Error('Mobile Finance smoke-test cleanup did not reach zero')
  await prisma.$disconnect()
}
