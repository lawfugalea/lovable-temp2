import { normalizeMerchantKey } from './metadata'

export type KnownSubscription = {
  key: string
  displayName: string
  category: "Entertainment" | "Software" | "Storage" | "Membership"
  defaultCadence: "MONTHLY" | "YEARLY"
  patterns: RegExp[]
}

export const KNOWN_SUBSCRIPTIONS: KnownSubscription[] = [
  { key: "netflix", displayName: "Netflix", category: "Entertainment", defaultCadence: "MONTHLY", patterns: [/\bnetflix\b/] },
  { key: "disney-plus", displayName: "Disney+", category: "Entertainment", defaultCadence: "MONTHLY", patterns: [/\bdisney\s*(?:plus)?\b/, /\bdisneyplus\b/] },
  { key: "spotify", displayName: "Spotify", category: "Entertainment", defaultCadence: "MONTHLY", patterns: [/\bspotify\b/] },
  { key: "youtube-premium", displayName: "YouTube Premium", category: "Entertainment", defaultCadence: "MONTHLY", patterns: [/\byoutube\s*(?:premium|music)\b/] },
  { key: "amazon-prime", displayName: "Amazon Prime", category: "Membership", defaultCadence: "MONTHLY", patterns: [/\bamazon\s*prime\b/, /\bprimevideo\b/] },
  { key: "apple-services", displayName: "Apple Services", category: "Membership", defaultCadence: "MONTHLY", patterns: [/\bapple\s*(?:com bill|music|tv|icloud)\b/] },
  { key: "google-one", displayName: "Google One", category: "Storage", defaultCadence: "MONTHLY", patterns: [/\bgoogle\s*one\b/] },
  { key: "microsoft-365", displayName: "Microsoft 365", category: "Software", defaultCadence: "MONTHLY", patterns: [/\bmicrosoft\s*365\b/, /\bmsft\s*365\b/] },
  { key: "adobe", displayName: "Adobe", category: "Software", defaultCadence: "MONTHLY", patterns: [/\badobe\b/] },
  { key: "dropbox", displayName: "Dropbox", category: "Storage", defaultCadence: "MONTHLY", patterns: [/\bdropbox\b/] },
  { key: "playstation-plus", displayName: "PlayStation Plus", category: "Entertainment", defaultCadence: "MONTHLY", patterns: [/\bplaystation\s*(?:plus|network)\b/, /\bpsn\b/] },
  { key: "xbox-game-pass", displayName: "Xbox Game Pass", category: "Entertainment", defaultCadence: "MONTHLY", patterns: [/\bxbox\s*(?:game pass|live)\b/] },
  { key: "audible", displayName: "Audible", category: "Entertainment", defaultCadence: "MONTHLY", patterns: [/\baudible\b/] },
  { key: "patreon", displayName: "Patreon", category: "Membership", defaultCadence: "MONTHLY", patterns: [/\bpatreon\b/] },
  { key: "canva", displayName: "Canva", category: "Software", defaultCadence: "MONTHLY", patterns: [/\bcanva\b/] },
  { key: "openai", displayName: "ChatGPT", category: "Software", defaultCadence: "MONTHLY", patterns: [/\bopenai\b/, /\bchatgpt\b/] },
]

export function identifyKnownSubscription(merchantName: string): KnownSubscription | null {
  const normalized = normalizeMerchantKey(merchantName)
  return KNOWN_SUBSCRIPTIONS.find(service => service.patterns.some(pattern => pattern.test(normalized))) || null
}

export type SubscriptionTransaction = {
  id: string
  accountId: string
  merchantName: string
  signedAmount: number
  currency: string
  bookingDate: Date | string | null
  status?: string
}

export type DetectedSubscription = {
  accountId: string
  merchantKey: string
  displayName: string
  cadence: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  intervalDays: number
  expectedAmount: number
  amountTolerance: number
  currency: string
  nextExpectedDate: string
  lastSeenAt: string
  occurrenceCount: number
  confidence: number
  priceChanged: boolean
  previousTypicalAmount: number | null
  latestAmount: number
  transactionIds: string[]
  detectionSource: "KNOWN_SERVICE" | "RECURRING_PATTERN"
  detectionReason: string
  serviceCategory: KnownSubscription["category"] | null
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function daysBetween(left: Date, right: Date): number {
  return Math.round((right.getTime() - left.getTime()) / 86_400_000)
}

function cadenceFor(interval: number): DetectedSubscription['cadence'] | null {
  if (interval >= 5 && interval <= 9) return 'WEEKLY'
  if (interval >= 25 && interval <= 35) return 'MONTHLY'
  if (interval >= 75 && interval <= 105) return 'QUARTERLY'
  if (interval >= 330 && interval <= 400) return 'YEARLY'
  return null
}

function cadenceTolerance(cadence: DetectedSubscription['cadence']): number {
  if (cadence === 'WEEKLY') return 2
  if (cadence === 'MONTHLY') return 5
  if (cadence === 'QUARTERLY') return 14
  return 35
}

function nextDate(lastSeen: Date, cadence: DetectedSubscription['cadence'], intervalDays: number, now: Date): Date {
  const next = new Date(lastSeen)
  const advance = () => {
    if (cadence === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1)
    else if (cadence === 'QUARTERLY') next.setUTCMonth(next.getUTCMonth() + 3)
    else if (cadence === 'YEARLY') next.setUTCFullYear(next.getUTCFullYear() + 1)
    else next.setUTCDate(next.getUTCDate() + intervalDays)
  }
  advance()
  while (next < now) advance()
  return next
}

export function detectSubscriptions(transactions: SubscriptionTransaction[], now = new Date()): DetectedSubscription[] {
  const groups = new Map<string, SubscriptionTransaction[]>()
  for (const transaction of transactions) {
    if (transaction.signedAmount >= 0 || !transaction.bookingDate || transaction.status === "PENDING") continue
    const merchantKey = normalizeMerchantKey(transaction.merchantName)
    if (!merchantKey || merchantKey.length < 3) continue
    const known = identifyKnownSubscription(transaction.merchantName)
    const groupingKey = known ? `known:${known.key}` : merchantKey
    const key = `${transaction.accountId}|${transaction.currency.toUpperCase()}|${groupingKey}`
    groups.set(key, [...(groups.get(key) || []), transaction])
  }

  const detected: DetectedSubscription[] = []
  for (const group of groups.values()) {
    const sorted = group
      .map(transaction => ({ ...transaction, parsedDate: new Date(transaction.bookingDate!) }))
      .filter(transaction => !Number.isNaN(transaction.parsedDate.getTime()))
      .sort((left, right) => left.parsedDate.getTime() - right.parsedDate.getTime())
    if (!sorted.length) continue
    const known = identifyKnownSubscription(sorted.at(-1)!.merchantName)
    if (!known && sorted.length < 2) continue
    const intervals = sorted.slice(1).map((transaction, index) => daysBetween(sorted[index].parsedDate, transaction.parsedDate))
    const measuredInterval = intervals.length ? median(intervals) : 0
    const cadence = cadenceFor(measuredInterval) || known?.defaultCadence || null
    if (!cadence || (!known && cadence !== "YEARLY" && sorted.length < 3)) continue
    const fallbackInterval = cadence === "WEEKLY" ? 7 : cadence === "MONTHLY" ? 30 : cadence === "QUARTERLY" ? 91 : 365
    const typicalInterval = measuredInterval || fallbackInterval
    const tolerance = cadenceTolerance(cadence)
    const intervalConsistency = intervals.length
      ? intervals.filter(interval => Math.abs(interval - typicalInterval) <= tolerance).length / intervals.length
      : 0.75
    if (!known && intervalConsistency < 0.6) continue

    const amounts = sorted.map(transaction => Math.abs(transaction.signedAmount))
    const expectedAmount = median(amounts)
    const averageDeviation = median(amounts.map(amount => Math.abs(amount - expectedAmount)))
    const amountStability = expectedAmount > 0 ? Math.max(0, 1 - averageDeviation / expectedAmount) : 0
    const occurrenceScore = Math.min(1, sorted.length / 6)
    const recurrenceConfidence = intervalConsistency * 0.55 + amountStability * 0.25 + occurrenceScore * 0.2
    const confidence = round(known ? Math.max(0.72, recurrenceConfidence) : recurrenceConfidence)
    if (!known && confidence < 0.65) continue

    const latest = sorted.at(-1)!
    const previousAmounts = amounts.slice(0, -1)
    const previousTypicalAmount = previousAmounts.length ? median(previousAmounts) : null
    const latestAmount = amounts.at(-1) || 0
    const priceChanged = previousTypicalAmount !== null
      && latestAmount - previousTypicalAmount >= 1
      && latestAmount >= previousTypicalAmount * 1.05
    const nextExpected = nextDate(latest.parsedDate, cadence, Math.max(1, Math.round(typicalInterval)), now)

    detected.push({
      accountId: latest.accountId,
      merchantKey: normalizeMerchantKey(known?.displayName || latest.merchantName),
      displayName: known?.displayName || latest.merchantName,
      cadence,
      intervalDays: Math.round(typicalInterval),
      expectedAmount: round(expectedAmount),
      amountTolerance: round(Math.max(1, averageDeviation * 2, expectedAmount * 0.1)),
      currency: latest.currency.toUpperCase(),
      nextExpectedDate: nextExpected.toISOString().slice(0, 10),
      lastSeenAt: latest.parsedDate.toISOString().slice(0, 10),
      occurrenceCount: sorted.length,
      confidence,
      priceChanged,
      previousTypicalAmount: previousTypicalAmount === null ? null : round(previousTypicalAmount),
      latestAmount: round(latestAmount),
      transactionIds: sorted.slice(-8).map(transaction => transaction.id),
      detectionSource: known ? "KNOWN_SERVICE" : "RECURRING_PATTERN",
      detectionReason: known
        ? sorted.length > 1 ? `Recognized ${known.displayName} and found ${sorted.length} charges.` : `Recognized ${known.displayName} as a subscription service.`
        : `${sorted.length} charges repeat about every ${Math.round(typicalInterval)} days with similar amounts.`,
      serviceCategory: known?.category || null,
    })
  }

  return detected.sort((left, right) => right.confidence - left.confidence || left.nextExpectedDate.localeCompare(right.nextExpectedDate))
}

export function subscriptionDueState(nextExpectedDate: Date | string | null, reminderDays: number, now = new Date()): 'UPCOMING' | 'DUE' | 'OVERDUE' | null {
  if (!nextExpectedDate) return null
  const expected = new Date(nextExpectedDate)
  if (Number.isNaN(expected.getTime())) return null
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const days = Math.ceil((expected.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'OVERDUE'
  if (days <= Math.max(0, reminderDays)) return 'DUE'
  return 'UPCOMING'
}
