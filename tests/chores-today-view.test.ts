import assert from 'node:assert/strict'
import test from 'node:test'
import { registerSrcAlias, resetStubs, stubModule, unloadModule } from './helpers/api-harness'

registerSrcAlias()

/**
 * buildTodayView, with Prisma replaced by a fake. Nothing here opens a
 * database connection — in this repo every configured database URL is
 * production, so the unit suite must never reach one.
 *
 * The behaviour under test is the undo fix: a resolved overdue occurrence used
 * to be filtered out of the response, which made its Undo button unreachable.
 * It is now returned, with completedAt so the client can decide whether it is
 * still today's business.
 */

const CHORE = {
  id: 'chore-1',
  householdId: 'household-1',
  title: 'Wash the dishes',
  notes: null,
  icon: null as string | null,
  recurrenceType: 'WEEKLY' as const,
  daysOfWeek: [6], // Saturday, ISO weekday 6
  intervalDays: null,
  anchorDate: null,
  dayOfMonth: null,
  active: true,
  assignee: null,
}

type Completion = {
  choreId: string
  dueDate: Date
  status: 'DONE' | 'SKIPPED'
  completedAt: Date
  completedBy: { id: string; name: string | null } | null
}

function loadChores(completions: Completion[], chore: Record<string, unknown> = CHORE) {
  resetStubs()
  unloadModule('@/lib/chores')
  stubModule('@/lib/prisma', {
    prisma: {
      chore: { findMany: async () => [chore] },
      choreCompletion: { findMany: async () => completions },
    },
  })
  // Required after stubbing, so chores.ts binds to the fake.
  return require('@/lib/chores') as typeof import('../src/lib/chores')
}

// 2026-08-01 is a Saturday. 2026-08-04 is the Tuesday after it.
const DUE = '2026-08-01'
const TODAY = '2026-08-04'

test('a pending overdue occurrence is returned', async () => {
  const { buildTodayView } = loadChores([])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items.length, 1)
  assert.equal(items[0].dueDate, DUE)
  assert.equal(items[0].overdue, true)
  assert.equal(items[0].status, 'PENDING')
  assert.equal(items[0].completedAt, null)
})

test('a resolved overdue occurrence is still returned, so undo stays reachable', async () => {
  const { buildTodayView } = loadChores([
    {
      choreId: 'chore-1',
      dueDate: new Date(`${DUE}T00:00:00.000Z`),
      status: 'DONE',
      completedAt: new Date('2026-08-04T09:00:00.000Z'),
      completedBy: { id: 'user-1', name: 'Ryan' },
    },
  ])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items.length, 1, 'the row must not be filtered out any more')
  assert.equal(items[0].status, 'DONE')
  assert.equal(items[0].completedAt, '2026-08-04T09:00:00.000Z')
  assert.deepEqual(items[0].completedBy, { id: 'user-1', name: 'Ryan' })
})

test('a skipped overdue occurrence is returned too', async () => {
  const { buildTodayView } = loadChores([
    {
      choreId: 'chore-1',
      dueDate: new Date(`${DUE}T00:00:00.000Z`),
      status: 'SKIPPED',
      completedAt: new Date('2026-08-04T09:00:00.000Z'),
      completedBy: null,
    },
  ])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items.length, 1)
  assert.equal(items[0].status, 'SKIPPED')
})

test('the serialised chore carries its icon id', async () => {
  const { buildTodayView } = loadChores([], { ...CHORE, icon: 'dishes' })
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items[0].chore.icon, 'dishes')
})

test('a chore with no icon serialises null, meaning infer', async () => {
  const { buildTodayView } = loadChores([])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items[0].chore.icon, null)
})
