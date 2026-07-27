import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fakePrisma,
  fakeReq,
  fakeRes,
  registerSrcAlias,
  resetStubs,
  stubAuthOptions,
  stubJwtToken,
  stubModule,
  stubServerSession,
  unloadModule,
  type PrismaFixture,
} from './helpers/api-harness'

/**
 * The authorization guards, exercised against the four caller classes that
 * matter in a multi-household app:
 *
 *   anonymous            -> 401
 *   member of some other household -> 403
 *   member of this household       -> allowed, or 403 where owner-only
 *   owner of this household        -> allowed
 *
 * api-guard-coverage.test.ts proves every route reaches one of these guards.
 * This file proves the guards then refuse the right people. Prisma and NextAuth
 * are replaced with fakes, so nothing here opens a database connection — which
 * matters, because in this repo every configured database URL is production.
 */

registerSrcAlias()

const OWNER = 'user-owner'
const MEMBER = 'user-member'
const OUTSIDER = 'user-outsider'
const HOUSEHOLD = 'household-1'
const OTHER_HOUSEHOLD = 'household-2'

const FIXTURE: PrismaFixture = {
  memberships: [
    { userId: OWNER, householdId: HOUSEHOLD, role: 'OWNER' as const },
    { userId: MEMBER, householdId: HOUSEHOLD, role: 'MEMBER' as const },
    { userId: OUTSIDER, householdId: OTHER_HOUSEHOLD, role: 'OWNER' as const },
  ],
  users: [
    { id: OWNER, email: 'owner@example.com', password: '$2b$12$owner', activeHouseholdId: HOUSEHOLD },
    { id: MEMBER, email: 'member@example.com', password: '$2b$12$member', activeHouseholdId: HOUSEHOLD },
    {
      id: OUTSIDER,
      email: 'outsider@example.com',
      password: '$2b$12$outsider',
      activeHouseholdId: OTHER_HOUSEHOLD,
    },
  ],
  households: [HOUSEHOLD, OTHER_HOUSEHOLD],
}

/** Load api-guards with the session and Prisma it should see. */
function loadMembershipGuard(session: unknown) {
  resetStubs()
  stubAuthOptions()
  stubServerSession(session)
  stubModule('@/lib/prisma', { prisma: fakePrisma(FIXTURE) })
  unloadModule('@/lib/api-guards')
  return require('../src/lib/api-guards') as typeof import('../src/lib/api-guards')
}

function sessionFor(userId: string | null) {
  if (!userId) return null
  const user = FIXTURE.users!.find((candidate) => candidate.id === userId)!
  return { user: { id: user.id, email: user.email } }
}

test('an anonymous caller is refused with 401, not 403', async () => {
  const { requireMembershipIn } = loadMembershipGuard(null)
  const res = fakeRes()
  const result = await requireMembershipIn(fakeReq(), res.res, HOUSEHOLD)

  assert.equal(result, null)
  assert.equal(res.statusCode, 401)
})

test('a signed-in caller with no householdId gets 400 rather than a guess', async () => {
  const { requireMembershipIn } = loadMembershipGuard(sessionFor(MEMBER))
  const res = fakeRes()
  const result = await requireMembershipIn(fakeReq(), res.res, undefined)

  assert.equal(result, null)
  assert.equal(res.statusCode, 400)
})

test("a member of another household cannot reach this household's data", async () => {
  const { requireMembershipIn } = loadMembershipGuard(sessionFor(OUTSIDER))
  const res = fakeRes()
  const result = await requireMembershipIn(fakeReq(), res.res, HOUSEHOLD)

  assert.equal(result, null)
  assert.equal(res.statusCode, 403)
})

test('a member of this household is allowed through', async () => {
  const { requireMembershipIn } = loadMembershipGuard(sessionFor(MEMBER))
  const res = fakeRes()
  const result = await requireMembershipIn(fakeReq(), res.res, HOUSEHOLD)

  assert.deepEqual(result, { userId: MEMBER })
  assert.equal(res.statusCode, null, 'the guard should not have responded')
})

test('ownerOnly refuses an ordinary member of the same household', async () => {
  const { requireMembershipIn } = loadMembershipGuard(sessionFor(MEMBER))
  const res = fakeRes()
  const result = await requireMembershipIn(fakeReq(), res.res, HOUSEHOLD, { ownerOnly: true })

  assert.equal(result, null)
  assert.equal(res.statusCode, 403)
})

test('ownerOnly admits the owner', async () => {
  const { requireMembershipIn } = loadMembershipGuard(sessionFor(OWNER))
  const res = fakeRes()
  const result = await requireMembershipIn(fakeReq(), res.res, HOUSEHOLD, { ownerOnly: true })

  assert.deepEqual(result, { userId: OWNER })
  assert.equal(res.statusCode, null)
})

test('getUserIdOr401 never returns an id it did not find in the session', async () => {
  const { getUserIdOr401 } = loadMembershipGuard({ user: { email: 'nobody@example.com' } })
  const res = fakeRes()

  assert.equal(await getUserIdOr401(fakeReq(), res.res), null)
  assert.equal(res.statusCode, 401)
})

// ── Active-household resolution (chores, meals, notes) ────────────────────────

function loadChoreGuard(prismaFixture: PrismaFixture = FIXTURE) {
  resetStubs()
  stubModule('@/lib/prisma', { prisma: fakePrisma(prismaFixture) })
  unloadModule('@/lib/chores')
  return require('../src/lib/chores') as typeof import('../src/lib/chores')
}

test('a user whose active household was revoked gets 403, not that household', async () => {
  // The membership row is gone but the stale activeHouseholdId remains — exactly
  // what happens to someone removed from a household while signed in.
  const { requireActiveHousehold } = loadChoreGuard({
    ...FIXTURE,
    memberships: FIXTURE.memberships!.filter((m) => m.userId !== MEMBER),
  })
  const res = fakeRes()
  const result = await requireActiveHousehold(fakeReq(), res.res, MEMBER)

  assert.equal(result, null)
  assert.equal(res.statusCode, 403)
})

test('a user with no active household selected gets 400', async () => {
  const { requireActiveHousehold } = loadChoreGuard({
    ...FIXTURE,
    users: [{ id: MEMBER, email: 'member@example.com', activeHouseholdId: null }],
  })
  const res = fakeRes()
  const result = await requireActiveHousehold(fakeReq(), res.res, MEMBER)

  assert.equal(result, null)
  assert.equal(res.statusCode, 400)
})

test('a current member resolves to their active household', async () => {
  const { requireActiveHousehold } = loadChoreGuard()
  const res = fakeRes()
  const result = await requireActiveHousehold(fakeReq(), res.res, MEMBER)

  assert.equal(result, HOUSEHOLD)
  assert.equal(res.statusCode, null)
})

// ── Token-based guards (admin surface, invites) ───────────────────────────────

function loadAuthHelpers(token: unknown, prismaFixture: PrismaFixture = FIXTURE) {
  resetStubs()
  process.env.NEXTAUTH_SECRET = 'test-secret-not-used-by-the-stub'
  stubJwtToken(token)
  stubModule('@/lib/prisma', { prisma: fakePrisma(prismaFixture) })
  unloadModule('@/lib/auth-helpers')
  return require('../src/lib/auth-helpers') as typeof import('../src/lib/auth-helpers')
}

function tokenFor(userId: string) {
  const user = FIXTURE.users!.find((candidate) => candidate.id === userId)!
  const { passwordVersion } = require('../src/lib/session-security') as typeof import('../src/lib/session-security')
  return { sub: user.id, passwordVersion: passwordVersion(user.password!) }
}

test('requireUser rejects a request with no token', async () => {
  const { requireUser } = loadAuthHelpers(null)
  await assert.rejects(requireUser(fakeReq()), (error: any) => error.status === 401)
})

test('requireUser rejects a token issued before a password change', async () => {
  // The session is otherwise valid; only the password behind it changed. This is
  // the check that logs out stolen sessions when someone resets their password.
  const { requireUser } = loadAuthHelpers(
    { sub: MEMBER, passwordVersion: 'stale-version' },
  )
  await assert.rejects(requireUser(fakeReq()), (error: any) => error.status === 401)
})

test('requireUser accepts a token whose password version still matches', async () => {
  const { requireUser } = loadAuthHelpers(tokenFor(MEMBER))
  const result = await requireUser(fakeReq())
  assert.equal(result.user.id, MEMBER)
})

test('ensureOwner refuses a member and admits the owner of the same household', async () => {
  const { ensureOwner } = loadAuthHelpers(tokenFor(MEMBER))

  await assert.rejects(ensureOwner(MEMBER, HOUSEHOLD), (error: any) => error.status === 403)
  await assert.rejects(ensureOwner(OUTSIDER, HOUSEHOLD), (error: any) => error.status === 403)
  assert.deepEqual(await ensureOwner(OWNER, HOUSEHOLD), { id: HOUSEHOLD })
})

test('ensureOwner reports a missing household as 404 rather than 403', async () => {
  const { ensureOwner } = loadAuthHelpers(tokenFor(OWNER))
  await assert.rejects(
    ensureOwner(OWNER, 'household-that-does-not-exist'),
    (error: any) => error.status === 404,
  )
})

// ── Admin surface ─────────────────────────────────────────────────────────────

function loadAdminGuard(token: unknown, adminEmails: string) {
  resetStubs()
  process.env.NEXTAUTH_SECRET = 'test-secret-not-used-by-the-stub'
  process.env.ADMIN_EMAILS = adminEmails
  stubJwtToken(token)
  stubModule('@/lib/prisma', { prisma: fakePrisma(FIXTURE) })
  unloadModule('@/lib/admin-config')
  unloadModule('@/lib/admin-helpers')
  return require('../src/lib/admin-helpers') as typeof import('../src/lib/admin-helpers')
}

test('requireAdmin refuses a perfectly valid non-admin session with 403', async () => {
  const { requireAdmin } = loadAdminGuard(tokenFor(MEMBER), 'owner@example.com')
  await assert.rejects(requireAdmin(fakeReq()), (error: any) => error.status === 403)
})

test('requireAdmin refuses an anonymous caller with 401', async () => {
  const { requireAdmin } = loadAdminGuard(null, 'owner@example.com')
  await assert.rejects(requireAdmin(fakeReq()), (error: any) => error.status === 401)
})

test('requireAdmin admits a listed admin', async () => {
  const { requireAdmin } = loadAdminGuard(tokenFor(OWNER), 'owner@example.com')
  const result = await requireAdmin(fakeReq())
  assert.equal(result.user.id, OWNER)
})

test('requireAdmin admits nobody when no admin emails are configured', async () => {
  // An empty ADMIN_EMAILS must fail closed, not open.
  const { requireAdmin } = loadAdminGuard(tokenFor(OWNER), '')
  await assert.rejects(requireAdmin(fakeReq()), (error: any) => error.status === 403)
})

// ── Finance surface ───────────────────────────────────────────────────────────

function loadFinanceGuard(
  session: unknown,
  options: { canUseFinance?: boolean; financeOwnerEmail?: string } = {},
) {
  resetStubs()
  stubAuthOptions()
  stubServerSession(session)
  stubModule('@/lib/prisma', { prisma: fakePrisma(FIXTURE) })
  stubModule('@/lib/entitlements', {
    getHouseholdEntitlements: async () => ({
      canUseFinance: options.canUseFinance ?? true,
    }),
  })
  process.env.FINANCE_OWNER_EMAIL = options.financeOwnerEmail ?? ''
  unloadModule('@/lib/finance/access')
  return require('../src/lib/finance/access') as typeof import('../src/lib/finance/access')
}

test('finance refuses an anonymous caller with 401', async () => {
  const { requireFinanceAccess } = loadFinanceGuard(null)
  const res = fakeRes()

  assert.equal(await requireFinanceAccess(fakeReq(), res.res, HOUSEHOLD), null)
  assert.equal(res.statusCode, 401)
})

test('finance refuses a member of another household with 403', async () => {
  const { requireFinanceAccess } = loadFinanceGuard(sessionFor(OUTSIDER))
  const res = fakeRes()

  assert.equal(await requireFinanceAccess(fakeReq(), res.res, HOUSEHOLD), null)
  assert.equal(res.statusCode, 403)
})

test('finance refuses a household without the entitlement', async () => {
  const { requireFinanceAccess } = loadFinanceGuard(sessionFor(OWNER), { canUseFinance: false })
  const res = fakeRes()

  assert.equal(await requireFinanceAccess(fakeReq(), res.res, HOUSEHOLD), null)
  assert.ok(
    res.statusCode === 402 || res.statusCode === 403,
    `expected an upgrade-required status, got ${res.statusCode}`,
  )
})

test('finance grants a member read access but not manage rights', async () => {
  const { requireFinanceAccess } = loadFinanceGuard(sessionFor(MEMBER))

  const read = fakeRes()
  const readAccess = await requireFinanceAccess(fakeReq(), read.res, HOUSEHOLD)
  assert.equal(readAccess?.userId, MEMBER)
  assert.equal(readAccess?.canManage, false, 'a member must not be able to manage bank connections')

  const manage = fakeRes()
  assert.equal(
    await requireFinanceAccess(fakeReq(), manage.res, HOUSEHOLD, { manage: true }),
    null,
  )
  assert.equal(manage.statusCode, 403)
})

test('finance grants the owner manage rights', async () => {
  const { requireFinanceAccess } = loadFinanceGuard(sessionFor(OWNER))
  const res = fakeRes()
  const access = await requireFinanceAccess(fakeReq(), res.res, HOUSEHOLD, { manage: true })

  assert.equal(access?.userId, OWNER)
  assert.equal(access?.canManage, true)
})

test('bank features stay off for a household with no finance owner configured', async () => {
  // FINANCE_OWNER_EMAIL unset must mean no household gets the bank surface,
  // rather than every household getting it.
  const { requireFinanceAccess } = loadFinanceGuard(sessionFor(OWNER), { financeOwnerEmail: '' })
  const res = fakeRes()
  const access = await requireFinanceAccess(fakeReq(), res.res, HOUSEHOLD)

  assert.equal(access?.bankEnabled, false)

  const banking = fakeRes()
  assert.equal(await requireFinanceAccess(fakeReq(), banking.res, HOUSEHOLD, { bank: true }), null)
  assert.equal(banking.statusCode, 403)
})

test('bank features switch on only for the household holding the finance owner', async () => {
  const { requireFinanceAccess } = loadFinanceGuard(sessionFor(OWNER), {
    financeOwnerEmail: 'owner@example.com',
  })
  const res = fakeRes()
  const access = await requireFinanceAccess(fakeReq(), res.res, HOUSEHOLD, { bank: true })

  assert.equal(access?.bankEnabled, true)
  assert.equal(res.statusCode, null)
})

test.after(() => {
  resetStubs()
})
