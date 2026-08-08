/**
 * Chore fairness and streaks.
 *
 * ChoreCompletion has always recorded who resolved each occurrence, but nothing
 * ever read it back, so a shared chore list could not answer the question that
 * actually decides whether people keep using one: who is doing the work.
 *
 * Pure functions over plain records — the route does the querying, this does the
 * arithmetic, and the arithmetic is what is worth testing.
 */

/** Date-only strings throughout, matching ChoreCompletion.dueDate (@db.Date). */
export interface CompletionRecord {
  dueDate: string
  status: 'DONE' | 'SKIPPED'
  completedById: string | null
}

export interface HouseholdMember {
  userId: string
  name: string
}

export interface MemberContribution {
  userId: string
  name: string
  doneCount: number
  skippedCount: number
  /** Rounded whole percent of all DONE completions in the window. */
  sharePercent: number
}

/**
 * Per-member completion counts over a window.
 *
 * Every member is returned, including those who did nothing — a fairness view
 * that silently omits the person who has not helped is not a fairness view.
 * Unattributed completions (`completedById` null, left by a departed member)
 * count toward the household total but belong to nobody.
 */
export function summariseContributions(
  records: CompletionRecord[],
  members: HouseholdMember[],
): MemberContribution[] {
  const done = new Map<string, number>()
  const skipped = new Map<string, number>()
  let totalDone = 0

  for (const record of records) {
    if (record.status === 'DONE') totalDone += 1
    if (!record.completedById) continue
    const bucket = record.status === 'DONE' ? done : skipped
    bucket.set(record.completedById, (bucket.get(record.completedById) ?? 0) + 1)
  }

  return members
    .map(member => {
      const doneCount = done.get(member.userId) ?? 0
      return {
        userId: member.userId,
        name: member.name,
        doneCount,
        skippedCount: skipped.get(member.userId) ?? 0,
        sharePercent: totalDone === 0 ? 0 : Math.round((doneCount / totalDone) * 100),
      }
    })
    .sort((left, right) => right.doneCount - left.doneCount || left.name.localeCompare(right.name))
}

function previousDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() - 1)
  return parsed.toISOString().slice(0, 10)
}

/**
 * Consecutive days on which every chore due was resolved, counting back from today.
 *
 * Two decisions worth stating:
 *
 * - Today never breaks a streak. The day is not over; a chore due this evening
 *   being outstanding at 9am must not read as a failure. Today only *extends*
 *   the streak, once everything due is resolved.
 * - Days with nothing due are transparent. A household whose chores are all
 *   weekday-only should not lose its streak every Saturday, but an empty
 *   Saturday cannot manufacture a streak either.
 *
 * @param dueByDate   date-only → how many occurrences fell due that day
 * @param doneByDate  date-only → how many of those were resolved
 * @param today       date-only, in the household's local sense
 */
export function computeStreak(
  dueByDate: Map<string, number>,
  doneByDate: Map<string, number>,
  today: string,
  maxLookbackDays = 365,
): number {
  let streak = 0
  let cursor = today

  for (let step = 0; step < maxLookbackDays; step += 1) {
    const due = dueByDate.get(cursor) ?? 0
    const resolved = doneByDate.get(cursor) ?? 0

    if (due === 0) {
      // Nothing due: carry the streak across without incrementing it.
      cursor = previousDay(cursor)
      continue
    }

    if (resolved >= due) {
      streak += 1
      cursor = previousDay(cursor)
      continue
    }

    // Incomplete. Today is still in progress, so it ends the walk without
    // counting; any earlier day genuinely breaks the chain.
    if (cursor === today) {
      cursor = previousDay(cursor)
      continue
    }
    break
  }

  return streak
}
