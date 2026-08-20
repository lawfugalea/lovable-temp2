import assert from 'node:assert/strict'

const baseUrl = (process.env.HOUSEFLOW_TEST_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '')
const password = 'HouseFlow-Test7!'

class Client {
  constructor(ip) {
    this.ip = ip
    this.cookies = new Map()
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers || {})
    headers.set('x-forwarded-for', this.ip)
    if (this.cookies.size) {
      headers.set('cookie', [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '))
    }
    let body = options.body
    if (body && typeof body !== 'string' && !(body instanceof URLSearchParams) && !(body instanceof FormData)) {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(body)
    }
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      body,
      redirect: options.redirect || 'manual',
    })
    const setCookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : [])
    for (const setCookie of setCookies) {
      if (!setCookie) continue
      const [pair] = setCookie.split(';', 1)
      const separator = pair.indexOf('=')
      if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
    return response
  }
}

async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function expect(client, path, options, expectedStatus, label) {
  const response = await client.request(path, options)
  const body = await readBody(response)
  assert.equal(
    response.status,
    expectedStatus,
    `${label}: expected ${expectedStatus}, received ${response.status}: ${JSON.stringify(body)}`,
  )
  return body
}

/**
 * Solve the signup security check the way a person does.
 *
 * The answer is held server-side and never sent to the client, so the only way
 * through is to read the question and do the arithmetic. Registration also
 * requires explicit Terms acceptance. This suite predates both controls and had
 * been failing at the first register call ever since they were added — it is not
 * in CI, so nothing reported it.
 */
async function solveCaptcha(client) {
  const challenge = await expect(client, '/api/captcha/challenge', {}, 200, 'load captcha challenge')
  const match = /^\s*(\d+)\s*([+\-×])\s*(\d+)\s*=/.exec(challenge.question)
  assert.ok(match, `unparsable captcha question: ${challenge.question}`)
  const [, left, operator, right] = match
  const a = Number(left)
  const b = Number(right)
  const answer = operator === '+' ? a + b : operator === '-' ? a - b : a * b
  return { captchaId: challenge.id, captchaAnswer: String(answer) }
}

async function register(client, name, email) {
  const { captchaId, captchaAnswer } = await solveCaptcha(client)
  const body = await expect(client, '/api/register', {
    method: 'POST',
    body: { name, email, password, captchaId, captchaAnswer, acceptedTerms: true },
  }, 201, `register ${email}`)
  return body.user
}

async function signIn(client, email) {
  const csrf = await expect(client, '/api/auth/csrf', {}, 200, `load CSRF for ${email}`)
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}/dashboard`,
    json: 'true',
  })
  const result = await expect(client, '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  }, 200, `sign in ${email}`)
  assert.ok(!String(result?.url || '').includes('error='), `credentials rejected for ${email}`)
  const session = await expect(client, '/api/auth/session', {}, 200, `session for ${email}`)
  assert.equal(session.user.email, email)
}

const owner = new Client('198.51.100.11')
const member = new Client('198.51.100.12')
const outsider = new Client('198.51.100.13')
const deletedCoOwner = new Client('198.51.100.14')
const removedMember = new Client('198.51.100.15')
const anonymous = new Client('198.51.100.16')
const ownerEmail = 'owner.integration@example.test'
const memberEmail = 'member.integration@example.test'
const outsiderEmail = 'outsider.integration@example.test'
const deletedCoOwnerEmail = 'deleted-co-owner.integration@example.test'
const removedMemberEmail = 'removed-member.integration@example.test'

await expect(owner, '/api/health', {}, 200, 'database health check')
await expect(anonymous, '/api/prices/search?q=milk', {}, 401, 'block anonymous catalogue search')
const ownerUser = await register(owner, 'Owner Integration', ownerEmail)
const memberUser = await register(member, 'Member Integration', memberEmail)
await register(outsider, 'Outsider Integration', outsiderEmail)
const deletedCoOwnerUser = await register(deletedCoOwner, 'Deleted Co-owner', deletedCoOwnerEmail)
const removedMemberUser = await register(removedMember, 'Removed Member', removedMemberEmail)
await signIn(owner, ownerEmail)
await signIn(member, memberEmail)
await signIn(outsider, outsiderEmail)
await signIn(deletedCoOwner, deletedCoOwnerEmail)
await signIn(removedMember, removedMemberEmail)

const ownerHousehold = await expect(owner, '/api/household/create', {
  method: 'POST',
  body: { name: 'Integration Home', type: 'family' },
}, 201, 'owner creates household')
const householdId = ownerHousehold.householdId
assert.equal(ownerHousehold.name, 'Integration Home')

const outsiderHousehold = await expect(outsider, '/api/household/create', {
  method: 'POST',
  body: { name: 'Outsider Home', type: 'personal' },
}, 201, 'outsider creates separate household')
assert.notEqual(outsiderHousehold.householdId, householdId)

let active = await expect(owner, '/api/household/active', {}, 200, 'load active household')
assert.deepEqual({ name: active.name, role: active.role }, { name: 'Integration Home', role: 'OWNER' })
await expect(owner, '/api/household/active', {
  method: 'PATCH',
  body: { householdId, name: 'Integration Family' },
}, 200, 'rename household')
active = await expect(owner, '/api/household/active', {}, 200, 'load renamed household')
assert.equal(active.name, 'Integration Family')

const shopping = await expect(owner, '/api/shopping/lists', {
  method: 'POST',
  body: { name: 'Weekly essentials' },
}, 200, 'create shopping list')
const listId = shopping.list.id
const shoppingItem = await expect(owner, '/api/shopping/items', {
  method: 'POST',
  body: { listId, title: 'Milk', qty: 'large carton', quantityCount: 2, price: 250, productUrl: 'https://example.test/milk' },
}, 200, 'create shopping item')
assert.equal(shoppingItem.item.quantityCount, 2)
const updatedShoppingItem = await expect(owner, `/api/shopping/items/${shoppingItem.item.id}`, {
  method: 'PATCH',
  body: { quantityCount: 3 },
}, 200, 'update structured shopping quantity')
assert.equal(updatedShoppingItem.item.quantityCount, 3)
// Price comparison is a Family-plan feature, so a brand-new household must be
// refused. This assertion used to expect 200, which quietly passed over the
// paywall entirely — and could only ever have passed on a comped household.
const paywalled = await expect(
  owner,
  `/api/shopping/compare?listId=${encodeURIComponent(listId)}`,
  {}, 403, 'free household is refused price comparison',
)
assert.equal(paywalled.code, 'upgrade_required')

// Comp this household onto Family through the admin override, which is also the
// only HTTP path to a Family plan that does not involve Stripe. The owner is the
// configured administrator in this environment.
await expect(owner, '/api/admin/billing', {
  method: 'POST',
  body: { householdId, plan: 'FAMILY' },
}, 200, 'admin comps the household onto Family')

const comparison = await expect(owner, `/api/shopping/compare?listId=${encodeURIComponent(listId)}`, {}, 200, 'compare shopping list')
assert.equal(comparison.items[0].matchStatus, 'UNMATCHED')
assert.equal(comparison.mixed.coverageCount, 0)
await expect(outsider, `/api/shopping/items?listId=${encodeURIComponent(listId)}`, {}, 403, 'block outsider list access')
await expect(outsider, `/api/shopping/compare?listId=${encodeURIComponent(listId)}`, {}, 403, 'block outsider comparison access')

const privateNote = await expect(owner, '/api/notes', {
  method: 'POST',
  body: { title: 'Private', content: 'Owner only', isShared: false, color: 'yellow' },
}, 201, 'create private note')
const sharedNote = await expect(owner, '/api/notes', {
  method: 'POST',
  body: { title: 'Shared', content: 'Household note', isShared: true, householdId, color: 'blue' },
}, 201, 'create shared note')
const privateNoteId = privateNote.note.id
const sharedNoteId = sharedNote.note.id

const imageForm = new FormData()
imageForm.set('noteId', sharedNoteId)
imageForm.set(
  'image',
  new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], { type: 'image/png' }),
  'tiny.png',
)
const uploadedImage = await expect(owner, '/api/uploads/note-image', {
  method: 'POST',
  body: imageForm,
}, 200, 'owner attaches an image to a shared note')
assert.match(uploadedImage.url, /\/api\/uploads\/note-image\?file=/)
await expect(owner, uploadedImage.url, {}, 200, 'note owner can load attached image')
await expect(outsider, uploadedImage.url, {}, 404, 'outsider cannot load attached image')

const revokedInvite = await expect(owner, '/api/household/invites', {
  method: 'POST',
  body: { householdId, email: null, role: 'MEMBER' },
}, 201, 'create link-only invite')
const revokedToken = new URL(revokedInvite.acceptUrl).searchParams.get('token')
assert.ok(revokedToken, 'link-only invite token missing')
await expect(owner, `/api/household/invites/${revokedInvite.id}/revoke`, {
  method: 'POST',
}, 200, 'revoke link-only invite')
await expect(removedMember, '/api/invites/accept-invite', {
  method: 'POST', body: { token: revokedToken },
}, 409, 'revoked invite cannot be accepted')

const removableInvite = await expect(owner, '/api/household/invites', {
  method: 'POST',
  body: { householdId, email: null, role: 'MEMBER' },
}, 201, 'create second link-only invite')
const removableToken = new URL(removableInvite.acceptUrl).searchParams.get('token')
assert.ok(removableToken, 'second link-only invite token missing')
await expect(removedMember, '/api/invites/accept-invite', {
  method: 'POST', body: { token: removableToken },
}, 200, 'member accepts link-only invite')
await expect(removedMember, uploadedImage.url, {}, 200, 'household member can load shared note image')
const removableMembers = await expect(owner, `/api/household/members?householdId=${encodeURIComponent(householdId)}`, {}, 200, 'load removable member')
const removableMembership = removableMembers.members.find(row => row.user.id === removedMemberUser.id)
assert.ok(removableMembership, 'removable membership missing')
await expect(owner, `/api/household/members/${removableMembership.id}/remove`, {
  method: 'POST',
}, 200, 'owner removes household member')
await expect(removedMember, uploadedImage.url, {}, 404, 'removed member immediately loses image access')

const invite = await expect(owner, '/api/household/invites', {
  method: 'POST',
  body: { householdId, email: memberEmail, role: 'MEMBER' },
}, 201, 'create targeted invite')
const token = new URL(invite.acceptUrl).searchParams.get('token')
assert.ok(token, 'invite token missing')
const resend = await expect(owner, `/api/household/invites/${invite.id}/resend`, {
  method: 'POST',
}, 502, 'resend exposes replacement link when mail is unavailable')
const replacementToken = new URL(resend.acceptUrl).searchParams.get('token')
assert.ok(replacementToken, 'replacement invite token missing')
await expect(owner, `/api/invites/validate?token=${encodeURIComponent(token)}`, {}, 404, 'resend invalidates old invite link')
const validated = await expect(owner, `/api/invites/validate?token=${encodeURIComponent(replacementToken)}`, {}, 200, 'validate replacement invite')
assert.equal(validated.valid, true)
assert.equal(validated.householdName, 'Integration Family')
await expect(outsider, '/api/invites/accept-invite', {
  method: 'POST', body: { token: replacementToken },
}, 403, 'block wrong account from accepting invite')
await expect(member, '/api/invites/accept-invite', {
  method: 'POST', body: { token: replacementToken },
}, 200, 'member accepts invite')
await expect(member, '/api/invites/accept-invite', {
  method: 'POST', body: { token: replacementToken },
}, 409, 'block invite replay')

const listedInvites = await expect(owner, `/api/household/invites?householdId=${encodeURIComponent(householdId)}`, {}, 200, 'list pending invites')
assert.equal(JSON.stringify(listedInvites).toLowerCase().includes('token'), false, 'household invite list leaked a token')
const adminInvites = await expect(owner, '/api/admin/invites', {}, 200, 'admin lists invites without bearer secrets')
assert.equal(JSON.stringify(adminInvites).toLowerCase().includes('token'), false, 'admin invite list leaked a token')

await expect(member, `/api/shopping/items?listId=${encodeURIComponent(listId)}`, {}, 200, 'member can access household list')
await expect(member, `/api/notes/${sharedNoteId}`, {}, 200, 'member can view shared note')
await expect(member, `/api/notes/${privateNoteId}`, {}, 404, 'member cannot view private note')
await expect(outsider, `/api/notes/${sharedNoteId}`, {}, 404, 'outsider cannot view shared note')
await expect(member, `/api/notes/${sharedNoteId}`, {
  method: 'PUT', body: { content: 'unauthorized edit' },
}, 404, 'viewer cannot edit shared note')
await expect(member, '/api/household/invites', {
  method: 'POST', body: { householdId, email: 'blocked@example.test', role: 'MEMBER' },
}, 403, 'member cannot invite')

await expect(owner, `/api/notes/${sharedNoteId}/collaborators`, {
  method: 'POST', body: { userId: memberUser.id, role: 'EDITOR' },
}, 201, 'owner grants note editor access')
await expect(member, `/api/notes/${sharedNoteId}`, {
  method: 'PUT', body: { content: 'authorized edit' },
}, 200, 'editor can update shared note')

const child = await expect(owner, '/api/medicine/children', {
  method: 'POST',
  body: { householdId, name: 'Test Child', dateOfBirth: '2020-01-01T00:00:00.000Z' },
}, 201, 'create child profile')
const episode = await expect(owner, '/api/medicine/episodes', {
  method: 'POST',
  body: { householdId, childId: child.id, title: 'Test illness episode', startedAt: '2026-07-15T08:00:00.000Z' },
}, 201, 'create illness episode')
const journalOnlyDose = await expect(owner, '/api/medicine/doses', {
  method: 'POST',
  body: {
    householdId,
    childId: child.id,
    medicineName: 'Journal-only Medicine',
    episodeId: episode.id,
    dosage: '2.5 ml',
    takenAt: '2026-07-15T08:30:00.000Z',
  },
}, 201, 'record a new medicine dose without setting up a schedule first')
assert.ok(journalOnlyDose.medicineId, 'journal-only dose did not create a saved medicine')
const medicine = await expect(owner, '/api/medicine/medicines', {
  method: 'POST',
  body: {
    householdId,
    childId: child.id,
    name: 'Test Medicine',
    dosage: '5 ml',
    doseAmount: 5,
    doseUnit: 'ml',
    activeIngredient: 'test ingredient',
    formulation: 'oral liquid',
    concentration: 'test concentration',
    frequency: 'every 8 hours',
    minGapHours: 8,
    maxDosesPer24h: 3,
    scheduleSource: 'PACKAGING',
    episodeId: episode.id,
    startDate: '2026-07-15T08:00:00.000Z',
  },
}, 201, 'create medicine schedule')
const visibleMedicines = await expect(member, `/api/medicine/medicines?householdId=${encodeURIComponent(householdId)}`, {}, 200, 'member can view saved medicines')
const journalOnlyMedicine = visibleMedicines.find(item => item.id === journalOnlyDose.medicineId)
assert.ok(journalOnlyMedicine, 'journal-only medicine is missing')
assert.equal(journalOnlyMedicine.scheduleVerifiedAt, null, 'journal-only medicine unexpectedly enabled timing checks')
await expect(owner, '/api/medicine/doses', {
  method: 'POST',
  body: {
    householdId,
    childId: child.id,
    medicineId: journalOnlyMedicine.id,
    episodeId: episode.id,
    dosage: '2.5 ml',
    takenAt: '2026-07-15T14:30:00.000Z',
  },
}, 201, 'record another dose for a saved medicine without a schedule')
await expect(outsider, `/api/medicine/medicines?householdId=${encodeURIComponent(householdId)}`, {}, 403, 'outsider cannot view saved medicines')
await expect(owner, '/api/medicine/doses', {
  method: 'POST',
  body: {
    householdId,
    childId: child.id,
    medicineId: medicine.id,
    episodeId: episode.id,
    dosage: '5 ml',
    takenAt: '2026-07-15T08:00:00.000Z',
  },
}, 201, 'record medicine dose')
const blockedDose = await expect(owner, '/api/medicine/doses', {
  method: 'POST',
  body: {
    householdId,
    childId: child.id,
    medicineId: medicine.id,
    episodeId: episode.id,
    dosage: '5 ml',
    takenAt: '2026-07-15T09:00:00.000Z',
  },
}, 409, 'warn when a dose is recorded before the verified minimum gap')
assert.ok(Array.isArray(blockedDose.warnings) && blockedDose.warnings.some(warning => warning.kind === 'too-early'))
await expect(owner, '/api/medicine/doses', {
  method: 'POST',
  body: {
    householdId,
    childId: child.id,
    medicineId: medicine.id,
    episodeId: episode.id,
    dosage: '5 ml',
    takenAt: '2026-07-15T09:00:00.000Z',
    force: true,
    warningReason: 'Integration test acknowledgement',
  },
}, 201, 'preserve an explicitly acknowledged administration')
await expect(owner, '/api/medicine/fever-readings', {
  method: 'POST',
  body: {
    householdId,
    childId: child.id,
    episodeId: episode.id,
    temperature: 38.2,
    unit: 'C',
    method: 'forehead',
    takenAt: '2026-07-15T09:00:00.000Z',
  },
}, 201, 'record fever reading')
await expect(owner, '/api/medicine/weights', {
  method: 'POST',
  body: { householdId, childId: child.id, weightKg: 18.4, measuredAt: '2026-07-15T09:05:00.000Z' },
}, 201, 'record child weight')
const journal = await expect(owner, `/api/medicine/journal?householdId=${encodeURIComponent(householdId)}&childId=${encodeURIComponent(child.id)}`, {}, 200, 'load combined child health journal')
assert.equal(journal.episodes.length, 1)
assert.equal(journal.events.filter(event => event.type === 'dose').length, 4)
assert.equal(journal.events.filter(event => event.type === 'temperature').length, 1)
await expect(member, `/api/medicine/journal?householdId=${encodeURIComponent(householdId)}`, {}, 200, 'household member can view health journal')
await expect(outsider, `/api/medicine/journal?householdId=${encodeURIComponent(householdId)}`, {}, 403, 'outsider cannot view health journal')
await expect(outsider, `/api/medicine/fever-readings?householdId=${encodeURIComponent(householdId)}`, {}, 403, 'outsider cannot view fever history')

const members = await expect(owner, `/api/household/members?householdId=${encodeURIComponent(householdId)}`, {}, 200, 'load household members')
const memberMembership = members.members.find(row => row.user.id === memberUser.id)
assert.ok(memberMembership, 'accepted member is missing')
await expect(owner, `/api/household/members/${memberMembership.id}/role`, {
  method: 'PATCH', body: { role: 'OWNER' },
}, 200, 'promote member to co-owner')

const deleteCandidateInvite = await expect(owner, '/api/household/invites', {
  method: 'POST',
  body: { householdId, email: deletedCoOwnerEmail, role: 'OWNER' },
}, 201, 'invite another co-owner')
const deleteCandidateToken = new URL(deleteCandidateInvite.acceptUrl).searchParams.get('token')
assert.ok(deleteCandidateToken, 'co-owner invite token missing')
await expect(deletedCoOwner, '/api/invites/accept-invite', {
  method: 'POST', body: { token: deleteCandidateToken },
}, 200, 'second co-owner accepts invite')
await expect(owner, '/api/admin/users', {
  method: 'DELETE', body: { userId: deletedCoOwnerUser.id },
}, 200, 'admin deletes co-owner without deleting household')
active = await expect(owner, '/api/household/active', {}, 200, 'household survives co-owner account deletion')
assert.equal(active.householdId, householdId)
await expect(deletedCoOwner, '/api/household/active', {}, 401, 'deleted co-owner session is invalidated')

const duplicateInvites = await Promise.all([
  owner.request('/api/household/invites', {
    method: 'POST', body: { householdId, email: 'duplicate.integration@example.test', role: 'MEMBER' },
  }),
  owner.request('/api/household/invites', {
    method: 'POST', body: { householdId, email: 'duplicate.integration@example.test', role: 'MEMBER' },
  }),
])
assert.deepEqual(duplicateInvites.map(response => response.status).sort(), [201, 409], 'concurrent duplicate invite was not blocked')

await expect(member, '/api/household/leave', {
  method: 'POST', body: { householdId },
}, 200, 'co-owner leaves while another owner remains')
await expect(member, '/api/household/active', {}, 404, 'departed member has no active household')
await expect(member, `/api/notes/${sharedNoteId}`, {}, 404, 'departed member note access is revoked')
await expect(member, uploadedImage.url, {}, 404, 'departed member image access is revoked')
await expect(owner, '/api/household/leave', {
  method: 'POST', body: { householdId },
}, 409, 'final owner cannot leave')

const exported = await expect(owner, '/api/account/export', {}, 200, 'export account data')
assert.equal(exported.user.email, ownerEmail)
assert.equal('password' in exported.user, false)
assert.equal(JSON.stringify(exported).toLowerCase().includes('token'), false)
assert.equal(ownerUser.email, ownerEmail)

console.log('Critical household, invite, shopping, medicine, notes, admin, export, and concurrency workflows passed.')
