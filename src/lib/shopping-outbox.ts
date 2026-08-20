/**
 * Offline write queue for the shopping list.
 *
 * A shopper who ticks items in a basement aisle must not lose those ticks. This
 * holds the writes their browser could not send and replays them on reconnect.
 *
 * Two rules keep replay safe on a list other people are also editing:
 *
 * 1. Every operation records the *intended final state*, never a delta. Replaying
 *    "set item X to DONE" twice is harmless; replaying "toggle item X" twice
 *    silently undoes itself.
 * 2. Operations expire. A tick queued yesterday, on a list that has since been
 *    cleared and rebuilt for this week's shop, is worse than a lost tick — so
 *    anything past MAX_AGE_MS is dropped rather than applied.
 */

const STORAGE_KEY = 'clankeep.shopping.outbox.v1'

/** Beyond this the queued intent is more likely wrong than right. */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Bounds localStorage use; the oldest entries are dropped first. */
export const MAX_ENTRIES = 200

export type OutboxOperation =
  | { kind: 'set-status'; itemId: string; status: 'ACTIVE' | 'DONE'; queuedAt: number }
  | { kind: 'add-item'; listId: string; title: string; quantityCount: number; queuedAt: number }

/**
 * Collapse superseded operations and drop expired ones.
 *
 * Exported for tests and used on both read and write, so a queue that sat in
 * storage across a long offline stretch is pruned before anything replays it.
 */
export function normalizeQueue(operations: OutboxOperation[], now = Date.now()): OutboxOperation[] {
  const fresh = operations.filter(operation => now - operation.queuedAt < MAX_AGE_MS)

  // Only the last intent for a given item matters: ticking then unticking an
  // item while offline should reach the server as a single write.
  const latestStatusByItem = new Map<string, OutboxOperation>()
  const additions: OutboxOperation[] = []
  for (const operation of fresh) {
    if (operation.kind === 'set-status') latestStatusByItem.set(operation.itemId, operation)
    else additions.push(operation)
  }

  return [...additions, ...latestStatusByItem.values()]
    .sort((left, right) => left.queuedAt - right.queuedAt)
    .slice(-MAX_ENTRIES)
}

function read(): OutboxOperation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? normalizeQueue(parsed as OutboxOperation[]) : []
  } catch {
    // Corrupt or unavailable storage must not break the page.
    return []
  }
}

function write(operations: OutboxOperation[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeQueue(operations)))
  } catch {
    // Private-mode or quota failures: the write is lost, which is the same
    // outcome as not having an outbox at all.
  }
}

export function queueOperation(operation: OutboxOperation): void {
  write([...read(), operation])
}

export function pendingCount(): number {
  return read().length
}

export function clearOutbox(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do; the entries expire on their own.
  }
}

/**
 * Decide what to do with a replayed operation based on the server's answer.
 *
 * Split out so the policy is testable without a network. The distinction that
 * matters: a 4xx means this operation will never succeed and must be dropped,
 * while a network failure means we are still offline and must keep it.
 */
export function shouldRetry(status: number | null): boolean {
  if (status === null) return true // never reached the server
  if (status >= 500) return true // server-side, may recover
  return false // 2xx applied it, 4xx will never accept it
}

export interface ReplayResult {
  applied: number
  dropped: number
  remaining: number
}

/**
 * Send every queued operation, oldest first.
 *
 * Sequential rather than parallel: two writes to the same list racing each
 * other is what produced the inconsistent state this queue exists to avoid.
 */
export async function replayOutbox(
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<ReplayResult> {
  const queue = normalizeQueue(read(), now)
  if (!queue.length) return { applied: 0, dropped: 0, remaining: 0 }

  const keep: OutboxOperation[] = []
  let applied = 0
  let dropped = 0

  for (const operation of queue) {
    let status: number | null = null
    try {
      const response = operation.kind === 'set-status'
        ? await fetchImpl(`/api/shopping/items/${encodeURIComponent(operation.itemId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: operation.status }),
          })
        : await fetchImpl('/api/shopping/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              listId: operation.listId,
              title: operation.title,
              quantityCount: operation.quantityCount,
            }),
          })
      status = response.status
    } catch {
      status = null
    }

    if (status !== null && status >= 200 && status < 300) applied += 1
    else if (shouldRetry(status)) keep.push(operation)
    else dropped += 1 // item deleted by someone else, or no longer permitted
  }

  write(keep)
  return { applied, dropped, remaining: keep.length }
}
