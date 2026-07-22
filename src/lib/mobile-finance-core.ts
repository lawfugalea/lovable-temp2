import { isCommitmentCategory, isPlannerFrequency, parseAmountToCents, type PlannerFrequency } from './budget'

export type MobilePlannerKind = 'income' | 'commitment' | 'goal'
type SharedEntry = { label: string; amountCents: number; frequency: PlannerFrequency; userId: string | null }
export type ParsedMobilePlannerEntry =
  | ({ kind: 'income' } & SharedEntry)
  | ({ kind: 'commitment'; category: string; essential: boolean } & SharedEntry)
  | { kind: 'goal'; name: string; targetCents: number; savedCents: number; targetDate: Date | null }

export type PlannerParseResult = { ok: true; value: ParsedMobilePlannerEntry } | { ok: false; error: string }

export function isMobilePlannerKind(value: unknown): value is MobilePlannerKind {
  return value === 'income' || value === 'commitment' || value === 'goal'
}

export function parseMobilePlannerEntry(kind: MobilePlannerKind, body: Record<string, unknown>): PlannerParseResult {
  if (kind === 'goal') {
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
    if (!name) return { ok: false, error: 'A goal name is required' }
    const targetCents = parseAmountToCents(body.target)
    if (targetCents === null) return { ok: false, error: 'Enter a valid target amount' }
    let savedCents = 0
    if (body.saved !== undefined && body.saved !== null && body.saved !== '' && body.saved !== 0 && body.saved !== '0') {
      const parsed = parseAmountToCents(body.saved)
      if (parsed === null) return { ok: false, error: 'Enter a valid saved amount' }
      savedCents = parsed
    }
    let targetDate: Date | null = null
    if (typeof body.targetDate === 'string' && body.targetDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.targetDate)) return { ok: false, error: 'Enter a valid target date' }
      targetDate = new Date(`${body.targetDate}T00:00:00.000Z`)
      if (Number.isNaN(targetDate.getTime())) return { ok: false, error: 'Enter a valid target date' }
    }
    return { ok: true, value: { kind, name, targetCents, savedCents, targetDate } }
  }

  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : ''
  if (!label) return { ok: false, error: 'A label is required' }
  const amountCents = parseAmountToCents(body.amount)
  if (amountCents === null) return { ok: false, error: 'Enter a valid amount' }
  const frequency = typeof body.frequency === 'string' ? body.frequency : 'MONTHLY'
  if (!isPlannerFrequency(frequency)) return { ok: false, error: 'Unsupported frequency' }
  const userId = typeof body.userId === 'string' && body.userId ? body.userId : null
  if (kind === 'income') return { ok: true, value: { kind, label, amountCents, frequency, userId } }
  const category = typeof body.category === 'string' && isCommitmentCategory(body.category) ? body.category : 'other'
  return { ok: true, value: { kind, label, amountCents, frequency, userId, category, essential: body.essential !== false } }
}
