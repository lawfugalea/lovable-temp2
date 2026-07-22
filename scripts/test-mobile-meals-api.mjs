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
const testDate = '2099-01-05'
let sessionId = null
let recipeId = null
let listId = null
let householdId = null

async function api(path, token, init) {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${init?.method || 'GET'} ${path} failed with ${response.status}: ${body.error || 'unknown error'}`)
  return body
}
function expect(condition, message) { if (!condition) throw new Error(message) }

try {
  const user = await prisma.user.findFirst({
    where: { memberships: { some: {} } },
    select: { id: true, email: true, name: true, password: true, isDemo: true, memberships: { take: 1, select: { householdId: true } } },
  })
  if (!user?.password || !user.memberships[0]) throw new Error('No eligible household member exists for the smoke test')
  householdId = user.memberships[0].householdId
  const occupied = await prisma.mealPlanEntry.count({ where: { householdId, date: new Date(`${testDate}T00:00:00Z`), slot: 'DINNER' } })
  if (occupied) throw new Error('Refusing smoke test because the reserved future meal date is occupied')
  const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`
  const list = await prisma.shoppingList.create({ data: { householdId, name: `Codex meal list ${suffix}` } })
  listId = list.id
  const passwordVersion = createHash('sha256').update(user.password).digest('base64url')
  const session = await prisma.mobileSession.create({ data: {
    userId: user.id, refreshTokenHash: createHash('sha256').update(randomBytes(48)).digest('base64url'), passwordVersion,
    deviceName: 'Automated mobile meals smoke test', platform: 'ios', expiresAt: new Date(Date.now() + 600_000),
  } })
  sessionId = session.id
  const token = await encode({ secret, maxAge: 600, token: {
    sub: user.id, email: user.email, name: user.name ?? user.email, isAdmin: false, isDemo: user.isDemo,
    passwordVersion, mobileSessionId: session.id, tokenType: 'mobile-access',
  } })
  const createdRecipe = await api('/api/mobile/v1/meals/recipes', token, { method: 'POST', body: JSON.stringify({ householdId, name: `Codex mobile meal smoke ${suffix}`, servings: 2, notes: 'Temporary recipe', ingredients: [{ name: 'Temporary tomatoes', quantity: 2, unit: 'pcs' }] }) })
  recipeId = createdRecipe.recipe.id
  const recipeList = await api(`/api/mobile/v1/meals/recipes?householdId=${encodeURIComponent(householdId)}`, token)
  expect(recipeList.recipes.some(row => row.id === recipeId && row.ingredients.length === 1), 'Created recipe was not returned')
  const updatedRecipe = await api(`/api/mobile/v1/meals/recipes/${encodeURIComponent(recipeId)}`, token, { method: 'PATCH', body: JSON.stringify({ householdId, name: `Codex mobile meal renamed ${suffix}`, servings: 3, notes: '', ingredients: [{ name: 'Temporary tomatoes', quantity: 2, unit: 'pcs' }] }) })
  expect(updatedRecipe.recipe.servings === 3, 'Recipe update did not persist')
  const weekPath = `/api/mobile/v1/meals/week?householdId=${encodeURIComponent(householdId)}&from=${testDate}&to=${testDate}`
  let week = await api(weekPath, token)
  expect(week.recipes.some(row => row.id === recipeId && row.ingredientCount === 1), 'Temporary recipe was not listed')
  await api('/api/mobile/v1/meals/week', token, { method: 'PUT', body: JSON.stringify({ householdId, date: testDate, recipeId }) })
  week = await api(weekPath, token)
  expect(week.entries.some(row => row.date === testDate && row.recipe?.id === recipeId), 'Recipe dinner was not planned')
  const generated = await api('/api/mobile/v1/meals/generate-shopping', token, { method: 'POST', body: JSON.stringify({ householdId, from: testDate, to: testDate, listId }) })
  expect(generated.created === 1 && generated.plannedRecipeCount === 1, 'Recipe ingredients were not generated')
  const items = await prisma.shoppingItem.findMany({ where: { listId }, select: { title: true, quantityCount: true } })
  expect(items.length === 1 && items[0].title === 'Temporary tomatoes' && items[0].quantityCount === 2, 'Generated shopping item is incorrect')
  await api('/api/mobile/v1/meals/week', token, { method: 'PUT', body: JSON.stringify({ householdId, date: testDate, freeText: 'Temporary pizza night' }) })
  week = await api(weekPath, token)
  expect(week.entries.some(row => row.freeText === 'Temporary pizza night' && row.recipe === null), 'Free-text dinner did not replace recipe')
  await api('/api/mobile/v1/meals/week', token, { method: 'PUT', body: JSON.stringify({ householdId, date: testDate }) })
  week = await api(weekPath, token)
  expect(week.entries.length === 0, 'Cleared dinner is still present')
  await api(`/api/mobile/v1/meals/recipes/${encodeURIComponent(recipeId)}`, token, { method: 'DELETE', body: JSON.stringify({ householdId }) })
  recipeId = null
  console.log('Mobile meals API smoke test passed; temporary records will be removed.')
} finally {
  if (householdId) await prisma.mealPlanEntry.deleteMany({ where: { householdId, date: new Date(`${testDate}T00:00:00Z`), slot: 'DINNER' } })
  if (listId) await prisma.shoppingList.deleteMany({ where: { id: listId } })
  if (recipeId) await prisma.recipe.deleteMany({ where: { id: recipeId } })
  if (sessionId) await prisma.mobileSession.deleteMany({ where: { id: sessionId } })
  await prisma.$disconnect()
}
