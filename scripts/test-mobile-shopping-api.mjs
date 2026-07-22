import { createHash, randomBytes } from 'node:crypto'
import process from 'node:process'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { encode } from 'next-auth/jwt'

const envFile = process.env.CLANKEEP_ENV_FILE
if (!envFile) throw new Error('CLANKEEP_ENV_FILE must point to an existing ignored server environment file')
const loaded = dotenv.config({ path: envFile, override: false })
if (loaded.error) throw new Error('Could not load the configured server environment file')

const apiBaseUrl = process.env.CLANKEEP_MOBILE_API_URL || 'http://127.0.0.1:3001'
const secret = process.env.NEXTAUTH_SECRET
if (!secret) throw new Error('NEXTAUTH_SECRET is required')

const prisma = new PrismaClient()
let sessionId = null
let listId = null

async function api(path, token, init) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${init?.method || 'GET'} ${path} failed with ${response.status}: ${body.error || 'unknown error'}`)
  return body
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

try {
  const user = await prisma.user.findFirst({
    where: { memberships: { some: {} } },
    select: { id: true, email: true, name: true, password: true, isDemo: true, memberships: { take: 1, select: { householdId: true } } },
  })
  if (!user?.password || !user.memberships[0]) throw new Error('No eligible household member exists for the smoke test')
  const passwordVersion = createHash('sha256').update(user.password).digest('base64url')
  const session = await prisma.mobileSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: createHash('sha256').update(randomBytes(48)).digest('base64url'),
      passwordVersion,
      deviceName: 'Automated mobile shopping smoke test',
      platform: 'ios',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  })
  sessionId = session.id
  const token = await encode({
    secret,
    maxAge: 10 * 60,
    token: {
      sub: user.id,
      email: user.email,
      name: user.name ?? user.email,
      isAdmin: false,
      isDemo: user.isDemo,
      passwordVersion,
      mobileSessionId: session.id,
      tokenType: 'mobile-access',
    },
  })
  const householdId = user.memberships[0].householdId
  const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`
  const createdList = await api('/api/mobile/v1/shopping/lists', token, {
    method: 'POST', body: JSON.stringify({ householdId, name: `Codex mobile smoke ${suffix}` }),
  })
  listId = createdList.list.id
  const renamed = await api(`/api/mobile/v1/shopping/lists/${encodeURIComponent(listId)}`, token, {
    method: 'PATCH', body: JSON.stringify({ name: `Codex mobile renamed ${suffix}` }),
  })
  expect(renamed.list.name === `Codex mobile renamed ${suffix}`, 'List rename did not persist')
  const lists = await api(`/api/mobile/v1/shopping/lists?householdId=${encodeURIComponent(householdId)}`, token)
  expect(lists.lists.some(list => list.id === listId), 'Created list was not returned')

  const createdItem = await api(`/api/mobile/v1/shopping/lists/${encodeURIComponent(listId)}/items`, token, {
    method: 'POST', body: JSON.stringify({ title: 'Temporary milk', qty: '2 L', quantityCount: 2 }),
  })
  const itemId = createdItem.item.id
  const updated = await api(`/api/mobile/v1/shopping/items/${encodeURIComponent(itemId)}`, token, {
    method: 'PATCH', body: JSON.stringify({ status: 'DONE', quantityCount: 3 }),
  })
  expect(updated.item.status === 'DONE' && updated.item.quantityCount === 3, 'Item update did not persist')
  const items = await api(`/api/mobile/v1/shopping/lists/${encodeURIComponent(listId)}/items`, token)
  expect(items.items.length === 1 && items.list.doneItemCount === 1, 'Item/list response counts are incorrect')
  await api(`/api/mobile/v1/shopping/items/${encodeURIComponent(itemId)}`, token, { method: 'DELETE' })
  const empty = await api(`/api/mobile/v1/shopping/lists/${encodeURIComponent(listId)}/items`, token)
  expect(empty.items.length === 0, 'Deleted item is still present')
  await api(`/api/mobile/v1/shopping/lists/${encodeURIComponent(listId)}`, token, { method: 'DELETE' })
  const removedId = listId
  listId = null
  const afterDelete = await api(`/api/mobile/v1/shopping/lists?householdId=${encodeURIComponent(householdId)}`, token)
  expect(!afterDelete.lists.some(list => list.id === removedId), 'Deleted list is still present')
  console.log('Mobile shopping API smoke test passed; temporary records will be removed.')
} finally {
  if (listId) await prisma.shoppingList.deleteMany({ where: { id: listId } })
  if (sessionId) await prisma.mobileSession.deleteMany({ where: { id: sessionId } })
  await prisma.$disconnect()
}
