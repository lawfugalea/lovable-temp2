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
let noteId = null

async function api(path, token, init) {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${init?.method || 'GET'} ${path} failed with ${response.status}: ${body.error || 'unknown error'}`)
  return body
}
function expect(condition, message) { if (!condition) throw new Error(message) }

try {
  const user = await prisma.user.findFirst({ where: { memberships: { some: {} } }, select: { id: true, email: true, name: true, password: true, isDemo: true, memberships: { take: 1, select: { householdId: true } } } })
  if (!user?.password || !user.memberships[0]) throw new Error('No eligible household member exists for the smoke test')
  const householdId = user.memberships[0].householdId
  const passwordVersion = createHash('sha256').update(user.password).digest('base64url')
  const session = await prisma.mobileSession.create({ data: { userId: user.id, refreshTokenHash: createHash('sha256').update(randomBytes(48)).digest('base64url'), passwordVersion, deviceName: 'Automated mobile workspace smoke test', platform: 'ios', expiresAt: new Date(Date.now() + 600_000) } })
  sessionId = session.id
  const token = await encode({ secret, maxAge: 600, token: { sub: user.id, email: user.email, name: user.name ?? user.email, isAdmin: false, isDemo: user.isDemo, passwordVersion, mobileSessionId: session.id, tokenType: 'mobile-access' } })
  const workspace = await api(`/api/mobile/v1/workspace?householdId=${encodeURIComponent(householdId)}`, token)
  expect(workspace.household.id === householdId && Array.isArray(workspace.members) && Array.isArray(workspace.children), 'Workspace overview is incomplete')
  const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`
  const created = await api('/api/mobile/v1/notes', token, { method: 'POST', body: JSON.stringify({ householdId, title: `Codex workspace smoke ${suffix}`, contentText: '<safe temporary text>', isShared: true, color: 'blue' }) })
  noteId = created.note.id
  expect(created.note.mobilePlainText && created.note.contentText === '<safe temporary text>', 'Mobile note creation was not lossless')
  const updated = await api(`/api/mobile/v1/notes/${encodeURIComponent(noteId)}`, token, { method: 'PATCH', body: JSON.stringify({ householdId, title: `Codex workspace renamed ${suffix}`, contentText: 'Updated temporary text', isPinned: true, color: 'green' }) })
  expect(updated.note.isPinned && updated.note.color === 'green' && updated.note.contentText === 'Updated temporary text', 'Mobile note update did not persist')
  const notes = await api(`/api/mobile/v1/notes?householdId=${encodeURIComponent(householdId)}`, token)
  expect(notes.notes.some(note => note.id === noteId), 'Mobile note was not listed')
  await api(`/api/mobile/v1/notes/${encodeURIComponent(noteId)}`, token, { method: 'DELETE', body: JSON.stringify({ householdId }) })
  noteId = null
  console.log('Mobile Family Workspace API smoke test passed; temporary records were removed.')
} finally {
  if (noteId) await prisma.note.deleteMany({ where: { id: noteId } })
  if (sessionId) await prisma.mobileSession.deleteMany({ where: { id: sessionId } })
  await prisma.$disconnect()
}
