import crypto from 'crypto'

/**
 * Stateless-feeling but server-authoritative math captcha.
 *
 * The answer is generated and held server-side and never sent to the client,
 * so a scripted client cannot bypass the check by POSTing `verified: true`
 * (the previous behaviour) or by brute-forcing a signed token. Challenges are
 * single-use (deleted on the first verify attempt, success or failure) and
 * expire after a short TTL.
 *
 * The store is in-memory and per-process, consistent with this app's existing
 * single-instance rate limiters (see `src/lib/rate-limiter.ts`). If the app is
 * ever scaled to multiple replicas, back this with a shared store.
 */

type Challenge = { answer: string; expires: number }

const store = new Map<string, Challenge>()
const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 5000

function sweep(now: number) {
  for (const [id, challenge] of store) {
    if (challenge.expires <= now) store.delete(id)
  }
}

export function createCaptcha(): { id: string; question: string } {
  const now = Date.now()
  sweep(now)
  // Crude flood guard: never let the store grow unbounded.
  if (store.size >= MAX_ENTRIES) store.clear()

  const operations = ['+', '-', '×'] as const
  const operation = operations[crypto.randomInt(0, operations.length)]
  let a: number
  let b: number
  let result: number

  if (operation === '+') {
    a = crypto.randomInt(1, 21)
    b = crypto.randomInt(1, 21)
    result = a + b
  } else if (operation === '-') {
    a = crypto.randomInt(10, 30)
    b = crypto.randomInt(1, 11)
    result = a - b
  } else {
    a = crypto.randomInt(1, 11)
    b = crypto.randomInt(1, 11)
    result = a * b
  }

  const id = crypto.randomUUID()
  store.set(id, { answer: String(result), expires: now + TTL_MS })
  return { id, question: `${a} ${operation} ${b} = ?` }
}

export function verifyCaptcha(id: unknown, answer: unknown): boolean {
  if (typeof id !== 'string' || typeof answer !== 'string') return false
  const challenge = store.get(id)
  if (!challenge) return false
  // Single-use: consume it regardless of outcome so the same challenge cannot
  // be guessed repeatedly.
  store.delete(id)
  if (Date.now() > challenge.expires) return false
  return challenge.answer === answer.trim()
}
