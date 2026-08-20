import {
  choreRecurrenceFromRow,
  dbDateToDateOnly,
  isDueOn,
  type ChoreRecurrence,
  type ChoreRecurrenceRow,
  // Relative, not the `@/` alias: this module is reached directly by
  // tests/shopping-recurrence.test.ts under ts-node, which does not resolve the
  // alias. Same convention as entitlements-core.
} from './chore-recurrence'

/**
 * Scheduling for shopping templates.
 *
 * Reuses the chore recurrence engine rather than restating it: "every Monday",
 * "every 14 days", "the 1st of the month" mean exactly the same thing for a
 * shopping template as for a chore, and that engine is already tested against
 * month-length clamping and anchor phasing.
 */

export interface RecurringTemplateRow extends ChoreRecurrenceRow {
  id: string
  autoListId: string | null
  lastRunOn: Date | null
}

/**
 * Whether a template should refill its list today.
 *
 * Three independent reasons to skip, all of which matter:
 * - No target list. The list was deleted and the FK nulled the link; refilling
 *   some other list would put groceries somewhere the user never chose.
 * - Not a due date under the recurrence.
 * - Already run today. The worker is at-least-once — a retry after a partial
 *   failure, or two overlapping cron ticks, must not double the quantities.
 */
export function isTemplateDue(row: RecurringTemplateRow, today: string): boolean {
  if (!row.autoListId) return false
  if (row.lastRunOn && dbDateToDateOnly(row.lastRunOn) >= today) return false

  let recurrence: ChoreRecurrence
  try {
    recurrence = choreRecurrenceFromRow(row)
  } catch {
    // A row whose recurrence columns do not form a valid schedule (hand-edited,
    // or written by an older version) is treated as unscheduled rather than
    // crashing the whole worker run.
    return false
  }
  return isDueOn(recurrence, today)
}

/** The templates to run now, in a stable order. */
export function selectDueTemplates(rows: RecurringTemplateRow[], today: string): RecurringTemplateRow[] {
  return rows.filter(row => isTemplateDue(row, today))
}
