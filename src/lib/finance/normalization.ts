import { createHash } from 'node:crypto'
import { enrichTransaction } from './enrichment'

type JsonObject = Record<string, unknown>

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const candidate = string(value)
    if (candidate) return candidate
  }
  return null
}

function date(value: unknown): Date | null {
  const candidate = string(value)
  if (!candidate) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? new Date(`${candidate}T00:00:00.000Z`)
    : new Date(candidate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(textList)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (value && typeof value === 'object') {
    return Object.values(value as JsonObject).flatMap(textList)
  }
  return []
}

export function maskBankIdentifier(value: unknown): string | null {
  const candidate = string(value)?.replace(/\s+/g, '')
  if (!candidate) return null
  const suffix = candidate.slice(-4)
  return suffix ? `•••• ${suffix}` : null
}

function accountIdentifier(resource: JsonObject): string | null {
  const accountId = object(resource.account_id)
  const ids = Array.isArray(resource.all_account_ids) ? resource.all_account_ids : []
  const firstIdentification = object(ids[0]).identification
  return firstString(
    accountId.iban,
    accountId.identification,
    resource.iban,
    resource.bban,
    firstIdentification,
  )
}

export type NormalizedBankAccount = {
  providerAccountId: string
  identificationHash: string
  displayName: string
  maskedIdentifier: string | null
  currency: string
  cashAccountType: string | null
}

export function normalizeBankAccount(resource: JsonObject, fallback: Partial<NormalizedBankAccount> = {}): NormalizedBankAccount | null {
  const providerAccountId = firstString(resource.uid, resource.resource_id, resource.id, fallback.providerAccountId)
  const identificationHash = firstString(resource.identification_hash, fallback.identificationHash)
  if (!providerAccountId || !identificationHash) return null

  const identifier = accountIdentifier(resource)
  const maskedIdentifier = maskBankIdentifier(identifier) || fallback.maskedIdentifier || null
  const displayName = firstString(
    resource.name,
    resource.display_name,
    resource.product,
    fallback.displayName,
    maskedIdentifier ? `BOV account ${maskedIdentifier}` : 'Bank of Valletta account',
  ) as string

  return {
    providerAccountId,
    identificationHash,
    displayName: displayName.slice(0, 180),
    maskedIdentifier,
    currency: (firstString(resource.currency, fallback.currency, 'EUR') as string).toUpperCase().slice(0, 3),
    cashAccountType: firstString(resource.cash_account_type, resource.account_type, fallback.cashAccountType)?.slice(0, 100) || null,
  }
}

export type NormalizedBalance = {
  balanceType: string
  currency: string
  amount: string
  referenceDate: Date | null
  changedAt: Date | null
}

export function normalizeBalances(payload: JsonObject): NormalizedBalance[] {
  const balances = Array.isArray(payload.balances) ? payload.balances : []
  const normalized: NormalizedBalance[] = []
  for (const raw of balances) {
    const item = object(raw)
    const amountObject = object(item.balance_amount ?? item.balanceAmount)
    const amount = firstString(amountObject.amount, item.amount)
    const numeric = amount === null ? NaN : Number(amount)
    if (!Number.isFinite(numeric)) continue
    normalized.push({
      balanceType: (firstString(item.balance_type, item.balanceType, item.name, 'UNKNOWN') as string).slice(0, 80),
      currency: (firstString(amountObject.currency, item.currency, 'EUR') as string).toUpperCase().slice(0, 3),
      amount: String(amount),
      referenceDate: date(item.reference_date ?? item.referenceDate),
      changedAt: date(item.last_change_date_time ?? item.lastChangeDateTime),
    })
  }
  return normalized
}

export type NormalizedTransaction = {
  providerTransactionId: string | null
  deduplicationKey: string
  status: 'BOOKED' | 'PENDING'
  amount: string
  currency: string
  bookingDate: Date | null
  valueDate: Date | null
  counterparty: string | null
  description: string | null
  providerData: JsonObject
}

export function normalizeTransaction(
  raw: JsonObject,
  statusHint: 'BOOKED' | 'PENDING',
): NormalizedTransaction | null {
  const amountObject = object(raw.transaction_amount ?? raw.transactionAmount ?? raw.amount)
  const providerAmount = firstString(amountObject.amount, raw.amount)
  if (providerAmount === null || !Number.isFinite(Number(providerAmount))) return null

  const creditor = object(raw.creditor)
  const debtor = object(raw.debtor)
  const creditorAccount = object(raw.creditor_account ?? raw.creditorAccount)
  const debtorAccount = object(raw.debtor_account ?? raw.debtorAccount)
  const providerTransactionId = firstString(
    raw.entry_reference,
    raw.entryReference,
    raw.transaction_id,
    raw.transactionId,
  )
  const statusValue = firstString(raw.status, raw.transaction_status)?.toUpperCase()
  const status = statusValue?.includes('PEND') || statusValue === 'PDNG' ? 'PENDING' : statusHint
  const bookingDate = date(raw.booking_date ?? raw.bookingDate)
  const valueDate = date(raw.value_date ?? raw.valueDate)
  const providerCounterparty = firstString(
    creditor.name,
    debtor.name,
    raw.creditor_name,
    raw.debtor_name,
    creditorAccount.identification,
    debtorAccount.identification,
  )?.slice(0, 250) || null
  const descriptionParts = [
    ...textList(raw.remittance_information ?? raw.remittanceInformation),
    ...textList(raw.remittance_information_unstructured ?? raw.remittanceInformationUnstructured),
    ...textList(raw.additional_information ?? raw.additionalInformation),
    ...textList(raw.transaction_details ?? raw.transactionDetails),
  ]
  const providerDescription = [...new Set(descriptionParts)].join(' · ').slice(0, 2_000) || null
  const enrichment = enrichTransaction({
    amount: providerAmount,
    counterparty: providerCounterparty,
    description: providerDescription,
    providerData: raw,
  })
  const amount = String(enrichment.signedAmount)
  const counterparty = enrichment.merchantName.slice(0, 250) || providerCounterparty
  const description = enrichment.detail || providerDescription
  const currency = (firstString(amountObject.currency, raw.currency, 'EUR') as string).toUpperCase().slice(0, 3)
  const fallbackIdentity = JSON.stringify({
    status,
    amount,
    currency,
    bookingDate: bookingDate?.toISOString().slice(0, 10) || null,
    valueDate: valueDate?.toISOString().slice(0, 10) || null,
    counterparty,
    description,
  })
  const deduplicationKey = providerTransactionId
    ? `ref:${status}:${providerTransactionId}`
    : `hash:${createHash('sha256').update(fallbackIdentity).digest('hex')}`

  return {
    providerTransactionId,
    deduplicationKey,
    status,
    amount,
    currency,
    bookingDate,
    valueDate,
    counterparty,
    description,
    providerData: raw,
  }
}

export function isAvailableBalanceType(type: string): boolean {
  const upper = type.toUpperCase()
  return ['CLAV', 'ITAV', 'FWAV'].some(code => upper.includes(code)) || upper.includes('AVAILABLE')
}

export function isBookedBalanceType(type: string): boolean {
  const upper = type.toUpperCase()
  return ['CLBD', 'ITBD', 'OPBD', 'PRCD'].some(code => upper.includes(code)) || upper.includes('BOOKED')
}
