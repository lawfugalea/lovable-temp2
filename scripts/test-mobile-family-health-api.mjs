import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { encode } from 'next-auth/jwt'

const envFile = process.env.CLANKEEP_ENV_FILE
if (!envFile) throw new Error('CLANKEEP_ENV_FILE must point to the ignored server environment file')
const loaded = dotenv.config({ path: envFile, override: false })
if (loaded.error) throw new Error('Could not load the server environment file')
const secret = process.env.NEXTAUTH_SECRET
if (!secret) throw new Error('NEXTAUTH_SECRET is required')
const apiBaseUrl = process.env.CLANKEEP_MOBILE_API_URL || 'http://127.0.0.1:3001'
const prisma = new PrismaClient()
const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`
const ownerEmail = `codex-mobile-owner-${suffix}@example.invalid`
const memberEmail = `codex-mobile-member-${suffix}@example.invalid`
const badRegistrationEmail = `codex-mobile-register-${suffix}@example.invalid`
let ownerId = null
let memberId = null
let householdId = null
let sessionId = null
let noteId = null

async function api(route, token, init) {
  const response = await fetch(`${apiBaseUrl}${route}`, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  const body = await response.json().catch(() => ({}))
  return { response, body }
}
function expect(condition, message) { if (!condition) throw new Error(message) }
async function ok(route, token, init, expected = [200, 201]) { const result = await api(route, token, init); expect(expected.includes(result.response.status), `${init?.method || 'GET'} ${route} failed ${result.response.status}: ${result.body.error || 'unknown'}`); return result.body }

try {
  const captcha = await ok('/api/mobile/v1/auth/captcha', null)
  const rejectedRegistration = await api('/api/mobile/v1/auth/register', null, { method: 'POST', body: JSON.stringify({ name: 'Codex Mobile', email: badRegistrationEmail, password: 'temporary-safe-phrase-92', captchaId: captcha.id, captchaAnswer: 'incorrect', acceptedTerms: true }) })
  expect(rejectedRegistration.response.status === 400, 'Registration security check did not reject an incorrect answer')
  await ok('/api/mobile/v1/auth/forgot-password', null, { method: 'POST', body: JSON.stringify({ email: badRegistrationEmail }) })

  const password = await bcrypt.hash(`temporary-${suffix}`, 12)
  const owner = await prisma.user.create({ data: { name: 'Codex Mobile Owner', email: ownerEmail, password, acceptedTermsAt: new Date(), termsVersion: 'smoke-test' } })
  ownerId = owner.id
  const passwordVersion = createHash('sha256').update(password).digest('base64url')
  const session = await prisma.mobileSession.create({ data: { userId: owner.id, refreshTokenHash: createHash('sha256').update(randomBytes(48)).digest('base64url'), passwordVersion, deviceName: 'Automated family health smoke test', platform: 'ios', expiresAt: new Date(Date.now() + 900_000) } })
  sessionId = session.id
  const token = await encode({ secret, maxAge: 900, token: { sub: owner.id, email: owner.email, name: owner.name, isAdmin: false, isDemo: false, passwordVersion, mobileSessionId: session.id, tokenType: 'mobile-access' } })

  const createdHousehold = await ok('/api/mobile/v1/household/create', token, { method: 'POST', body: JSON.stringify({ name: `Codex mobile family ${suffix}`, country: 'MT' }) })
  householdId = createdHousehold.householdId
  const renamed = await ok('/api/mobile/v1/workspace', token, { method: 'PATCH', body: JSON.stringify({ householdId, action: 'household', name: `Codex mobile renamed ${suffix}` }) })
  expect(renamed.workspace.household.name.startsWith('Codex mobile renamed'), 'Household rename failed')
  await ok('/api/mobile/v1/workspace', token, { method: 'PATCH', body: JSON.stringify({ householdId, action: 'profile', name: 'Codex Mobile Owner Edited' }) })

  const member = await prisma.user.create({ data: { name: 'Codex Mobile Member', email: memberEmail, password } })
  memberId = member.id
  const membership = await prisma.membership.create({ data: { userId: member.id, householdId, role: 'MEMBER' } })
  await ok(`/api/mobile/v1/family/members/${membership.id}`, token, { method: 'PATCH', body: JSON.stringify({ householdId, role: 'OWNER' }) })
  await ok(`/api/mobile/v1/family/members/${membership.id}`, token, { method: 'PATCH', body: JSON.stringify({ householdId, role: 'MEMBER' }) })
  const invite = await prisma.invite.create({ data: { householdId, email: `invite-${suffix}@example.invalid`, role: 'MEMBER', tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'), status: 'PENDING', expiresAt: new Date(Date.now() + 3600_000), invitedById: owner.id } })
  await ok(`/api/mobile/v1/family/invites/${invite.id}`, token, { method: 'DELETE', body: JSON.stringify({ householdId }) })
  await ok(`/api/mobile/v1/family/members/${membership.id}`, token, { method: 'DELETE', body: JSON.stringify({ householdId }) })
  const workspace = await ok(`/api/mobile/v1/workspace?householdId=${encodeURIComponent(householdId)}`, token)
  expect(workspace.members.length === 1 && workspace.invites.length === 0, 'Family cleanup was not reflected in workspace')

  const child = await ok('/api/mobile/v1/medicine/children', token, { method: 'POST', body: JSON.stringify({ householdId, name: 'Codex Health Child', dateOfBirth: '2020-01-02', notes: 'Temporary' }) })
  await ok('/api/mobile/v1/medicine/children', token, { method: 'PATCH', body: JSON.stringify({ householdId, id: child.id, name: 'Codex Health Child Edited', dateOfBirth: '2020-01-02', notes: 'Temporary edited', isActive: true }) })
  const episode = await ok('/api/mobile/v1/medicine/episodes', token, { method: 'POST', body: JSON.stringify({ householdId, childId: child.id, title: 'Codex temporary illness', notes: 'Temporary episode' }) })
  const fever = await ok('/api/mobile/v1/medicine/fever', token, { method: 'POST', body: JSON.stringify({ householdId, childId: child.id, episodeId: episode.id, temperature: 37.7, unit: 'C', method: 'forehead', notes: 'Temporary' }) })
  await ok('/api/mobile/v1/medicine/fever', token, { method: 'PUT', body: JSON.stringify({ householdId, id: fever.id, childId: child.id, episodeId: episode.id, temperature: 37.8, unit: 'C', method: 'ear', notes: 'Temporary edited' }) })
  const weight = await ok('/api/mobile/v1/medicine/weights', token, { method: 'POST', body: JSON.stringify({ householdId, childId: child.id, weightKg: 20.2, notes: 'Temporary' }) })
  await ok('/api/mobile/v1/medicine/weights', token, { method: 'PUT', body: JSON.stringify({ householdId, id: weight.id, childId: child.id, weightKg: 20.3, notes: 'Temporary edited' }) })
  const medicinePayload = { householdId, childId: child.id, episodeId: episode.id, name: 'Codex Test Medicine', description: 'Temporary', dosage: '5 ml', frequency: 'every 6 hours', notes: 'Temporary', startDate: new Date().toISOString(), endDate: null, isPrn: false, activeIngredient: 'Test ingredient', formulation: 'liquid', concentration: '100 mg / 5 ml', doseAmount: 5, doseUnit: 'ml', minGapHours: 6, maxDosesPer24h: 4, scheduleSource: 'PACKAGING', scheduleSourceNotes: 'Temporary verification' }
  const medicine = await ok('/api/mobile/v1/medicine/medicines', token, { method: 'POST', body: JSON.stringify(medicinePayload) })
  await ok('/api/mobile/v1/medicine/medicines', token, { method: 'PUT', body: JSON.stringify({ ...medicinePayload, id: medicine.id, description: 'Temporary edited' }) })
  const doseTime = new Date().toISOString()
  const doseOne = await ok('/api/mobile/v1/medicine/doses', token, { method: 'POST', body: JSON.stringify({ householdId, childId: child.id, medicineId: medicine.id, episodeId: episode.id, dosage: '5 ml', takenAt: doseTime, notes: 'Temporary' }) })
  const blockedDose = await api('/api/mobile/v1/medicine/doses', token, { method: 'POST', body: JSON.stringify({ householdId, childId: child.id, medicineId: medicine.id, episodeId: episode.id, dosage: '5 ml', takenAt: new Date(Date.now() + 60_000).toISOString() }) })
  expect(blockedDose.response.status === 409 && blockedDose.body.warnings?.length, 'Dose safety warning was not enforced')
  const doseTwo = await ok('/api/mobile/v1/medicine/doses', token, { method: 'POST', body: JSON.stringify({ householdId, childId: child.id, medicineId: medicine.id, episodeId: episode.id, dosage: '5 ml', takenAt: new Date(Date.now() + 60_000).toISOString(), force: true, warningReason: 'Automated factual-record test' }) })
  await ok('/api/mobile/v1/medicine/episodes', token, { method: 'PATCH', body: JSON.stringify({ householdId, id: episode.id, action: 'close' }) })
  await ok('/api/mobile/v1/medicine/episodes', token, { method: 'PATCH', body: JSON.stringify({ householdId, id: episode.id, action: 'continue' }) })

  const richJson = { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Temporary heading' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Bold text', marks: [{ type: 'bold' }] }] }] }
  const note = await ok('/api/mobile/v1/notes', token, { method: 'POST', body: JSON.stringify({ householdId, title: `Codex rich note ${suffix}`, contentText: 'Temporary heading Bold text', contentJson: richJson, isShared: true, color: 'blue' }) })
  noteId = note.note.id
  expect(note.note.mobilePlainText === false, 'Rich note was incorrectly marked plain')
  await ok(`/api/mobile/v1/notes/${noteId}`, token, { method: 'PATCH', body: JSON.stringify({ householdId, title: `Codex rich note edited ${suffix}`, contentText: 'Edited rich note', contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited rich note', marks: [{ type: 'italic' }] }] }] } }) })
  const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nxoAAAAASUVORK5CYII='
  const attachment = await ok('/api/mobile/v1/notes/attachments', token, { method: 'POST', body: JSON.stringify({ noteId, base64: onePixelPng }) })
  await ok('/api/mobile/v1/notes/attachments', token, { method: 'DELETE', body: JSON.stringify({ noteId, attachmentId: attachment.attachment.id }) })
  await ok(`/api/mobile/v1/notes/${noteId}`, token, { method: 'DELETE', body: JSON.stringify({ householdId }) })
  noteId = null

  await ok('/api/mobile/v1/medicine/doses', token, { method: 'DELETE', body: JSON.stringify({ householdId, id: doseTwo.id }) })
  await ok('/api/mobile/v1/medicine/doses', token, { method: 'DELETE', body: JSON.stringify({ householdId, id: doseOne.id }) })
  await ok('/api/mobile/v1/medicine/fever', token, { method: 'DELETE', body: JSON.stringify({ householdId, id: fever.id }) })
  await ok('/api/mobile/v1/medicine/weights', token, { method: 'DELETE', body: JSON.stringify({ householdId, id: weight.id }) })
  await ok('/api/mobile/v1/medicine/medicines', token, { method: 'DELETE', body: JSON.stringify({ householdId, id: medicine.id }) })
  console.log('Mobile navigation/family/health/rich-notes API smoke test passed; temporary records were removed.')
} finally {
  if (noteId) {
    const attachments = await prisma.noteAttachment.findMany({ where: { noteId }, select: { filename: true } }).catch(() => [])
    const dir = path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), 'notes')
    for (const attachment of attachments) { const file = path.join(dir, attachment.filename); if (file.startsWith(`${dir}${path.sep}`) && fs.existsSync(file)) fs.unlinkSync(file) }
  }
  if (householdId) await prisma.household.deleteMany({ where: { id: householdId } })
  if (sessionId) await prisma.mobileSession.deleteMany({ where: { id: sessionId } })
  if (ownerId || memberId) await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId].filter(Boolean) } } })
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, memberEmail, badRegistrationEmail] } } })
  await prisma.$disconnect()
}
