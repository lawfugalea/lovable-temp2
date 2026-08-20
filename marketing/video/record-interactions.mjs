import { createRequire } from 'node:module'
import { mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { seedCaptureOnlyData, disconnectCaptureDatabase } from './capture.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const baseUrl = process.env.CLANKEEP_CAPTURE_URL || 'http://127.0.0.1:3090'
const root = path.resolve('marketing/video')
const clipsDir = path.join(root, 'clips')
const rawDir = path.join(root, '.recordings')

const pause = (page, milliseconds) => page.waitForTimeout(milliseconds)

async function installPresentationMode(page) {
  await page.addStyleTag({ content: `
    html { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; }
    #promo-cursor { position:fixed; z-index:2147483647; width:22px; height:22px; border-radius:999px; pointer-events:none; transform:translate(-50%,-50%); background:rgba(15,118,110,.18); border:3px solid #0f766e; box-shadow:0 3px 14px rgba(15,23,42,.28); transition:width .12s,height .12s,background .12s; }
    #promo-cursor.down { width:15px; height:15px; background:rgba(244,114,97,.38); }
  ` })
  await page.evaluate(() => {
    document.querySelector('#promo-cursor')?.remove()
    const dot = document.createElement('div'); dot.id = 'promo-cursor'; dot.style.left = '50%'; dot.style.top = '50%'; document.body.append(dot)
    addEventListener('mousemove', event => { dot.style.left = `${event.clientX}px`; dot.style.top = `${event.clientY}px` })
    addEventListener('mousedown', () => dot.classList.add('down'))
    addEventListener('mouseup', () => dot.classList.remove('down'))
    for (const span of document.querySelectorAll('span')) if ((span.textContent || '').includes('You’re exploring a sample household')) span.parentElement?.remove()
    for (const alert of document.querySelectorAll('[role="alert"]')) if ((alert.textContent || '').includes('Background reminders are not configured')) alert.remove()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) if (/demo-[a-f0-9-]+@demo\.clankeep\.invalid/i.test(walker.currentNode.textContent || '')) walker.currentNode.textContent = 'Demo household'
  })
}

async function pointAndClick(page, locator) {
  if (!(await locator.first().isVisible().catch(() => false))) return false
  await locator.first().scrollIntoViewIfNeeded()
  const box = await locator.first().boundingBox()
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 })
  await pause(page, 260)
  await locator.first().click()
  await pause(page, 700)
  return true
}

async function record(browser, storageState, id, route, action, hold = 1800) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    storageState,
    recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await pause(page, 1800)
  await installPresentationMode(page)
  await page.mouse.move(1180, 720)
  await pause(page, 900)
  await action?.(page)
  await pause(page, hold)
  const video = page.video()
  await context.close()
  const source = await video.path()
  const destination = path.join(clipsDir, `${id}.webm`)
  await rm(destination, { force: true })
  await rename(source, destination)
  console.log(`recorded ${id}.webm`)
}

async function main() {
  await mkdir(clipsDir, { recursive: true })
  await mkdir(rawDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const login = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await login.newPage()
  await page.goto(`${baseUrl}/landing`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  const decline = page.getByRole('button', { name: 'Decline' })
  if (await decline.isVisible().catch(() => false)) await decline.click()
  const responsePromise = page.waitForResponse(response => response.url().includes('/api/demo/start') && response.request().method() === 'POST')
  await page.getByText('Try the live demo', { exact: true }).first().click()
  const response = await responsePromise
  if (!response.ok()) throw new Error(`Demo start failed: ${response.status()}`)
  const credentials = await response.json()
  await page.waitForURL('**/dashboard', { timeout: 45_000 })
  await seedCaptureOnlyData(credentials.email)
  await disconnectCaptureDatabase()
  await page.reload({ waitUntil: 'domcontentloaded' })
  const storageState = await login.storageState()
  await login.close()

  await record(browser, storageState, 'overview', '/dashboard', async p => {
    await p.mouse.move(730, 330, { steps: 24 }); await pause(p, 900)
    await p.mouse.wheel(0, 360); await pause(p, 1000)
  })
  await record(browser, storageState, 'shopping', '/shopping', async p => {
    const input = p.getByLabel('Add a shopping item')
    if (await input.isVisible().catch(() => false)) {
      await input.click(); await input.fill('Fresh strawberries'); await pause(p, 700)
      await pointAndClick(p, p.getByRole('button', { name: 'Add as written' }))
      await pointAndClick(p, p.getByRole('button', { name: 'Mark Fresh strawberries complete' }))
    }
    await pointAndClick(p, p.getByRole('tab', { name: /Compare/ }))
  }, 2600)
  await record(browser, storageState, 'meals', '/meals', async p => {
    await pointAndClick(p, p.getByRole('button', { name: 'Next week' }))
    await pointAndClick(p, p.getByRole('tab', { name: /Recipes/ }))
    await pointAndClick(p, p.getByRole('tab', { name: 'This week' }))
  })
  await record(browser, storageState, 'chores', '/chores', async p => {
    const done = p.getByRole('button', { name: /Done|Complete/i }).first()
    if (!(await pointAndClick(p, done))) {
      await pointAndClick(p, p.getByRole('tab', { name: 'All chores' }))
      await pointAndClick(p, p.getByRole('tab', { name: /Log/ }))
    }
  })
  await record(browser, storageState, 'notes', '/notes', async p => {
    const card = p.locator('[class*="cursor-pointer"]').filter({ has: p.locator('h3') }).first()
    if (!(await pointAndClick(p, card))) await pointAndClick(p, p.getByRole('button', { name: /Create Note/i }))
  })
  await record(browser, storageState, 'medicine', '/medicine', async p => {
    await pointAndClick(p, p.getByText('Nina', { exact: true }))
    const timeline = p.getByText(/Timeline|At a glance/i).first()
    if (await timeline.isVisible().catch(() => false)) { await timeline.scrollIntoViewIfNeeded(); await p.mouse.move(790, 650, { steps: 20 }) }
  }, 2400)
  await record(browser, storageState, 'finance', '/finances', async p => {
    await pointAndClick(p, p.getByRole('button', { name: /Goals/ }))
    await pointAndClick(p, p.getByRole('button', { name: /Coach/ }))
    await pointAndClick(p, p.getByRole('button', { name: /My plan/ }))
  }, 2400)
  await record(browser, storageState, 'household', '/household', async p => {
    const members = p.getByText('Household Members', { exact: true })
    if (await members.isVisible().catch(() => false)) { await members.scrollIntoViewIfNeeded(); await p.mouse.move(730, 650, { steps: 20 }) }
  })
  await record(browser, storageState, 'pricing', '/landing', async p => {
    await p.locator('#pricing').scrollIntoViewIfNeeded(); await pause(p, 1000)
    await pointAndClick(p, p.getByRole('button', { name: /Yearly|Annual/i }))
  }, 2200)
  await browser.close()
}

main().catch(error => { console.error(error); process.exitCode = 1 })
