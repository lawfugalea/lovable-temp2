/**
 * Test-only harness for exercising the API authorization guards.
 *
 * The routes under src/pages/api do not implement authorization themselves —
 * they delegate to one of eight helpers in src/lib. Loading a whole route module
 * would drag in NextAuth's config and instantiate a Prisma client, which in this
 * repo means pointing at production. So instead:
 *
 *   - tests/api-guard-coverage.test.ts proves, statically, that every route
 *     delegates to one of those helpers or is a reviewed public route.
 *   - tests/api-authorization.test.ts loads the helpers themselves with Prisma
 *     and NextAuth replaced by the fakes below, and asserts the actual status
 *     codes an anonymous caller, an outsider, a member and an owner receive.
 *
 * Together those cover the surface: every route reaches a guard, and every guard
 * refuses the right callers.
 *
 * Nothing here touches a database or the network.
 */

import Module from 'node:module'
import path from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'

const repoRoot = path.join(__dirname, '..', '..')
const srcRoot = path.join(repoRoot, 'src')

interface ResolveFilenameHost {
  _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string
}

let aliasRegistered = false

/**
 * ts-node does not apply the tsconfig `paths` mapping at require time, so the
 * `@/...` imports inside src fail to resolve from a test. Map them here rather
 * than adding a runtime dependency to the application for the sake of tests.
 */
export function registerSrcAlias(): void {
  if (aliasRegistered) return
  const host = Module as unknown as ResolveFilenameHost
  const original = host._resolveFilename
  host._resolveFilename = function patched(request, parent, isMain, options) {
    const mapped = request.startsWith('@/')
      ? path.join(srcRoot, request.slice(2))
      : request
    return original.call(this, mapped, parent, isMain, options)
  }
  aliasRegistered = true
}

const stubbed = new Set<string>()

/** Insert `exports` into the require cache under `request`'s resolved path. */
export function stubModule(request: string, exports: Record<string, unknown>): void {
  registerSrcAlias()
  const filename = require.resolve(request, { paths: [srcRoot, repoRoot] })
  const fake = new Module(filename)
  fake.filename = filename
  fake.loaded = true
  fake.exports = exports
  require.cache[filename] = fake
  stubbed.add(filename)
}

/** Drop a module so the next require re-runs it against the current stubs. */
export function unloadModule(request: string): void {
  registerSrcAlias()
  try {
    delete require.cache[require.resolve(request, { paths: [srcRoot, repoRoot] })]
  } catch {
    // Never loaded; nothing to drop.
  }
}

/** Remove every stub, so one test's fakes cannot leak into another's. */
export function resetStubs(): void {
  for (const filename of stubbed) delete require.cache[filename]
  stubbed.clear()
}

export interface CapturedResponse {
  statusCode: number | null
  body: unknown
  headers: Record<string, unknown>
  ended: boolean
}

export interface FakeResponse extends CapturedResponse {
  res: NextApiResponse
}

/** A NextApiResponse that records what a guard did instead of writing a socket. */
export function fakeRes(): FakeResponse {
  const captured: CapturedResponse = {
    statusCode: null,
    body: undefined,
    headers: {},
    ended: false,
  }
  const res = {
    get statusCode() {
      return captured.statusCode ?? 200
    },
    get headersSent() {
      return captured.ended
    },
    status(code: number) {
      captured.statusCode = code
      return res
    },
    json(payload: unknown) {
      captured.body = payload
      captured.ended = true
      return res
    },
    send(payload: unknown) {
      captured.body = payload
      captured.ended = true
      return res
    },
    end() {
      captured.ended = true
      return res
    },
    setHeader(name: string, value: unknown) {
      captured.headers[name] = value
      return res
    },
    getHeader(name: string) {
      return captured.headers[name]
    },
  } as unknown as NextApiResponse

  return {
    res,
    get statusCode() {
      return captured.statusCode
    },
    get body() {
      return captured.body
    },
    get headers() {
      return captured.headers
    },
    get ended() {
      return captured.ended
    },
  }
}

export function fakeReq(
  overrides: Partial<NextApiRequest> & { query?: Record<string, unknown> } = {},
): NextApiRequest {
  return {
    method: 'GET',
    query: {},
    body: {},
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as NextApiRequest
}

export interface MembershipFixture {
  userId: string
  householdId: string
  role: 'OWNER' | 'MEMBER'
}

/**
 * The narrow slice of Prisma the guards use: membership lookups, a user's active
 * household, and a household existence check. Anything a guard asks for that is
 * not modelled here throws loudly rather than returning undefined, so a guard
 * that starts making a new query cannot silently pass these tests.
 */
export interface UserFixture {
  id: string
  email?: string
  password?: string
  activeHouseholdId?: string | null
}

export interface PrismaFixture {
  memberships?: MembershipFixture[]
  users?: UserFixture[]
  households?: string[]
}

export function fakePrisma(options: PrismaFixture) {
  const memberships = options.memberships ?? []
  const users = options.users ?? []
  const households = options.households ?? []

  const matches = (where: Record<string, any>) =>
    memberships.filter((membership) => {
      const target = where.userId_householdId ?? where
      if (target.userId && target.userId !== membership.userId) return false
      if (target.householdId && target.householdId !== membership.householdId) return false
      if (where.role && where.role !== membership.role) return false
      if (where.user?.email?.equals) {
        const user = users.find((candidate) => candidate.id === membership.userId)
        if (user?.email?.toLowerCase() !== where.user.email.equals.toLowerCase()) return false
      }
      return true
    })

  return {
    membership: {
      findFirst: async ({ where }: any) => matches(where)[0] ?? null,
      findUnique: async ({ where }: any) => matches(where)[0] ?? null,
    },
    user: {
      findUnique: async ({ where }: any) =>
        users.find((user) => user.id === where.id || user.email === where.email) ?? null,
    },
    household: {
      findUnique: async ({ where }: any) =>
        households.includes(where.id) ? { id: where.id } : null,
    },
    // Anything else is a query the guards did not make when these tests were
    // written. Fail rather than pretend.
    get __unexpected() {
      throw new Error('Unexpected Prisma model access in a guard test')
    },
  }
}

/** Stub `getServerSession` (next-auth/next) to return this session. */
export function stubServerSession(session: unknown): void {
  stubModule('next-auth/next', { getServerSession: async () => session })
}

/** Stub `getToken` (next-auth/jwt) to return this token. */
export function stubJwtToken(token: unknown): void {
  stubModule('next-auth/jwt', { getToken: async () => token })
}

/**
 * src/pages/api/auth/[...nextauth] is imported by the guards purely to pass
 * `authOptions` into getServerSession. Loading it for real would build the whole
 * NextAuth config, so hand the guards an inert object.
 *
 * One stub covers both import styles in the codebase — `@/pages/api/auth/...`
 * and the relative `../pages/api/auth/...` in api-guards.ts — because the require
 * cache is keyed by resolved filename, and both land on the same file.
 */
export function stubAuthOptions(): void {
  stubModule('@/pages/api/auth/[...nextauth]', { authOptions: {}, default: () => undefined })
}
