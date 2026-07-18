// Redacted DeepSeek savings-plan analysis for the manual money planner.
// Mirrors the transaction coach's privacy posture: aggregates only, rounded
// whole-euro figures, no member identity, no free-text beyond sanitized labels.
import { commitmentRatioBand, type PlanSummary } from '@/lib/budget'
import { deepSeekModel, type DeepSeekFinanceResult, type DeepSeekObservation } from './deepseek'
import type { PlannerData } from './planner-data'

export type RedactedPlannerPayload = {
  schemaVersion: 1
  privacy: string
  memberCount: number
  monthlyIncomeEur: number
  monthlyCommitmentsEur: number
  essentialEur: number
  lifestyleEur: number
  disposableEur: number
  commitmentRatioBand: ReturnType<typeof commitmentRatioBand>
  categories: Array<{ category: string; monthlyEur: number }>
  setAsideCount: number
  goals: Array<{
    label: string
    targetEur: number
    savedEur: number
    monthsRemaining: number | null
    requiredMonthlyEur: number | null
  }>
}

function eur(cents: number): number {
  return Math.round(cents / 100)
}

function sanitizeLabel(value: string): string {
  return value
    .replace(/[\p{N}]{3,}/gu, '')
    .replace(/[^\p{L}\p{N}&' .-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40) || 'Goal'
}

export function buildRedactedPlannerPayload(data: PlannerData): RedactedPlannerPayload {
  const summary: PlanSummary = data.summary
  return {
    schemaVersion: 1,
    privacy:
      'Aggregates only. Whole-euro rounding. No member names, no account data, no exact dates, no user identity.',
    memberCount: data.members.length,
    monthlyIncomeEur: eur(summary.monthlyIncomeCents),
    monthlyCommitmentsEur: eur(summary.monthlyCommitmentsCents),
    essentialEur: eur(summary.essentialCents),
    lifestyleEur: eur(summary.lifestyleCents),
    disposableEur: eur(summary.disposableCents),
    commitmentRatioBand: commitmentRatioBand(summary.commitmentRatio),
    categories: summary.categories.map(category => ({
      category: category.category,
      monthlyEur: eur(category.monthlyCents),
    })),
    setAsideCount: summary.setAsides.length,
    goals: data.goals.slice(0, 10).map(goal => ({
      label: sanitizeLabel(goal.name),
      targetEur: eur(goal.targetCents),
      savedEur: eur(goal.savedCents),
      monthsRemaining: goal.monthsRemaining,
      requiredMonthlyEur: goal.requiredMonthlyCents === null ? null : eur(goal.requiredMonthlyCents),
    })),
  }
}

function plannerResult(parsed: unknown): DeepSeekFinanceResult {
  const body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 600) : ''
  const rawObservations = Array.isArray(body.observations) ? body.observations : []
  const observations: DeepSeekObservation[] = rawObservations
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(item => ({
      title: typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '',
      explanation: typeof item.explanation === 'string' ? item.explanation.trim().slice(0, 600) : '',
      suggestion: typeof item.suggestion === 'string' ? item.suggestion.trim().slice(0, 600) : '',
      confidence:
        typeof item.confidence === 'number' && Number.isFinite(item.confidence)
          ? Math.min(1, Math.max(0, item.confidence))
          : null,
    }))
    .filter(item => item.title && item.suggestion)
    .slice(0, 6)
  if (!summary || !observations.length) throw new Error('DeepSeek returned an unusable savings plan')
  return { summary, observations }
}

function buildRequestBody(payload: RedactedPlannerPayload, maxTokens: number) {
  return {
    model: deepSeekModel(),
    thinking: { type: 'disabled' as const },
    response_format: { type: 'json_object' as const },
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'system',
        content: `You are a supportive household savings coach. Return one valid JSON object only, matching this exact shape: {"summary":"short encouraging overview of the household plan","observations":[{"title":"short title","explanation":"evidence-based explanation grounded in the supplied numbers","suggestion":"one concrete, gentle next step","confidence":0.8}]}. Return 3 to 5 observations. Prioritise: emergency fund coverage, the commitments-to-income ratio, lifestyle trimming opportunities, and realistic goal pacing. Never shame the user, never give regulated financial or investment advice, and work only from the supplied redacted aggregates. Amounts are monthly euro figures.`,
      },
      {
        role: 'user',
        content: `Build a savings plan from this redacted household budget JSON and return the required JSON object: ${JSON.stringify(payload)}`,
      },
    ],
  }
}

export async function requestDeepSeekPlannerAnalysis(payload: RedactedPlannerPayload): Promise<DeepSeekFinanceResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) throw new Error('DeepSeek is not configured')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    let lastError: Error | null = null
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(buildRequestBody(payload, attempt === 0 ? 2200 : 4400)),
        })
        const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
        if (!response.ok) {
          const nested = body?.error && typeof body.error === 'object' ? (body.error as Record<string, unknown>) : null
          throw new Error(typeof nested?.message === 'string' ? nested.message.slice(0, 300) : 'DeepSeek request failed')
        }
        const choices = body && Array.isArray(body.choices) ? body.choices : []
        const first = choices[0] as Record<string, unknown> | undefined
        if (first?.finish_reason === 'length') throw new Error('DeepSeek truncated the analysis')
        const message = first?.message && typeof first.message === 'object' ? (first.message as Record<string, unknown>) : null
        if (typeof message?.content !== 'string') throw new Error('DeepSeek returned no analysis')
        const cleaned = message.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
        return plannerResult(JSON.parse(cleaned))
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('DeepSeek request failed')
        if (controller.signal.aborted || attempt === 1) throw lastError
      }
    }
    throw lastError || new Error('DeepSeek request failed')
  } finally {
    clearTimeout(timeout)
  }
}
