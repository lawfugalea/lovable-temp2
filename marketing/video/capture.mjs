import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const baseUrl = process.env.CLANKEEP_CAPTURE_URL || 'http://127.0.0.1:3090'
const captureDir = path.resolve('marketing/video/captures')

export async function seedCaptureOnlyData(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { activeHousehold: true },
  })
  if (!user?.activeHousehold) throw new Error('Demo household was not created')
  const householdId = user.activeHousehold.id

  await prisma.incomeSource.createMany({ data: [
    { householdId, userId: user.id, label: 'Salary', amountCents: 285000, frequency: 'MONTHLY' },
    { householdId, label: 'Side work', amountCents: 42000, frequency: 'MONTHLY' },
  ] })
  await prisma.commitment.createMany({ data: [
    { householdId, label: 'Home', category: 'housing', amountCents: 105000, frequency: 'MONTHLY', essential: true },
    { householdId, label: 'Groceries', category: 'food', amountCents: 52000, frequency: 'MONTHLY', essential: true },
    { householdId, label: 'Transport', category: 'transport', amountCents: 18500, frequency: 'MONTHLY', essential: true },
    { householdId, label: 'Family fun', category: 'leisure', amountCents: 16000, frequency: 'MONTHLY', essential: false },
  ] })
  await prisma.savingsGoal.createMany({ data: [
    { householdId, name: 'Family holiday', targetCents: 240000, savedCents: 132000, targetDate: new Date('2027-06-01T00:00:00Z') },
    { householdId, name: 'Rainy-day fund', targetCents: 500000, savedCents: 305000, targetDate: new Date('2027-12-01T00:00:00Z') },
  ] })

  const nina = await prisma.child.create({
    data: { householdId, name: 'Nina', dateOfBirth: new Date('2022-03-14T00:00:00Z') },
  })
  await prisma.child.create({
    data: { householdId, name: 'Leo', dateOfBirth: new Date('2019-10-02T00:00:00Z') },
  })
  const episode = await prisma.healthEpisode.create({
    data: {
      householdId,
      childId: nina.id,
      title: 'Sample recovery journal',
      notes: 'Demonstration data only',
      startedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
      createdBy: user.id,
    },
  })
  const medicine = await prisma.medicine.create({
    data: {
      householdId,
      childId: nina.id,
      episodeId: episode.id,
      name: 'Example medicine',
      description: 'Demonstration record — not medical guidance',
      dosage: '5 ml',
      frequency: 'every 8 hours',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      minGapHours: 8,
      maxDosesPer24h: 3,
      activeIngredient: 'Demo only',
      formulation: 'Liquid',
      concentration: 'See product label',
      doseAmount: 5,
      doseUnit: 'ml',
      scheduleSource: 'CLINICIAN',
      scheduleSourceNotes: 'Sample data for the ClanKeep tour',
      scheduleVerifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      scheduleVerifiedBy: user.id,
    },
  })
  for (const hoursAgo of [22, 14, 6]) {
    await prisma.medicineDose.create({
      data: {
        childId: nina.id,
        medicineId: medicine.id,
        episodeId: episode.id,
        takenAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
        dosage: '5 ml',
        notes: hoursAgo === 6 ? 'Resting comfortably' : null,
        takenBy: user.id,
      },
    })
  }
  for (const [hoursAgo, temperature] of [[26, 38.2], [18, 37.8], [5, 37.2]]) {
    await prisma.feverReading.create({
      data: {
        childId: nina.id,
        episodeId: episode.id,
        temperature,
        method: 'ear',
        takenAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
        notes: 'Sample reading',
        takenBy: user.id,
      },
    })
  }
  await prisma.weightMeasurement.create({
    data: { childId: nina.id, weightKg: 16.4, measuredAt: new Date(), notes: 'Sample measurement', recordedBy: user.id },
  })
}

async function cleanPage(page) {
  await page.addStyleTag({ content: `
    *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
    html { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; }
  ` }).catch(() => {})
  await page.evaluate(() => {
    for (const span of document.querySelectorAll('span')) {
      if ((span.textContent || '').includes('You’re exploring a sample household')) {
        const banner = span.parentElement
        if (banner) banner.style.display = 'none'
      }
    }
    for (const alert of document.querySelectorAll('[role="alert"]')) {
      if ((alert.textContent || '').includes('Background reminders are not configured')) alert.style.display = 'none'
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (/demo-[a-f0-9-]+@demo\.clankeep\.invalid/i.test(node.textContent || '')) node.textContent = 'Demo household'
      if ((node.textContent || '').includes('You’re exploring a sample household')) {
        node.textContent = 'Sample household · promotional demo'
      }
    }
  }).catch(() => {})
}

async function openAndCapture(page, route, file, action) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForTimeout(1_800)
  if (action) await action(page)
  await page.waitForTimeout(1_200)
  await cleanPage(page)
  await page.screenshot({ path: path.join(captureDir, file), animations: 'disabled' })
  console.log(`captured ${file}`)
}

async function run() {
  await mkdir(captureDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await desktop.newPage()

  await page.goto(`${baseUrl}/landing`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForTimeout(1_000)
  const decline = page.getByRole('button', { name: 'Decline' })
  if (await decline.isVisible().catch(() => false)) await decline.click()
  const demoResponsePromise = page.waitForResponse(response => response.url().includes('/api/demo/start') && response.request().method() === 'POST')
  await page.getByText('Try the live demo', { exact: true }).first().click()
  const demoResponse = await demoResponsePromise
  if (!demoResponse.ok()) throw new Error(`Demo start failed with ${demoResponse.status()}`)
  const credentials = await demoResponse.json()
  await page.waitForURL('**/dashboard', { timeout: 45_000 })
  await seedCaptureOnlyData(credentials.email)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1_800)

  await openAndCapture(page, '/landing', 'landing-hero.png')
  await openAndCapture(page, '/dashboard', 'dashboard.png')
  await openAndCapture(page, '/shopping', 'shopping-list.png')
  await openAndCapture(page, '/shopping', 'shopping-compare.png', async p => {
    await p.getByText('Compare', { exact: true }).last().click()
    await p.waitForTimeout(2_500)
  })
  await openAndCapture(page, '/shopping', 'shopping-offers.png', async p => {
    await p.getByText('Offers', { exact: true }).last().click()
    await p.waitForTimeout(2_500)
  })
  await openAndCapture(page, '/meals', 'meals.png')
  await openAndCapture(page, '/chores', 'chores.png')
  await openAndCapture(page, '/notes', 'notes.png')
  await openAndCapture(page, '/medicine', 'medicine.png', async p => {
    await p.getByText('Nina', { exact: true }).click()
    await p.waitForTimeout(1_200)
    await p.getByText('At a glance', { exact: true }).scrollIntoViewIfNeeded()
  })
  await openAndCapture(page, '/finances', 'finances.png')
  await openAndCapture(page, '/household', 'household.png')
  await openAndCapture(page, '/settings', 'settings.png', async p => {
    const plan = p.getByText('Plan & Billing', { exact: false }).first()
    if (await plan.count()) await plan.scrollIntoViewIfNeeded()
  })
  await openAndCapture(page, '/landing', 'pricing.png', async p => {
    await p.locator('#pricing').scrollIntoViewIfNeeded()
  })
  await openAndCapture(page, '/landing', 'landing-cta.png', async p => {
    await p.getByText('Ready for a calmer household?', { exact: false }).first().scrollIntoViewIfNeeded().catch(() => p.locator('footer').scrollIntoViewIfNeeded())
  })

  const state = await desktop.storageState()
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: state })
  const mobilePage = await mobile.newPage()
  await openAndCapture(mobilePage, '/dashboard', 'mobile-dashboard.png')
  await openAndCapture(mobilePage, '/shopping', 'mobile-shopping.png')
  await openAndCapture(mobilePage, '/meals', 'mobile-meals.png')
  await openAndCapture(mobilePage, '/medicine', 'mobile-medicine.png', async p => {
    await p.getByText('Nina', { exact: true }).click()
    await p.waitForTimeout(1_200)
    await p.getByText('At a glance', { exact: true }).scrollIntoViewIfNeeded()
  })
  await openAndCapture(mobilePage, '/finances', 'mobile-finances.png')
  await openAndCapture(mobilePage, '/landing', 'mobile-pricing.png', async p => {
    await p.locator('#pricing').scrollIntoViewIfNeeded()
  })

  await mobile.close()
  await desktop.close()
  await browser.close()
}

export async function disconnectCaptureDatabase() { await prisma.$disconnect() }

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  run().finally(() => prisma.$disconnect()).catch(error => {
    console.error(error)
    process.exit(1)
  })
}
