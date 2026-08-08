import { merchantGroupKey } from './merchant-key'
import { type Cents, fromCents, toCentsOrNull } from './money'

type JsonObject = Record<string, unknown>

export const FINANCE_CATEGORIES = [
  'Income',
  'Refunds',
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Bills & utilities',
  'Entertainment',
  'Health',
  'Housing',
  'Education',
  'Travel',
  'Cash',
  'Fees',
  'Transfers',
  'Other',
] as const

export type FinanceCategory = typeof FINANCE_CATEGORIES[number]

export type TransactionEnrichmentInput = {
  amount: string | number
  counterparty?: string | null
  description?: string | null
  providerData?: unknown
}

/**
 * Where a transaction's sign came from. `UNKNOWN` means the bank sent neither a
 * credit/debit indicator nor a signed amount, so the direction is genuinely not
 * known — such a row must never be counted as income, which is what the previous
 * `return amount` fallback did silently.
 */
export type AmountSource = 'INDICATOR' | 'SIGN' | 'UNKNOWN'

/**
 * What kind of account-to-account movement this is, read from the bank's own
 * remittance code rather than from merchant text. The distinction matters
 * because own-account legs are not spending, while a transfer to a third party
 * is.
 */
export type TransferKind = 'NONE' | 'OWN_ACCOUNT' | 'SEPA_IN' | 'SEPA_OUT' | 'MOBILE_PAY' | 'THIRD_PARTY'

export type EnrichedTransaction = {
  merchantName: string
  /** Aggregation key: groups cheque serials, casing and mobile-pay variants. */
  merchantGroupKey: string
  detail: string | null
  transactionType: string
  category: FinanceCategory
  amountCents: Cents
  amountSource: AmountSource
  transferKind: TransferKind
  /** The payer typed something meaningful, e.g. "wolt greens" on a transfer. */
  hasUserMemo: boolean
  /**
   * The memo names money that was *received* — a benefit, a salary — rather than
   * something bought. On an own-account transfer that is the difference between
   * moving income you were paid and making a purchase from the other account.
   */
  memoNamesReceivedIncome: boolean
  /** Digits identifying the other account, from the first note line. */
  counterpartyAccountHint: string | null
  /** Identifiers for the account this row belongs to, harvested from the payload. */
  ownAccountIdentifiers: string[]
  /** @deprecated Use {@link EnrichedTransaction.amountCents}. */
  signedAmount: number
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const candidate = text(value)
    if (candidate) return candidate
  }
  return null
}

function textArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(textArray)
  const candidate = text(value)
  return candidate ? [candidate] : []
}

function maskIdentifiers(value: string): string {
  return value
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{8,30}\b/gi, match => `•••• ${match.slice(-4)}`)
    .replace(/\b\d{8,}\b/g, match => `•••• ${match.slice(-4)}`)
}

function humanCase(value: string): string {
  if (!/[A-Z]/.test(value) || /[a-z]/.test(value)) return value
  return value.toLowerCase().replace(/(^|[\s/&'(-])([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
    .replace(/\b(Ltd|Plc|Atm|Bov|Go)\b/g, word => word.toUpperCase())
}

function cleanMerchant(value: string): string {
  const cleaned = value
    .replace(/[\r\n]+/g, ' ')
    .replace(/^\s*(?:POS|CARD (?:PURCHASE|PAYMENT)|PURCHASE)\s*[:*-]?\s*/i, '')
    // A payment processor is not the merchant: "PAYPAL *SPOTIFY" is Spotify, and
    // leaving the prefix on sent every processor-routed purchase to Transfers.
    .replace(/^\s*(?:PAYPAL|PP|SQ|IZ|SUMUP|STRIPE|ADYEN|ZETTLE)\s*\*+\s*/i, '')
    .replace(/\*{1,2}\d{4}\*?/g, '')
    .replace(/\s+-\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return humanCase(maskIdentifiers(cleaned)).slice(0, 160)
}

function isReferenceLine(value: string): boolean {
  return /^(?:REF(?:ERENCE)?|AUTH(?:ORISATION)?|ENTRY REF|TRACE)\s*:/i.test(value)
}

function isIdentifierOnly(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '')
  return /^\d{8,}$/.test(compact) || /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/i.test(compact)
}

/**
 * A memo naming where received money came from, rather than what it bought.
 *
 * BOV own-account transfers carry whatever the payer typed, and people label a
 * move of money they were paid with its source ("SOCIAL SECURITY EUR 545.16
 * CHILDREN'S ALLOWANCE"). Treating that as a memo makes the leg count as
 * spending, which turns received income into an expense.
 *
 * Deliberately narrow: only unambiguous benefit and payroll wording. A word like
 * "grant" is left out because it is also a name, and a false positive here hides
 * real spending — the costlier mistake of the two.
 */
const RECEIVED_INCOME_MEMO = /\b(?:social security|child(?:ren)?'?s? allowance|child benefit|pension|salary|wages?|payroll|stipend|maternity benefit|sickness benefit|unemployment benefit|tax (?:refund|rebate))\b/

function isGeneric(value: string): boolean {
  return /^(?:POS|CARD|CARD PURCHASE|PURCHASE|PAYMENT|BANK TRANSACTION|TRANSACTION|DEBIT|CREDIT|TRANSFER|DIRECT DEBIT|MOBILE PAY|ATM)$/i.test(value.trim())
}

function transactionCode(raw: JsonObject): string {
  const remittance = textArray(raw.remittance_information ?? raw.remittanceInformation)
  const bankCode = object(raw.bank_transaction_code ?? raw.bankTransactionCode)
  return (firstText(remittance[0], bankCode.description, bankCode.code, raw.note_type) || '').toUpperCase()
}

/**
 * The signed amount in cents, plus how confident we are about that sign.
 *
 * The bank's credit/debit indicator is authoritative when present. Failing that
 * an explicitly negative amount string is trustworthy. An unsigned amount with no
 * indicator is reported as `UNKNOWN` rather than guessed at.
 */
export function signedTransactionAmountCents(input: TransactionEnrichmentInput): { cents: Cents; source: AmountSource } {
  const raw = object(input.providerData)
  const cents = toCentsOrNull(input.amount)
  if (cents === null) return { cents: 0, source: 'UNKNOWN' }
  const indicator = firstText(raw.credit_debit_indicator, raw.creditDebitIndicator)?.toUpperCase()
  if (indicator === 'DBIT' || indicator === 'DEBIT') return { cents: -Math.abs(cents), source: 'INDICATOR' }
  if (indicator === 'CRDT' || indicator === 'CREDIT') return { cents: Math.abs(cents), source: 'INDICATOR' }
  if (cents < 0) return { cents, source: 'SIGN' }
  if (cents === 0) return { cents: 0, source: 'INDICATOR' }
  return { cents, source: 'UNKNOWN' }
}

/** @deprecated Use {@link signedTransactionAmountCents}. */
export function signedTransactionAmount(input: TransactionEnrichmentInput): number {
  return fromCents(signedTransactionAmountCents(input).cents)
}

/**
 * Read the movement kind from the bank's code, never from merchant text.
 *
 * This has to come from the code because on own-account transfers the merchant
 * name is often whatever the payer typed ("wolt greens"), which says nothing
 * about the mechanism.
 */
function transferKindFor(code: string): TransferKind {
  if (/transfer between own accounts/.test(code)) return 'OWN_ACCOUNT'
  if (/sct (?:instant payments )?inwards/.test(code)) return 'SEPA_IN'
  if (/sct outwards/.test(code) && !/fee/.test(code)) return 'SEPA_OUT'
  if (/pay third parties/.test(code)) return 'THIRD_PARTY'
  if (/mobile pay/.test(code)) return 'MOBILE_PAY'
  if (/transfer/.test(code)) return 'THIRD_PARTY'
  return 'NONE'
}

/** Digit runs long enough to identify an account, e.g. "40025916061". */
function accountDigits(...values: unknown[]): string[] {
  const found = new Set<string>()
  for (const value of values) {
    for (const candidate of textArray(value)) {
      for (const match of candidate.matchAll(/\d{6,}/g)) found.add(match[0])
    }
  }
  return [...found]
}

function transactionTypeFor(code: string, signedAmount: number): string {
  if (code.includes('POS')) return 'Card purchase'
  if (code.includes('ATM')) return 'Cash withdrawal'
  if (code.includes('DIRECT DEBIT')) return 'Direct debit'
  if (code.includes('STANDING')) return 'Standing order'
  if (code.includes('BILL PAYMENT')) return 'Bill payment'
  if (code.includes('SCT IN')) return 'Incoming transfer'
  if (code.includes('SCT OUT')) return code.includes('FEE') ? 'Transfer fee' : 'Outgoing transfer'
  if (code.includes('MOBILE PAY')) return signedAmount >= 0 ? 'Money received' : 'Mobile payment'
  if (code.includes('REFUND')) return 'Refund'
  if (code.includes('FEE') || code.includes('CHARGE')) return 'Bank fee'
  return signedAmount >= 0 ? 'Money received' : 'Payment'
}

function categoryFromMcc(value: unknown): FinanceCategory | null {
  const mcc = text(value)
  if (!mcc || !/^\d{4}$/.test(mcc)) return null
  const numeric = Number(mcc)
  if (['5411', '5422', '5441', '5451', '5462', '5499'].includes(mcc)) return 'Groceries'
  if (numeric >= 5811 && numeric <= 5814) return 'Dining'
  if (['4111', '4112', '4121', '4131', '4789', '5541', '5542', '7523'].includes(mcc)) return 'Transport'
  if (['4812', '4814', '4816', '4899', '4900'].includes(mcc)) return 'Bills & utilities'
  if (['5912', '8011', '8021', '8031', '8041', '8042', '8049', '8050', '8062', '8099'].includes(mcc)) return 'Health'
  if (numeric >= 3000 && numeric <= 3299 || ['4411', '4511', '4722', '7011'].includes(mcc)) return 'Travel'
  if (['6010', '6011'].includes(mcc)) return 'Cash'
  if (['4829', '6012', '6051'].includes(mcc)) return 'Transfers'
  if (['5733', '5815', '5816', '5817', '5818', '7832', '7841', '7922', '7996'].includes(mcc)) return 'Entertainment'
  if (numeric >= 5000 && numeric <= 5999) return 'Shopping'
  return null
}

type CategoryRule = { category: FinanceCategory; pattern: RegExp }

/**
 * The bank's own transaction code. Authoritative, so these win over anything
 * inferred from merchant text — "TRANSPORT MALTA FEE" is Transport spending, not
 * a bank fee, and only the code can tell us a charge really is a fee.
 */
const CODE_CATEGORY_RULES: readonly CategoryRule[] = [
  { category: 'Cash', pattern: /\batm\b|cash withdrawal|cheque withdrawal/ },
  { category: 'Fees', pattern: /\b(?:fee|charge)s?\b|commission|currency conversion/ },
  { category: 'Housing', pattern: /repayment of (?:principal|main interest|interest)|\bmortgage\b/ },
]

/** Merchant and memo text. Every keyword is word-anchored where ambiguous. */
const MERCHANT_CATEGORY_RULES: readonly CategoryRule[] = [
  { category: 'Groceries', pattern: /supermarket|grocery|grocer|lidl|greens|pavi|pama|welbee|smart market|convenience|food store/ },
  { category: 'Dining', pattern: /restaurant|cafe|coffee|wolt|bolt food|mcdonald|burger|pizza|kfc|dining|pastizzeria|bakery|takeaway|lunch/ },
  { category: 'Transport', pattern: /petrol|fuel|diesel|service station|parking|transport|tallinja|uber|bolt|taxi|ferry|\bbus\b|car hire|car rental|rent a car/ },
  { category: 'Health', pattern: /pharmacy|clinic|doctor|\bdoc\b|hospital|dental|medical|health/ },
  { category: 'Education', pattern: /school|college|university|tuition|education|childcare|nursery/ },
  { category: 'Entertainment', pattern: /playstation|netflix|spotify|cinema|gaming|steam|youtube|entertainment|bowling/ },
  { category: 'Travel', pattern: /airline|hotel|booking\.com|ryanair|easyjet|airbnb|travel/ },
  { category: 'Bills & utilities', pattern: /electric|water|utility|telecom|internet|insurance|arms ltd|melita|epic|go plc/ },
  { category: 'Shopping', pattern: /amazon|aliexpress|temu|ebay|shein|zara|retail|department store|shopping|clothing|clothes|electronics/ },
  // \brent\b so "PARENT SCHOOL FUND" is not housing and "CAR RENTAL" reaches
  // Transport above.
  { category: 'Housing', pattern: /\brent\b|mortgage|property|real estate|housing|condominium/ },
  { category: 'Fees', pattern: /\b(?:bank|service|handling|admin|late|transaction)\s+(?:fee|charge)s?\b|\bcommission\b/ },
]

/** Weaker code signals, applied only once merchant text has had its say. */
const CODE_FALLBACK_RULES: readonly CategoryRule[] = [
  { category: 'Bills & utilities', pattern: /direct debit|standing (?:order|instruction)|bill payment/ },
  { category: 'Transfers', pattern: /transfer|mobile pay|\bsct\b|pay third parties/ },
]

function matchRules(rules: readonly CategoryRule[], haystack: string): FinanceCategory | null {
  for (const rule of rules) {
    if (rule.pattern.test(haystack)) return rule.category
  }
  return null
}

function categoryFor(
  merchant: string,
  detail: string | null,
  code: string,
  type: string,
  amountCents: Cents,
  merchantCategoryCode: unknown,
): FinanceCategory {
  const codeText = `${code} ${type}`.toLowerCase()
  const merchantText = `${merchant} ${detail || ''}`.toLowerCase()

  if (type === 'Refund' || /\brefund\b|\breversal\b/.test(`${codeText} ${merchantText}`)) return 'Refunds'
  const fromCode = matchRules(CODE_CATEGORY_RULES, codeText)
  if (fromCode) return fromCode
  const fromMcc = categoryFromMcc(merchantCategoryCode)
  if (fromMcc) return fromMcc
  const fromMerchant = matchRules(MERCHANT_CATEGORY_RULES, merchantText)
  if (fromMerchant) return fromMerchant
  // Credits are resolved before the weaker code rules, so an inbound SEPA credit
  // from a payroll is income rather than being swallowed by "transfer". Only a
  // shuffle between your own accounts, or money handed over by phone, is a
  // transfer. Income is still a last resort: a credit at a recognised merchant
  // keeps that merchant's category, which is how refunds stay refunds.
  if (amountCents > 0) {
    return /transfer between own accounts|mobile pay/.test(codeText) ? 'Transfers' : 'Income'
  }
  const fromFallback = matchRules(CODE_FALLBACK_RULES, codeText)
  if (fromFallback) return fromFallback
  return 'Other'
}

export function enrichTransaction(input: TransactionEnrichmentInput): EnrichedTransaction {
  const raw = object(input.providerData)
  const creditor = object(raw.creditor)
  const debtor = object(raw.debtor)
  const merchant = object(raw.merchant)
  const ultimateCreditor = object(raw.ultimate_creditor ?? raw.ultimateCreditor)
  const ultimateDebtor = object(raw.ultimate_debtor ?? raw.ultimateDebtor)
  const { cents: amountCents, source: amountSource } = signedTransactionAmountCents(input)
  const signedAmount = fromCents(amountCents)
  const code = transactionCode(raw)
  const transactionType = transactionTypeFor(code, signedAmount)

  const structured = firstText(
    raw.merchant_name,
    merchant.name,
    raw.payee,
    signedAmount < 0 ? creditor.name : debtor.name,
    signedAmount < 0 ? ultimateCreditor.name : ultimateDebtor.name,
  )
  const noteLines = textArray(raw.note)
    .flatMap(value => value.split(/[\r\n]+/))
    .map(value => value.trim())
    .filter(value => value && !isReferenceLine(value))
  const meaningfulNoteLines = noteLines.filter(value => !isIdentifierOnly(value) && !isGeneric(value))

  const fallbackText = [input.counterparty, ...(input.description || '').split('·')]
    .map(value => value?.trim() || '')
    .find(value => value && !isGeneric(value) && !isReferenceLine(value) && !isIdentifierOnly(value))
  const merchantCandidate = structured || meaningfulNoteLines[0] || fallbackText || transactionType
  const merchantName = cleanMerchant(merchantCandidate) || transactionType
  // Whether a human labelled this movement. On own-account transfers this is the
  // difference between a real purchase made from another of your accounts and a
  // pure balance shuffle, so it decides whether the row counts as spending.
  const hasUserMemo = Boolean(structured || meaningfulNoteLines[0] || fallbackText)

  const detailParts = meaningfulNoteLines
    .slice(structured ? 0 : 1)
    .map(value => maskIdentifiers(value.replace(/\s+-\s*$/g, '').trim()))
    .filter(value => value && value.toLowerCase() !== merchantName.toLowerCase())
  const detail = [...new Set(detailParts)].slice(0, 2).join(' · ').slice(0, 260) || null
  const category = categoryFor(
    merchantName,
    detail,
    code,
    transactionType,
    amountCents,
    raw.merchant_category_code ?? raw.merchantCategoryCode,
  )

  return {
    merchantName,
    merchantGroupKey: merchantGroupKey(merchantName),
    detail,
    transactionType,
    category,
    amountCents,
    amountSource,
    transferKind: transferKindFor(code.toLowerCase()),
    hasUserMemo,
    memoNamesReceivedIncome: hasUserMemo
      && RECEIVED_INCOME_MEMO.test(`${merchantName} ${detail || ''}`.toLowerCase()),
    // BOV puts the counterparty account number on the first note line; the
    // creditor/debtor IBAN is this row's own account, not the other side.
    counterpartyAccountHint: accountDigits(noteLines[0])[0] || null,
    ownAccountIdentifiers: accountDigits(
      object(raw.creditor_account ?? raw.creditorAccount).iban,
      object(raw.debtor_account ?? raw.debtorAccount).iban,
    ),
    signedAmount,
  }
}
