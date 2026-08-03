import { prisma } from '@/lib/prisma'
import type { ModuleKey } from '@/lib/modules'

/**
 * Best-effort activity feed writes.
 *
 * A feed row is a nice-to-have; the mutation it describes is not. Every write
 * is therefore swallowed on failure — a full disk or a dropped connection must
 * never turn "add milk to the list" into a 500.
 *
 * Summaries are precomputed at write time (with the actor's name baked in by
 * the caller when it reads better) so reading the feed is one indexed query.
 */
export interface ActivityInput {
  householdId: string
  /** The acting user; null for system events (scheduled refills, workers). */
  userId: string | null
  module: ModuleKey
  action: string
  summary: string
  targetId?: string
}

export async function recordActivity(input: ActivityInput): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        householdId: input.householdId,
        userId: input.userId,
        module: input.module,
        action: input.action,
        summary: input.summary.slice(0, 300),
        targetId: input.targetId ?? null,
      },
    })
  } catch (error) {
    console.warn('[activity] write failed:', input.module, input.action, error instanceof Error ? error.message : error)
  }
}

/** How long feed rows are kept; swept alongside the other housekeeping. */
export const ACTIVITY_RETENTION_DAYS = 180

export async function sweepExpiredActivity(now = new Date()): Promise<number> {
  const { count } = await prisma.activityEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - ACTIVITY_RETENTION_DAYS * 24 * 3600 * 1000) } },
  })
  return count
}
