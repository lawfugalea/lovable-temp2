/**
 * Creates the App Store / TestFlight beta review account.
 *
 * App Review sees only a login screen otherwise, which is an automatic
 * rejection. The account is a NORMAL account, not a demo one: `isDemo` blocks
 * mutations through `rejectDemoUser`, and a reviewer who cannot act — in
 * particular cannot exercise in-app account deletion, the thing guideline
 * 5.1.1(v) has them check — would reject anyway.
 *
 * Everything it contains is fabricated. No real household data is touched.
 * Re-running replaces the account cleanly.
 *
 * Usage:
 *   CLANKEEP_ENV_FILE=/var/www/clankeep/.env.deploy node scripts/create-app-review-account.mjs
 */
import process from 'node:process'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

const envFile = process.env.CLANKEEP_ENV_FILE
if (!envFile) throw new Error('CLANKEEP_ENV_FILE must point to the server environment file')
const loaded = dotenv.config({ path: envFile, override: false })
if (loaded.error) throw new Error(`Could not read ${envFile}`)

const EMAIL = 'appreview@clankeep.com'
const PASSWORD = process.env.APP_REVIEW_PASSWORD
if (!PASSWORD) throw new Error('APP_REVIEW_PASSWORD must be set so the password is never written into the repo')

const TERMS_VERSION = '2026-07-19'
const prisma = new PrismaClient()
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(12, 0, 0, 0); return d }

try {
  // Replace any previous review account so re-running is safe. The household
  // cascade removes everything this script created with it.
  const existing = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } })
  if (existing) {
    const owned = await prisma.membership.findMany({ where: { userId: existing.id, role: 'OWNER' }, select: { householdId: true } })
    for (const { householdId } of owned) {
      await prisma.user.updateMany({ where: { activeHouseholdId: householdId }, data: { activeHouseholdId: null } })
      await prisma.household.deleteMany({ where: { id: householdId } })
    }
    await prisma.user.delete({ where: { id: existing.id } })
    console.log('Removed the previous review account.')
  }

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      name: 'Alex Reviewer',
      password: await bcrypt.hash(PASSWORD, 12),
      isDemo: false,
      acceptedTermsAt: new Date(),
      termsVersion: TERMS_VERSION,
    },
  })

  const household = await prisma.household.create({
    data: {
      name: 'Reviewer Family',
      country: 'MT',
      ownerId: user.id,
      // Family entitlement so Finance is reachable during review.
      plan: 'FAMILY',
      planSource: 'ADMIN',
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  })
  await prisma.user.update({ where: { id: user.id }, data: { activeHouseholdId: household.id } })

  const list = await prisma.shoppingList.create({ data: { householdId: household.id, name: 'Weekly shop' } })
  await prisma.shoppingItem.createMany({
    data: [
      { listId: list.id, title: 'Milk', quantityCount: 2, createdById: user.id },
      { listId: list.id, title: 'Bread', quantityCount: 1, createdById: user.id },
      { listId: list.id, title: 'Apples', quantityCount: 6, createdById: user.id },
      { listId: list.id, title: 'Chicken breast', quantityCount: 1, createdById: user.id },
      { listId: list.id, title: 'Rice', quantityCount: 1, createdById: user.id },
    ],
  })

  await prisma.chore.createMany({
    data: [
      { householdId: household.id, title: 'Take out the bins', recurrenceType: 'WEEKLY', daysOfWeek: [1, 4] },
      { householdId: household.id, title: 'Hoover the living room', recurrenceType: 'WEEKLY', daysOfWeek: [6] },
      { householdId: household.id, title: 'Water the plants', recurrenceType: 'EVERY_N_DAYS', intervalDays: 3, anchorDate: day(-1) },
    ],
  })

  await prisma.note.create({
    data: {
      title: 'Weekend plans',
      content: '<p>Beach on Saturday if the weather holds. Call the grandparents on Sunday.</p>',
      householdId: household.id,
      isShared: true,
      createdById: user.id,
      color: 'blue',
    },
  })

  const child = await prisma.child.create({
    data: { householdId: household.id, name: 'Sam', dateOfBirth: new Date('2019-04-12T00:00:00.000Z') },
  })
  await prisma.medicine.create({
    data: {
      householdId: household.id,
      childId: child.id,
      name: 'Paracetamol suspension',
      dosage: '5 ml',
      frequency: 'every 6 hours',
      startDate: day(-2),
      isActive: true,
    },
  })

  await prisma.incomeSource.create({ data: { householdId: household.id, userId: user.id, label: 'Salary', amountCents: 240000, frequency: 'MONTHLY' } })
  await prisma.commitment.createMany({
    data: [
      { householdId: household.id, userId: user.id, label: 'Rent', amountCents: 85000, frequency: 'MONTHLY', category: 'housing', essential: true },
      { householdId: household.id, userId: user.id, label: 'Electricity', amountCents: 9000, frequency: 'MONTHLY', category: 'utilities', essential: true },
    ],
  })
  await prisma.savingsGoal.create({ data: { householdId: household.id, name: 'Summer holiday', targetCents: 200000, savedCents: 45000 } })

  console.log('\nApp Review account ready:')
  console.log(`  Email:    ${EMAIL}`)
  console.log('  Password: (the APP_REVIEW_PASSWORD you passed in)')
  console.log(`  Household: ${household.name} (Family plan)`)
  console.log('\nSeeded: 5 shopping items, 3 chores, 1 shared note, 1 child with a medicine,')
  console.log('income, 2 commitments and a savings goal. All fabricated.\n')
} finally {
  await prisma.$disconnect()
}
