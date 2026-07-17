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

export type EnrichedTransaction = {
  merchantName: string
  detail: string | null
  transactionType: string
  category: FinanceCategory
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
    .replace(/^SUMUP\s+\*+/i, '')
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

function isGeneric(value: string): boolean {
  return /^(?:POS|CARD|CARD PURCHASE|PURCHASE|PAYMENT|BANK TRANSACTION|TRANSACTION|DEBIT|CREDIT|TRANSFER|DIRECT DEBIT|MOBILE PAY|ATM)$/i.test(value.trim())
}

function transactionCode(raw: JsonObject): string {
  const remittance = textArray(raw.remittance_information ?? raw.remittanceInformation)
  const bankCode = object(raw.bank_transaction_code ?? raw.bankTransactionCode)
  return (firstText(remittance[0], bankCode.description, bankCode.code, raw.note_type) || '').toUpperCase()
}

export function signedTransactionAmount(input: TransactionEnrichmentInput): number {
  const raw = object(input.providerData)
  const amount = Number(input.amount)
  if (!Number.isFinite(amount)) return 0
  const indicator = firstText(raw.credit_debit_indicator, raw.creditDebitIndicator)?.toUpperCase()
  if (indicator === 'DBIT' || indicator === 'DEBIT') return -Math.abs(amount)
  if (indicator === 'CRDT' || indicator === 'CREDIT') return Math.abs(amount)
  return amount
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

function categoryFor(
  merchant: string,
  detail: string | null,
  code: string,
  type: string,
  signedAmount: number,
  merchantCategoryCode: unknown,
): FinanceCategory {
  const haystack = `${merchant} ${detail || ''} ${code} ${type}`.toLowerCase()
  if (type === 'Refund' || /\brefund|reversal\b/.test(haystack)) return 'Refunds'
  if (signedAmount >= 0 && !/transfer|mobile pay/.test(haystack)) return 'Income'
  const mccCategory = categoryFromMcc(merchantCategoryCode)
  if (mccCategory) return mccCategory
  if (/\batm\b|cash withdrawal/.test(haystack)) return 'Cash'
  if (/\bfee\b|commission|currency conversion|bank charge/.test(haystack)) return 'Fees'
  if (/transfer|mobile pay|revolut|wise|paypal/.test(haystack)) return 'Transfers'
  if (/supermarket|grocery|grocer|lidl|greens|pavi|pama|welbee|smart market|convenience|food store/.test(haystack)) return 'Groceries'
  if (/restaurant|cafe|coffee|wolt|bolt food|mcdonald|burger|pizza|kfc|dining|pastizzeria|bakery|takeaway/.test(haystack)) return 'Dining'
  if (/petrol|fuel|service station|parking|transport|tallinja|uber|bolt|taxi|ferry|bus|car hire/.test(haystack)) return 'Transport'
  if (/amazon|aliexpress|temu|ebay|shein|zara|retail|department store|shopping|clothing|electronics/.test(haystack)) return 'Shopping'
  if (/electric|water|utility|telecom|internet|mobile|insurance|arms ltd|melita|epic|go plc/.test(haystack)) return 'Bills & utilities'
  if (/playstation|netflix|spotify|cinema|gaming|steam|youtube|entertainment/.test(haystack)) return 'Entertainment'
  if (/pharmacy|clinic|doctor|hospital|dental|medical|health/.test(haystack)) return 'Health'
  if (/rent|mortgage|property|real estate|housing/.test(haystack)) return 'Housing'
  if (/school|college|university|tuition|education|childcare/.test(haystack)) return 'Education'
  if (/airline|hotel|booking\.com|ryanair|easyjet|airbnb|travel/.test(haystack)) return 'Travel'
  if (/direct debit|standing order|bill payment/.test(haystack)) return 'Bills & utilities'
  return 'Other'
}

export function enrichTransaction(input: TransactionEnrichmentInput): EnrichedTransaction {
  const raw = object(input.providerData)
  const creditor = object(raw.creditor)
  const debtor = object(raw.debtor)
  const merchant = object(raw.merchant)
  const ultimateCreditor = object(raw.ultimate_creditor ?? raw.ultimateCreditor)
  const ultimateDebtor = object(raw.ultimate_debtor ?? raw.ultimateDebtor)
  const signedAmount = signedTransactionAmount(input)
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
    signedAmount,
    raw.merchant_category_code ?? raw.merchantCategoryCode,
  )

  return { merchantName, detail, transactionType, category, signedAmount }
}
