import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { prisma } from './prisma'
import { DEMO_EMAIL_DOMAIN, DEMO_TTL_HOURS } from './demo'
import { dateOnlyToDb } from './chore-recurrence'
import { findBestCanonicalProduct } from './catalog-lookup'

function localDateOnly(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toLocaleDateString('en-CA')
}

function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

const SHOPPING_ITEMS = [
  'Fresh milk 1l', 'Eggs', 'Bananas', 'Chicken breast', 'Pasta rigatoni',
  'Toilet paper', 'Olive oil', 'Tomatoes', 'Greek yoghurt', 'Bread',
]

const RECIPES: Array<{ name: string; servings: number; ingredients: Array<{ name: string; quantity: number; unit?: string }> }> = [
  {
    name: 'Stuffat tal-fenek (rabbit stew)',
    servings: 4,
    ingredients: [
      { name: 'Rabbit', quantity: 1 },
      { name: 'Tomatoes', quantity: 4 },
      { name: 'Red wine', quantity: 1 },
      { name: 'Potatoes', quantity: 1, unit: 'kg' },
      { name: 'Peas', quantity: 1 },
    ],
  },
  {
    name: 'Timpana',
    servings: 6,
    ingredients: [
      { name: 'Pasta rigatoni', quantity: 2 },
      { name: 'Minced beef', quantity: 1, unit: 'kg' },
      { name: 'Puff pastry', quantity: 1 },
      { name: 'Eggs', quantity: 1 },
      { name: 'Tomato paste', quantity: 1 },
    ],
  },
  {
    name: 'Grilled lampuki with capers',
    servings: 4,
    ingredients: [
      { name: 'Fresh fish', quantity: 4 },
      { name: 'Capers', quantity: 1 },
      { name: 'Lemon', quantity: 2 },
      { name: 'Olive oil', quantity: 1 },
    ],
  },
  {
    name: 'Ftira night',
    servings: 4,
    ingredients: [
      { name: 'Ftira bread', quantity: 2 },
      { name: 'Tuna', quantity: 2 },
      { name: 'Tomatoes', quantity: 3 },
      { name: 'Olives', quantity: 1 },
      { name: 'Capers', quantity: 1 },
    ],
  },
]

const CHORES: Array<{ title: string; recurrenceType: 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'; daysOfWeek?: number[]; intervalDays?: number; dayOfMonth?: number }> = [
  { title: 'Take out the recycling', recurrenceType: 'WEEKLY', daysOfWeek: [2, 5] },
  { title: 'Water the plants', recurrenceType: 'EVERY_N_DAYS', intervalDays: 2 },
  { title: 'Clean the bathroom', recurrenceType: 'WEEKLY', daysOfWeek: [6] },
  { title: 'Change the bedsheets', recurrenceType: 'WEEKLY', daysOfWeek: [7] },
  { title: 'Pay the water & electricity bill', recurrenceType: 'MONTHLY', dayOfMonth: 28 },
]

export interface DemoCredentials {
  email: string
  password: string
}

/** Create a fully furnished, expiring demo household for one visitor. */
export async function createDemoHousehold(): Promise<DemoCredentials> {
  const password = randomBytes(18).toString('base64url')
  const passwordHash = await bcrypt.hash(password, 12)
  const suffix = randomBytes(6).toString('hex')
  const email = `demo-${suffix}@${DEMO_EMAIL_DOMAIN}`
  const expiresAt = new Date(Date.now() + DEMO_TTL_HOURS * 3600 * 1000)

  const owner = await prisma.user.create({
    data: { name: 'Sam Borg', email, password: passwordHash, isDemo: true, demoExpiresAt: expiresAt },
  })
  const household = await prisma.household.create({
    data: { name: 'The Borg family', ownerId: owner.id },
  })
  await prisma.membership.create({ data: { userId: owner.id, householdId: household.id, role: 'OWNER' } })
  await prisma.user.update({ where: { id: owner.id }, data: { activeHouseholdId: household.id } })

  // Phantom family members make the household feel lived-in.
  const phantoms = await Promise.all(['Maria Borg', 'Luca Borg'].map((name, index) =>
    prisma.user.create({
      data: {
        name,
        email: `demo-${suffix}-m${index}@${DEMO_EMAIL_DOMAIN}`,
        password: passwordHash,
        isDemo: true,
        demoExpiresAt: expiresAt,
      },
    }),
  ))
  for (const phantom of phantoms) {
    await prisma.membership.create({ data: { userId: phantom.id, householdId: household.id, role: 'MEMBER' } })
    await prisma.user.update({ where: { id: phantom.id }, data: { activeHouseholdId: household.id } })
  }
  const maria = phantoms[0]

  // Shopping list linked to real catalogue products where possible.
  const list = await prisma.shoppingList.create({ data: { householdId: household.id, name: 'Weekly shop' } })
  for (const [index, title] of SHOPPING_ITEMS.entries()) {
    const match = await findBestCanonicalProduct(title).catch(() => null)
    await prisma.shoppingItem.create({
      data: {
        listId: list.id,
        title: match?.displayName || title,
        quantityCount: 1,
        canonicalProductId: match?.id || null,
        createdById: index % 3 === 0 ? maria.id : owner.id,
        status: index < 8 ? 'ACTIVE' : 'DONE',
        doneById: index < 8 ? null : maria.id,
        doneAt: index < 8 ? null : new Date(),
      },
    })
  }

  // Recipes with catalogue-linked ingredients, and dinners planned around today.
  const recipeIds: string[] = []
  for (const recipe of RECIPES) {
    const created = await prisma.recipe.create({
      data: {
        householdId: household.id,
        name: recipe.name,
        servings: recipe.servings,
        ingredients: {
          create: await Promise.all(recipe.ingredients.map(async (ingredient, index) => {
            const match = await findBestCanonicalProduct(ingredient.name).catch(() => null)
            return {
              name: match?.displayName || ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit || null,
              canonicalProductId: match?.id || null,
              sortOrder: index,
            }
          })),
        },
      },
    })
    recipeIds.push(created.id)
  }
  for (const [index, offset] of [0, 1, 2, 4, 5].entries()) {
    await prisma.mealPlanEntry.create({
      data: {
        householdId: household.id,
        date: dateOnlyToDb(localDateOnly(offset)),
        slot: 'DINNER',
        recipeId: recipeIds[index % recipeIds.length],
      },
    })
  }

  // Chores with two weeks of history so the log has life in it.
  for (const chore of CHORES) {
    const created = await prisma.chore.create({
      data: {
        householdId: household.id,
        title: chore.title,
        recurrenceType: chore.recurrenceType,
        daysOfWeek: chore.daysOfWeek || [],
        intervalDays: chore.intervalDays || null,
        anchorDate: chore.recurrenceType === 'EVERY_N_DAYS' ? dateOnlyToDb(localDateOnly(-14)) : null,
        dayOfMonth: chore.dayOfMonth || null,
        assigneeId: chore.title.includes('plants') ? maria.id : null,
      },
    })
    for (let offset = -14; offset < 0; offset++) {
      const date = localDateOnly(offset)
      const due = chore.recurrenceType === 'WEEKLY'
        ? (chore.daysOfWeek || []).includes(isoWeekday(date))
        : chore.recurrenceType === 'EVERY_N_DAYS'
          ? (14 + offset) % (chore.intervalDays || 2) === 0
          : Number(date.slice(8)) === Math.min(chore.dayOfMonth || 28, 28)
      if (!due) continue
      // Realistic families miss a chore now and then.
      if ((offset + date.length) % 5 === 0) continue
      await prisma.choreCompletion.create({
        data: {
          choreId: created.id,
          dueDate: dateOnlyToDb(date),
          status: 'DONE',
          completedById: offset % 2 === 0 ? owner.id : maria.id,
        },
      })
    }
  }

  // Notes.
  await prisma.note.create({
    data: {
      title: 'Wi-Fi & door codes',
      content: 'Wi-Fi: BorgFamily5G / kannoli2026. Front door code: 4415. Nanna has a spare key.',
      contentText: 'Wi-Fi: BorgFamily5G / kannoli2026. Front door code: 4415. Nanna has a spare key.',
      isShared: true,
      isPinned: true,
      color: 'blue',
      createdById: owner.id,
      householdId: household.id,
    },
  })
  await prisma.note.create({
    data: {
      title: 'Babysitter brief for Saturday',
      content: 'Nina eats at 18:30, bath at 19:15, one story, lights out by 20:00. Emergency: +356 7900 0000.',
      contentText: 'Nina eats at 18:30, bath at 19:15, one story, lights out by 20:00. Emergency: +356 7900 0000.',
      isShared: true,
      color: 'yellow',
      createdById: maria.id,
      householdId: household.id,
    },
  })

  return { email, password }
}
