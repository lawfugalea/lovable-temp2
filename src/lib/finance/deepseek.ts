import { createHash } from 'node:crypto'
import type { FlowClass } from './classification'
import type { CoachTransaction } from './coach'

export type RedactedFinancePayload = {
  schemaVersion: 1
  periodDays: 90
  privacy: string
  currencies: Array<{
    currency: string
    outgoingRounded: number
    transactionCount: number
    categories: Array<{ label: string; totalRounded: number; count: number }>
    merchants: Array<{ sanitizedLabel: string; totalRounded: number; count: number; typicalIntervalDays: number | null }>
  }>
}

export type DeepSeekObservation = {
  title: string
  explanation: string
  suggestion: string
  confidence: number | null
}

export type DeepSeekFinanceResult = {
  summary: string
  observations: DeepSeekObservation[]
}

function sanitizeMerchantLabel(value: string): string {
  return value
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{8,30}\b/gi, '')
    .replace(/\b\d{2,}\b/g, '')
    .replace(/\b(?:ref|reference|auth|account|iban)\b.*$/i, '')
    .replace(/[^\p{L}\p{N}&' .-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'Unresolved merchant'
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function roundWhole(value: number): number {
  return Math.round(value)
}

/** A transaction the classifier has already labelled, so transfers stay out. */
export type RedactableTransaction = CoachTransaction & { flowClass?: FlowClass }

export function buildRedactedFinancePayload(transactions: RedactableTransaction[], now = new Date()): RedactedFinancePayload {
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - 89)
  const eligible = transactions
    // Where a flow class is available, trust it: sending the model internal
    // transfers as spending made its narrative disagree with the dashboard.
    .filter(transaction => (transaction.flowClass
      ? transaction.flowClass === 'SPENDING'
      : transaction.signedAmount < 0)
      && transaction.status !== 'PENDING'
      && transaction.bookingDate)
    .map(transaction => ({ ...transaction, date: new Date(transaction.bookingDate!) }))
    .filter(transaction => !Number.isNaN(transaction.date.getTime()) && transaction.date >= from && transaction.date <= now)
  const currencyGroups = new Map<string, typeof eligible>()
  for (const transaction of eligible) {
    const currency = transaction.currency.toUpperCase()
    currencyGroups.set(currency, [...(currencyGroups.get(currency) || []), transaction])
  }

  return {
    schemaVersion: 1,
    periodDays: 90,
    privacy: 'Aggregates only. Amounts rounded. No account identifiers, references, raw notes, exact dates, or user identity.',
    currencies: [...currencyGroups].map(([currency, items]) => {
      const categories = new Map<string, typeof items>()
      const merchants = new Map<string, typeof items>()
      for (const transaction of items) {
        categories.set(transaction.category, [...(categories.get(transaction.category) || []), transaction])
        const label = sanitizeMerchantLabel(transaction.merchantName)
        merchants.set(label, [...(merchants.get(label) || []), transaction])
      }
      return {
        currency,
        outgoingRounded: roundWhole(items.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0)),
        transactionCount: items.length,
        categories: [...categories]
          .map(([label, group]) => ({
            label,
            totalRounded: roundWhole(group.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0)),
            count: group.length,
          }))
          .sort((left, right) => right.totalRounded - left.totalRounded),
        merchants: [...merchants]
          .map(([sanitizedLabel, group]) => {
            const dates = group.map(item => item.date.getTime()).sort((left, right) => left - right)
            const intervals = dates.slice(1).map((date, index) => Math.round((date - dates[index]) / 86_400_000))
            return {
              sanitizedLabel,
              totalRounded: roundWhole(group.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0)),
              count: group.length,
              typicalIntervalDays: intervals.length ? Math.round(median(intervals)) : null,
            }
          })
          .sort((left, right) => right.totalRounded - left.totalRounded)
          .slice(0, 20),
      }
    }),
  }
}

export function hashRedactedPayload(payload: RedactedFinancePayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function financeResult(value: unknown): DeepSeekFinanceResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('DeepSeek returned an invalid analysis')
  const object = value as Record<string, unknown>
  const summary = typeof object.summary === 'string' ? object.summary.trim().slice(0, 800) : ''
  const observations = Array.isArray(object.observations) ? object.observations.slice(0, 8).flatMap(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const candidate = item as Record<string, unknown>
    if (typeof candidate.title !== 'string' || typeof candidate.explanation !== 'string' || typeof candidate.suggestion !== 'string') return []
    const rawConfidence = typeof candidate.confidence === 'number' ? candidate.confidence : null
    return [{
      title: candidate.title.trim().slice(0, 140),
      explanation: candidate.explanation.trim().slice(0, 700),
      suggestion: candidate.suggestion.trim().slice(0, 500),
      confidence: rawConfidence === null ? null : Math.max(0, Math.min(1, rawConfidence)),
    }]
  }) : []
  if (!summary || !observations.length) throw new Error('DeepSeek returned an incomplete analysis')
  return { summary, observations }
}

export function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim())
}

export function deepSeekModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash'
}

export function buildDeepSeekRequestBody(payload: RedactedFinancePayload, maxTokens = 2200) {
  return {
    model: deepSeekModel(),
    thinking: { type: "disabled" as const },
    response_format: { type: "json_object" as const },
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      {
        role: "system",
        content: `You are a neutral personal-spending pattern assistant. Return one valid JSON object only, matching this exact shape: {"summary":"short overview","observations":[{"title":"short title","explanation":"evidence-based explanation","suggestion":"gentle practical suggestion","confidence":0.8}]}. Return 3 to 5 observations when transaction aggregates are present. Never shame the user, diagnose addiction, or give regulated financial advice. Mention uncertainty and work only from the supplied redacted aggregates.`,
      },
      { role: "user", content: `Analyze this redacted finance JSON and return the required JSON object: ${JSON.stringify(payload)}` },
    ],
  }
}

export async function requestDeepSeekFinanceAnalysis(payload: RedactedFinancePayload): Promise<DeepSeekFinanceResult> {
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
          body: JSON.stringify(buildDeepSeekRequestBody(payload, attempt === 0 ? 2200 : 4400)),
        })
        const body = await response.json().catch(() => null) as Record<string, unknown> | null
        if (!response.ok) {
          const nested = body?.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : null
          throw new Error(typeof nested?.message === 'string' ? nested.message.slice(0, 300) : 'DeepSeek request failed')
        }
        const choices = body && Array.isArray(body.choices) ? body.choices : []
        const first = choices[0] as Record<string, unknown> | undefined
        if (first?.finish_reason === "length") throw new Error("DeepSeek truncated the analysis")
        const message = first?.message && typeof first.message === 'object' ? first.message as Record<string, unknown> : null
        if (typeof message?.content !== 'string') throw new Error('DeepSeek returned no analysis')
        const cleaned = message.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
        return financeResult(JSON.parse(cleaned))
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
