import assert from 'node:assert/strict'
import { generateKeyPairSync, verify } from 'node:crypto'
import test from 'node:test'
import {
  createEnableBankingJwt,
  EnableBankingError,
  isRateLimitError,
  isReauthorizationError,
  publicSyncError,
} from '../src/lib/finance/enable-banking'
import { getFinanceAspsp, getFinanceRedirectUrl, isFinanceProviderConfigured } from '../src/lib/finance/config'
import {
  maskBankIdentifier,
  normalizeBalances,
  normalizeBankAccount,
  normalizeTransaction,
} from '../src/lib/finance/normalization'
import { buildAccessibleBankAccountWhere, dedupeAccountsByIdentity } from '../src/lib/finance/visibility'
import { enrichTransaction } from '../src/lib/finance/enrichment'
import { buildBankingAnalytics } from '../src/lib/finance/analytics'
import type { AnalyticsInput, AnalyticsTransactionInput } from '../src/lib/finance/analytics-types'
import { buildBudgetProgress, buildUpcomingBills } from '../src/lib/finance/budgets'
import { deriveBalanceTrend } from '../src/lib/finance/balance-trend'
import { classifyFlow, type ClassifiableRow } from '../src/lib/finance/classification'
import { merchantGroupKey } from '../src/lib/finance/merchant-key'
import { bucketByCalendar, bucketUnitFor } from '../src/components/charts/bucketing'
import { filterField } from '../src/hooks/useUrlFilters'
import { bandScale, linearScale, niceTicks } from '../src/components/charts/chart-scales'
import { centsToFixed, changePercent, percentOf, toCents, toCentsOrNull } from '../src/lib/finance/money'
import { matchInternalTransfers, type TransferCandidate } from '../src/lib/finance/transfers'
import { deduplicationKeyFor, isLegacyDeduplicationKey } from '../src/lib/finance/normalization'
import { enrichWithFinanceMetadata, normalizeMerchantKey } from '../src/lib/finance/metadata'
import { detectSubscriptions, subscriptionDueState } from '../src/lib/finance/subscriptions'
import { buildCoachSignals } from '../src/lib/finance/coach'
import { buildDeepSeekRequestBody, buildRedactedFinancePayload, hashRedactedPayload } from "../src/lib/finance/deepseek"

test('finance reads are scoped to ownership or an explicit household share', () => {
  assert.deepEqual(buildAccessibleBankAccountWhere('owner-id', 'household-id'), {
    OR: [
      { connection: { userId: 'owner-id' } },
      { shares: { some: { householdId: 'household-id' } } },
    ],
  })
})

test('a jointly held account is counted once, keeping the viewer’s own copy', () => {
  // The same real account imported through two people's logins: one row per
  // connection, sharing the provider identification hash.
  const mine = {
    id: 'account-mine',
    identificationHash: 'joint-hash',
    connection: { userId: 'me', lastSyncedAt: new Date('2026-08-01T00:00:00Z') },
  }
  const theirs = {
    id: 'account-theirs',
    identificationHash: 'joint-hash',
    // Synced more recently, and still must not win over the viewer's own copy.
    connection: { userId: 'partner', lastSyncedAt: new Date('2026-08-04T00:00:00Z') },
  }
  const separate = {
    id: 'account-separate',
    identificationHash: 'other-hash',
    connection: { userId: 'partner', lastSyncedAt: null },
  }

  assert.deepEqual(
    dedupeAccountsByIdentity([theirs, mine, separate], 'me').map(account => account.id),
    ['account-mine', 'account-separate'],
  )
  // Order of the input must not change which copy survives.
  assert.deepEqual(
    dedupeAccountsByIdentity([mine, theirs, separate], 'me').map(account => account.id),
    ['account-mine', 'account-separate'],
  )
})

test('a joint account the viewer does not own falls back to the freshest copy', () => {
  const stale = {
    id: 'account-stale',
    identificationHash: 'joint-hash',
    connection: { userId: 'partner', lastSyncedAt: new Date('2026-08-01T00:00:00Z') },
  }
  const fresh = {
    id: 'account-fresh',
    identificationHash: 'joint-hash',
    connection: { userId: 'child', lastSyncedAt: new Date('2026-08-04T00:00:00Z') },
  }
  assert.deepEqual(
    dedupeAccountsByIdentity([stale, fresh], 'me').map(account => account.id),
    ['account-fresh'],
  )

  // Never synced on either side: the tie breaks on id so the choice is stable
  // across requests rather than dependent on the order rows came back in.
  const neverA = { id: 'account-a', identificationHash: 'h', connection: { userId: 'x', lastSyncedAt: null } }
  const neverB = { id: 'account-b', identificationHash: 'h', connection: { userId: 'y', lastSyncedAt: null } }
  assert.deepEqual(dedupeAccountsByIdentity([neverB, neverA], 'me').map(a => a.id), ['account-a'])
  assert.deepEqual(dedupeAccountsByIdentity([neverA, neverB], 'me').map(a => a.id), ['account-a'])
})

test('provider configuration supports a base64 PEM and BOV defaults', () => {
  const previousId = process.env.ENABLE_BANKING_APPLICATION_ID
  const previousKey = process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64
  const previousName = process.env.ENABLE_BANKING_ASPSP_NAME
  const previousCountry = process.env.ENABLE_BANKING_ASPSP_COUNTRY
  process.env.ENABLE_BANKING_APPLICATION_ID = 'app-id'
  process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64 = 'cGVt'
  delete process.env.ENABLE_BANKING_ASPSP_NAME
  delete process.env.ENABLE_BANKING_ASPSP_COUNTRY
  try {
    assert.equal(isFinanceProviderConfigured(), true)
    assert.deepEqual(getFinanceAspsp(), { name: 'Bank Of Valetta', country: 'MT' })
  } finally {
    if (previousId === undefined) delete process.env.ENABLE_BANKING_APPLICATION_ID
    else process.env.ENABLE_BANKING_APPLICATION_ID = previousId
    if (previousKey === undefined) delete process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64
    else process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64 = previousKey
    if (previousName === undefined) delete process.env.ENABLE_BANKING_ASPSP_NAME
    else process.env.ENABLE_BANKING_ASPSP_NAME = previousName
    if (previousCountry === undefined) delete process.env.ENABLE_BANKING_ASPSP_COUNTRY
    else process.env.ENABLE_BANKING_ASPSP_COUNTRY = previousCountry
  }
})

test('the authorization redirect matches the registered URL, override included', () => {
  const previousAppUrl = process.env.APP_URL
  const previousRedirect = process.env.ENABLE_BANKING_REDIRECT_URL
  process.env.APP_URL = 'https://clankeep.com/'
  delete process.env.ENABLE_BANKING_REDIRECT_URL
  try {
    assert.equal(getFinanceRedirectUrl(), 'https://clankeep.com/api/finance/callback')
    process.env.ENABLE_BANKING_REDIRECT_URL = 'https://nathley.com/houseflow/api/finance/callback'
    assert.equal(getFinanceRedirectUrl(), 'https://nathley.com/houseflow/api/finance/callback')
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL
    else process.env.APP_URL = previousAppUrl
    if (previousRedirect === undefined) delete process.env.ENABLE_BANKING_REDIRECT_URL
    else process.env.ENABLE_BANKING_REDIRECT_URL = previousRedirect
  }
})

test('Enable Banking JWT is short-lived, correctly addressed, and RSA signed', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const previousId = process.env.ENABLE_BANKING_APPLICATION_ID
  const previousPem = process.env.ENABLE_BANKING_PRIVATE_KEY
  const previousBase64 = process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64
  process.env.ENABLE_BANKING_APPLICATION_ID = 'finance-app-id'
  process.env.ENABLE_BANKING_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  delete process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64
  try {
    const token = createEnableBankingJwt(new Date('2026-07-16T09:00:00.000Z'))
    const [encodedHeader, encodedPayload, signature] = token.split('.')
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    assert.deepEqual(header, { typ: 'JWT', alg: 'RS256', kid: 'finance-app-id' })
    assert.equal(payload.iss, 'enablebanking.com')
    assert.equal(payload.aud, 'api.enablebanking.com')
    assert.equal(payload.exp - payload.iat, 300)
    assert.equal(verify(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(signature, 'base64url'),
    ), true)
  } finally {
    if (previousId === undefined) delete process.env.ENABLE_BANKING_APPLICATION_ID
    else process.env.ENABLE_BANKING_APPLICATION_ID = previousId
    if (previousPem === undefined) delete process.env.ENABLE_BANKING_PRIVATE_KEY
    else process.env.ENABLE_BANKING_PRIVATE_KEY = previousPem
    if (previousBase64 === undefined) delete process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64
    else process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64 = previousBase64
  }
})

test('BOV account and balance resources normalize without exposing a full IBAN', () => {
  const account = normalizeBankAccount({
    uid: 'provider-account-id',
    identification_hash: 'stable-account-hash',
    account_id: { iban: 'MT84MALT011000012345MTLCAST001S' },
    name: 'Current account',
    currency: 'eur',
    cash_account_type: 'CACC',
  })
  assert.deepEqual(account, {
    providerAccountId: 'provider-account-id',
    identificationHash: 'stable-account-hash',
    displayName: 'Current account',
    maskedIdentifier: '•••• 001S',
    currency: 'EUR',
    cashAccountType: 'CACC',
  })
  assert.equal(maskBankIdentifier('MT1234567890'), '•••• 7890')
  assert.deepEqual(normalizeBalances({ balances: [{
    balance_type: 'CLAV',
    balance_amount: { amount: '123.45', currency: 'EUR' },
    reference_date: '2026-07-16',
  }] })[0]?.amount, '123.45')
})

test('transaction references deduplicate deterministically and keep pending separate', () => {
  const raw = {
    entry_reference: 'bov-123',
    transaction_amount: { amount: '-19.95', currency: 'EUR' },
    booking_date: '2026-07-15',
    creditor: { name: 'Example Market' },
    remittance_information: ['Card purchase'],
  }
  const booked = normalizeTransaction(raw, 'BOOKED')
  const sameBooked = normalizeTransaction({ ...raw }, 'BOOKED')
  const pending = normalizeTransaction(raw, 'PENDING')
  assert.equal(booked?.deduplicationKey, sameBooked?.deduplicationKey)
  assert.notEqual(booked?.deduplicationKey, pending?.deduplicationKey)
  assert.equal(booked?.counterparty, 'Example Market')
  assert.equal(booked?.description, 'Card purchase')
})

test('BOV debit indicators and note lines produce a useful merchant instead of POS', () => {
  const raw = {
    entry_reference: 'bov-pos-1',
    transaction_amount: { amount: '24.50', currency: 'EUR' },
    credit_debit_indicator: 'DBIT',
    booking_date: '2026-07-15',
    note: 'LIDL MALTA - \rSliema\rREF: PRIVATE-REFERENCE',
    remittance_information: ['POS', 'Card transaction'],
  }
  const normalized = normalizeTransaction(raw, 'BOOKED')
  // Stored columns hold what the bank said; the display name is derived on read.
  assert.equal(normalized?.amount, '-24.50')
  assert.equal(normalized?.counterparty, null)
  assert.equal(normalized?.description, 'POS · Card transaction')
  const enriched = enrichTransaction({ amount: '24.50', providerData: raw })
  assert.equal(enriched.merchantName, 'Lidl Malta')
  assert.equal(enriched.detail, 'Sliema')
  assert.equal(enriched.transactionType, 'Card purchase')
  assert.equal(enriched.category, 'Groceries')
  assert.equal(enriched.amountCents, -2450)
  assert.equal(enriched.amountSource, 'INDICATOR')
  assert.equal(enriched.transferKind, 'NONE')
})

/**
 * The whole path from a raw provider payload through enrichment, transfer
 * pairing and classification into the totals. The unit tests below build
 * pre-enriched rows; this one proves the pieces fit together.
 */
function fromProviderPayload(input: {
  id: string
  accountId: string
  amount: string
  bookingDate: string
  indicator: 'DBIT' | 'CRDT'
  code: string
  note?: string[]
}): AnalyticsTransactionInput {
  const providerData = {
    remittance_information: [input.code],
    credit_debit_indicator: input.indicator,
    note: input.note ?? [],
  }
  const enriched = enrichTransaction({ amount: input.amount, providerData })
  return {
    id: input.id,
    accountId: input.accountId,
    accountName: null,
    currency: 'EUR',
    amountCents: enriched.amountCents,
    amountSource: enriched.amountSource,
    memoNamesReceivedIncome: enriched.memoNamesReceivedIncome,
    bookingDate: new Date(`${input.bookingDate}T00:00:00Z`),
    valueDate: null,
    status: 'BOOKED',
    merchantName: enriched.merchantName,
    merchantGroupKey: enriched.merchantGroupKey,
    detail: enriched.detail,
    category: enriched.category,
    transactionType: enriched.transactionType,
    transferKind: enriched.transferKind,
    hasUserMemo: enriched.hasUserMemo,
    counterpartyAccountHint: enriched.counterpartyAccountHint,
    ownAccountIdentifiers: enriched.ownAccountIdentifiers,
  }
}

test('real provider payloads produce totals that exclude own-account transfers', () => {
  const result = buildBankingAnalytics({
    transactions: [
      fromProviderPayload({ id: 'cafe-now', accountId: 'account-1', amount: '40', bookingDate: '2026-07-15', indicator: 'DBIT', code: 'POS', note: ['Corner Cafe -'] }),
      fromProviderPayload({ id: 'salary', accountId: 'account-1', amount: '1000', bookingDate: '2026-07-14', indicator: 'CRDT', code: 'SCT INWARDS', note: ['Salary'] }),
      // Both legs of a move between the household's own accounts.
      fromProviderPayload({ id: 'move-out', accountId: 'account-1', amount: '500', bookingDate: '2026-07-13', indicator: 'DBIT', code: '24X7 TRANSFER BETWEEN OWN ACCOUNTS', note: ['40025916061'] }),
      fromProviderPayload({ id: 'move-in', accountId: 'account-2', amount: '500', bookingDate: '2026-07-13', indicator: 'CRDT', code: '24X7 TRANSFER BETWEEN OWN ACCOUNTS', note: ['40014579684'] }),
      // A credit from an own account we cannot see: moved money, not new money.
      fromProviderPayload({ id: 'phantom-in', accountId: 'account-1', amount: '3500', bookingDate: '2026-07-12', indicator: 'CRDT', code: '24X7 TRANSFER BETWEEN OWN ACCOUNTS', note: ['40099990813'] }),
      // A debit to that same unseen account, but labelled: a real purchase.
      fromProviderPayload({ id: 'memo-out', accountId: 'account-1', amount: '188', bookingDate: '2026-07-11', indicator: 'DBIT', code: '24X7 TRANSFER BETWEEN OWN ACCOUNTS', note: ['40099990813', 'greens'] }),
      fromProviderPayload({ id: 'cafe-before', accountId: 'account-1', amount: '20', bookingDate: '2026-06-15', indicator: 'DBIT', code: 'POS', note: ['Corner Cafe -'] }),
    ],
    accounts: [],
    limits: [],
    subscriptions: [],
    periodDays: 30,
    now: new Date('2026-07-16T12:00:00Z'),
  })
  const eur = result.currencies[0]

  assert.equal(eur.summary.incomeCents, 100_000)
  assert.equal(eur.summary.spendingCents, 22_800)
  assert.equal(eur.summary.netCents, 77_200)
  assert.equal(eur.summary.comparison.spendingChangePercent, 1_040)
  assert.equal(eur.summary.savingsRatePercent, 77.2)
  assert.equal(eur.summary.counts.internalMatched, 2)
  assert.equal(eur.summary.counts.internalUnmatchedIn, 1)
  assert.equal(eur.internalTransfers.matchedPairCount, 1)
  assert.equal(eur.internalTransfers.unmatchedInCents, 350_000)

  // The memo'd debit is spending, and the memo is what categorised it.
  const groceries = eur.categories.find(category => category.category === 'Groceries')
  assert.equal(groceries?.amountCents, 18_800)
  const dining = eur.categories.find(category => category.category === 'Dining')
  assert.equal(dining?.amountCents, 4_000)
  assert.equal(dining?.previousAmountCents, 2_000)
  assert.equal(eur.merchants.some(merchant => merchant.merchantName === 'Corner Cafe'), true)
})

test('friendly merchant rules normalize provider noise and overrides take precedence', () => {
  assert.equal(normalizeMerchantKey('POS SUMUP ** LIDL Malta LTD'), 'lidl malta')
  const input = {
    id: 'transaction-1', accountId: 'account-1', amount: '9.50',
    providerData: { credit_debit_indicator: 'DBIT', note: 'LIDL MALTA -', remittance_information: ['POS'] },
  }
  const ruled = enrichWithFinanceMetadata(input, [{
    id: 'rule-1', accountId: 'account-1', matchType: 'EXACT', matchValue: 'lidl malta',
    merchantName: 'Weekly groceries', category: 'Groceries', enabled: true,
  }])
  assert.equal(ruled.merchantName, 'Weekly groceries')
  assert.equal(ruled.enrichmentSource, 'rule')
  const overridden = enrichWithFinanceMetadata(input, [], [{ transactionId: 'transaction-1', merchantName: 'My Lidl', category: 'Shopping' }])
  assert.equal(overridden.merchantName, 'My Lidl')
  assert.equal(overridden.category, 'Shopping')
  assert.equal(overridden.enrichmentSource, 'override')
})

test('subscription recognizer finds monthly recurrence and a meaningful price increase', () => {
  const transactions = [
    ['2026-03-10', -9.99], ['2026-04-10', -9.99], ['2026-05-10', -9.99], ['2026-06-10', -10.99],
  ].map(([bookingDate, signedAmount], index) => ({
    id: `sub-${index}`, accountId: 'account-1', merchantName: 'Example Streaming',
    signedAmount: Number(signedAmount), currency: 'EUR', bookingDate: String(bookingDate), status: 'BOOKED',
  }))
  const subscriptions = detectSubscriptions(transactions, new Date('2026-06-15T00:00:00Z'))
  assert.equal(subscriptions.length, 1)
  assert.equal(subscriptions[0].cadence, 'MONTHLY')
  assert.equal(subscriptions[0].occurrenceCount, 4)
  assert.equal(subscriptions[0].priceChanged, true)
  assert.equal(subscriptions[0].nextExpectedDate, '2026-07-10')
  assert.equal(subscriptionDueState('2026-06-16', 3, new Date('2026-06-15T12:00:00Z')), 'DUE')
  assert.equal(subscriptionDueState('2026-06-14', 3, new Date('2026-06-15T12:00:00Z')), 'OVERDUE')
})

test('subscription recognizer identifies a known service from one charge', () => {
  const subscriptions = detectSubscriptions([{
    id: 'netflix-1', accountId: 'account-1', merchantName: 'NETFLIX.COM 35314369001',
    signedAmount: -15.49, currency: 'EUR', bookingDate: '2026-07-10', status: 'BOOKED',
  }], new Date('2026-07-16T00:00:00Z'))
  assert.equal(subscriptions.length, 1)
  assert.equal(subscriptions[0].displayName, 'Netflix')
  assert.equal(subscriptions[0].detectionSource, 'KNOWN_SERVICE')
  assert.equal(subscriptions[0].cadence, 'MONTHLY')
  assert.ok(subscriptions[0].confidence >= 0.72)
})

test('subscription recognizer identifies Disney Plus aliases', () => {
  const subscriptions = detectSubscriptions([{
    id: 'disney-1', accountId: 'account-1', merchantName: 'DISNEYPLUS',
    signedAmount: -10.99, currency: 'EUR', bookingDate: '2026-07-08', status: 'BOOKED',
  }], new Date('2026-07-16T00:00:00Z'))
  assert.equal(subscriptions[0].displayName, 'Disney+')
  assert.equal(subscriptions[0].serviceCategory, 'Entertainment')
})

test('subscription recognizer rejects irregular one-off spending', () => {
  const transactions = ['2026-01-01', '2026-01-19', '2026-04-29'].map((bookingDate, index) => ({
    id: `irregular-${index}`, accountId: 'account-1', merchantName: 'Example Shop',
    signedAmount: -20 - index, currency: 'EUR', bookingDate, status: 'BOOKED',
  }))
  assert.deepEqual(detectSubscriptions(transactions, new Date('2026-05-01T00:00:00Z')), [])
})

test('spending coach reports explainable discretionary changes and excludes bills', () => {
  const currentDining = Array.from({ length: 7 }, (_, index) => ({
    id: `current-${index}`, accountId: 'account-1', merchantName: 'Corner Cafe', category: 'Dining',
    signedAmount: -10, currency: 'EUR', bookingDate: `2026-07-${String(index + 2).padStart(2, '0')}`, status: 'BOOKED',
  }))
  const priorDining = Array.from({ length: 3 }, (_, index) => ({
    id: `prior-${index}`, accountId: 'account-1', merchantName: 'Corner Cafe', category: 'Dining',
    signedAmount: -10, currency: 'EUR', bookingDate: `2026-06-${String(index + 4).padStart(2, '0')}`, status: 'BOOKED',
  }))
  const bills = Array.from({ length: 8 }, (_, index) => ({
    id: `bill-${index}`, accountId: 'account-1', merchantName: 'Utility Co', category: 'Bills & utilities',
    signedAmount: -50, currency: 'EUR', bookingDate: `2026-07-${String(index + 2).padStart(2, '0')}`, status: 'BOOKED',
  }))
  const signals = buildCoachSignals([...currentDining, ...priorDining, ...bills], new Set(), new Date('2026-07-16T12:00:00Z'))
  assert.ok(signals.some(signal => signal.kind === 'SPEND_TREND' && signal.title.includes('Dining')))
  assert.ok(signals.some(signal => signal.kind === 'FREQUENCY' && signal.title.includes('Corner Cafe')))
  assert.equal(signals.some(signal => signal.title.includes('Utility')), false)
})

test('monthly limits calculate spend, projection, and exceeded status', () => {
  const limit = {
    id: 'limit-1', accountId: null, scope: 'CATEGORY' as const, scopeKey: 'Dining', displayName: 'Dining',
    amountCents: 5_000, currency: 'EUR', enabled: true,
  }
  const spend = classifiedRow({ id: 'transaction-1', amountCents: -6_000, category: 'Dining', bookingDate: '2026-07-10' })
  const progress = buildBudgetProgress([limit], [spend], new Date('2026-07-16T12:00:00Z'))
  assert.equal(progress[0].spentCents, 6_000)
  assert.equal(progress[0].percentage, 120)
  assert.equal(progress[0].exceeded, true)
  assert.equal(progress[0].projectionBasis, 'ELAPSED_DAYS')
  assert.ok((progress[0].projectedCents ?? 0) >= progress[0].spentCents)

  // Two days into the month, scaling by the day of the month is noise, so no
  // projection is offered rather than a wild one.
  const early = buildBudgetProgress([limit], [spend], new Date('2026-07-03T12:00:00Z'))
  assert.equal(early[0].projectedCents, null)
  assert.equal(early[0].projectionBasis, 'INSUFFICIENT_DATA')
})

test('DeepSeek payload contains rounded aggregates and no raw banking identifiers', () => {
  const payload = buildRedactedFinancePayload([{
    id: 'transaction-secret', accountId: 'account-secret', merchantName: 'Shop REF 92837465', category: 'Shopping',
    signedAmount: -19.73, currency: 'EUR', bookingDate: '2026-07-15', status: 'BOOKED',
  }], new Date('2026-07-16T12:00:00Z'))
  const serialized = JSON.stringify(payload)
  assert.equal(serialized.includes('transaction-secret'), false)
  assert.equal(serialized.includes('account-secret'), false)
  assert.equal(serialized.includes('92837465'), false)
  assert.equal(serialized.includes('2026-07-15'), false)
  assert.equal(payload.currencies[0].outgoingRounded, 20)
  assert.equal(payload.currencies[0].merchants[0].sanitizedLabel, 'Shop')
  assert.match(hashRedactedPayload(payload), /^[a-f0-9]{64}$/)
  const request = buildDeepSeekRequestBody(payload)
  assert.deepEqual(request.thinking, { type: "disabled" })
  assert.equal(request.response_format.type, "json_object")
  assert.equal(request.max_tokens, 2200)
})

test('a bank daily access cap is classified as a rate limit, not a broken consent', () => {
  const capped = new EnableBankingError('Maximum daily access exceeded', 429, 'ACCESS_EXCEEDED')
  assert.equal(isRateLimitError(capped), true)
  assert.equal(isReauthorizationError(capped), false)
  assert.match(publicSyncError(capped), /refreshes per day/)

  const revoked = new EnableBankingError('Bank consent is no longer active', 401, 'SESSION_REVOKED')
  assert.equal(isRateLimitError(revoked), false)
  assert.equal(isReauthorizationError(revoked), true)

  const other = new EnableBankingError('Enable Banking did not respond in time', 504, 'TIMEOUT')
  assert.equal(isRateLimitError(other), false)
  assert.equal(publicSyncError(other), 'Enable Banking did not respond in time')
})

// --- Integer-cent money -------------------------------------------------------

test('amounts parse to exact cents without passing through a float', () => {
  assert.equal(toCents('1911.5000'), 191_150)
  assert.equal(toCents('-24.5'), -2_450)
  assert.equal(toCents('0.0050'), 1)
  // Math.round(1.005 * 100) gives 100; string parsing gives the correct 101.
  assert.equal(toCents('1.005'), 101)
  assert.equal(toCents('0'), 0)
  assert.equal(toCents(12.34), 1_234)
  assert.equal(toCents('1234567890123.99'), 123_456_789_012_399)
  assert.equal(toCentsOrNull('abc'), null)
  assert.equal(toCentsOrNull(''), null)
  assert.equal(toCentsOrNull(null), null)
  assert.equal(centsToFixed(-2_450), '-24.50')
  assert.equal(centsToFixed(5), '0.05')
  // A share of nothing and growth from nothing are undefined, never zero.
  assert.equal(percentOf(50, 0), null)
  assert.equal(changePercent(10, 0), null)
  assert.equal(changePercent(150, 100), 50)
})

// --- Internal transfer pairing ------------------------------------------------

function transferLeg(overrides: Partial<TransferCandidate> & { id: string }): TransferCandidate {
  return {
    accountId: 'account-1',
    currency: 'EUR',
    amountCents: -20_000,
    bookingDate: new Date('2026-07-13T00:00:00Z'),
    transferKind: 'OWN_ACCOUNT',
    hasUserMemo: false,
    counterpartyAccountHint: null,
    ...overrides,
  }
}

test('mirrored own-account legs pair once and are counted once', () => {
  const result = matchInternalTransfers([
    transferLeg({ id: 'out', accountId: 'a', amountCents: -191_150 }),
    transferLeg({ id: 'in', accountId: 'b', amountCents: 191_150 }),
  ])
  assert.equal(result.pairs.length, 1)
  assert.equal(result.pairs[0].amountCents, 191_150)
  assert.equal(result.pairs[0].outgoingId, 'out')
  assert.equal(result.pairs[0].incomingId, 'in')
  assert.deepEqual([...result.pairedIds].sort(), ['in', 'out'])
  assert.equal(result.unmatched.length, 0)
})

test('transfer pairing respects the date window in both directions', () => {
  const within = matchInternalTransfers([
    transferLeg({ id: 'out', accountId: 'a' }),
    transferLeg({ id: 'in', accountId: 'b', amountCents: 20_000, bookingDate: new Date('2026-07-16T00:00:00Z') }),
  ])
  assert.equal(within.pairs.length, 1)

  const tooLate = matchInternalTransfers([
    transferLeg({ id: 'out', accountId: 'a' }),
    transferLeg({ id: 'in', accountId: 'b', amountCents: 20_000, bookingDate: new Date('2026-07-17T00:00:00Z') }),
  ])
  assert.equal(tooLate.pairs.length, 0)

  // Money cannot land two days before it leaves.
  const arrivesFirst = matchInternalTransfers([
    transferLeg({ id: 'out', accountId: 'a' }),
    transferLeg({ id: 'in', accountId: 'b', amountCents: 20_000, bookingDate: new Date('2026-07-11T00:00:00Z') }),
  ])
  assert.equal(arrivesFirst.pairs.length, 0)
})

test('a transfer leg can only be matched once, and ties resolve deterministically', () => {
  const legs = [
    transferLeg({ id: 'out-1', accountId: 'a' }),
    transferLeg({ id: 'out-2', accountId: 'a', bookingDate: new Date('2026-07-14T00:00:00Z') }),
    transferLeg({ id: 'in-1', accountId: 'b', amountCents: 20_000 }),
  ]
  const result = matchInternalTransfers(legs)
  assert.equal(result.pairs.length, 1)
  assert.equal(result.pairs[0].outgoingId, 'out-1')
  assert.equal(result.unmatched.length, 1)
  assert.equal(result.unmatched[0].id, 'out-2')
  // Reversing the input cannot change the outcome.
  assert.deepEqual(matchInternalTransfers([...legs].reverse()).pairs, result.pairs)
})

test('an account hint decides between two otherwise identical candidates', () => {
  const result = matchInternalTransfers([
    transferLeg({ id: 'out', accountId: 'a', counterpartyAccountHint: '40025916061' }),
    transferLeg({ id: 'in-b', accountId: 'b', amountCents: 20_000 }),
    transferLeg({ id: 'in-c', accountId: 'c', amountCents: 20_000 }),
  ], { accountIdentifiers: new Map([['c', new Set(['40025916061'])]]) })
  assert.equal(result.pairs.length, 1)
  assert.equal(result.pairs[0].incomingAccountId, 'c')
  assert.equal(result.pairs[0].confidence, 'ACCOUNT_HINT')
})

test('transfers never pair across accounts they should not', () => {
  // Same account: a debit and credit on one account are not a transfer.
  assert.equal(matchInternalTransfers([
    transferLeg({ id: 'out', accountId: 'a' }),
    transferLeg({ id: 'in', accountId: 'a', amountCents: 20_000 }),
  ]).pairs.length, 0)

  // Different currencies: the two sides differ in amount, so they cannot match.
  const crossCurrency = matchInternalTransfers([
    transferLeg({ id: 'out', accountId: 'a', currency: 'EUR' }),
    transferLeg({ id: 'in', accountId: 'b', currency: 'USD', amountCents: 20_000 }),
  ])
  assert.equal(crossCurrency.pairs.length, 0)
  assert.deepEqual(crossCurrency.crossCurrencyCurrencies, ['EUR', 'USD'])

  // A card purchase and a same-value refund are not two legs of a transfer.
  assert.equal(matchInternalTransfers([
    transferLeg({ id: 'pos', accountId: 'a', amountCents: -4_000, transferKind: 'NONE' }),
    transferLeg({ id: 'refund', accountId: 'b', amountCents: 4_000, transferKind: 'NONE' }),
  ]).pairs.length, 0)
})

// --- Flow classification ------------------------------------------------------

function classifiableRow(overrides: Partial<ClassifiableRow> & { id: string }): ClassifiableRow {
  return {
    amountCents: -1_000,
    amountSource: 'INDICATOR',
    category: 'Groceries',
    transferKind: 'NONE',
    hasUserMemo: true,
    ...overrides,
  }
}

test('flow classification separates spending, income, refunds and moved money', () => {
  const none = new Set<string>()
  assert.equal(classifyFlow(classifiableRow({ id: '1' }), none), 'SPENDING')
  assert.equal(classifyFlow(classifiableRow({ id: '2', amountCents: 100_000, category: 'Income' }), none), 'INCOME')
  assert.equal(classifyFlow(classifiableRow({ id: '3', amountCents: 3_000, category: 'Refunds' }), none), 'REFUND')
  assert.equal(classifyFlow(classifiableRow({ id: '4', amountCents: 0 }), none), 'ZERO')
  // No direction from the bank: counted nowhere rather than assumed to be income.
  assert.equal(classifyFlow(classifiableRow({ id: '5', amountCents: 2_450, amountSource: 'UNKNOWN' }), none), 'UNKNOWN_SIGN')
  assert.equal(classifyFlow(classifiableRow({ id: '6', amountCents: -2_450, amountSource: 'SIGN' }), none), 'SPENDING')
  assert.equal(classifyFlow(classifiableRow({ id: '7' }), new Set(['7'])), 'INTERNAL_MATCHED')
})

test('own-account movement is judged by whether anyone labelled it', () => {
  const none = new Set<string>()
  // The real €11.7k case: a credit from an account we cannot see is not income.
  assert.equal(classifyFlow(classifiableRow({
    id: 'phantom', amountCents: 350_000, transferKind: 'OWN_ACCOUNT', hasUserMemo: false, category: 'Transfers',
  }), none), 'INTERNAL_UNMATCHED_IN')

  // A memo'd debit is a purchase made from that other account, and the memo gives
  // it a category.
  assert.equal(classifyFlow(classifiableRow({
    id: 'greens', amountCents: -18_800, transferKind: 'OWN_ACCOUNT', hasUserMemo: true, category: 'Groceries',
  }), none), 'SPENDING')

  assert.equal(classifyFlow(classifiableRow({
    id: 'shuffle', amountCents: -200_000, transferKind: 'OWN_ACCOUNT', hasUserMemo: false, category: 'Transfers',
  }), none), 'INTERNAL_UNMATCHED_OUT')

  // A memo naming money the household was *paid* says where it came from, not
  // what it bought. The real case: moving a €545.16 children's allowance between
  // own accounts was counted as €545.16 of spending.
  assert.equal(classifyFlow(classifiableRow({
    id: 'allowance', amountCents: -54_516, transferKind: 'OWN_ACCOUNT',
    hasUserMemo: true, memoNamesReceivedIncome: true, category: 'Other',
  }), none), 'INTERNAL_UNMATCHED_OUT')

  // The same wording on a transfer to somebody else is still real spending: the
  // exception is about own-account shuffles, not about the words themselves.
  assert.equal(classifyFlow(classifiableRow({
    id: 'paid-out', amountCents: -54_516, transferKind: 'SEPA_OUT',
    hasUserMemo: true, memoNamesReceivedIncome: true, category: 'Other',
  }), none), 'SPENDING')

  // A transfer to somebody else is real spending.
  assert.equal(classifyFlow(classifiableRow({
    id: 'third-party', amountCents: -70_000, transferKind: 'SEPA_OUT', category: 'Housing',
  }), none), 'SPENDING')
})

// --- Analytics ----------------------------------------------------------------

function analyticsRow(overrides: Partial<AnalyticsTransactionInput> & { id: string }): AnalyticsTransactionInput {
  const merchantName = overrides.merchantName ?? 'Corner Cafe'
  return {
    accountId: 'account-1',
    accountName: 'Current account',
    currency: 'EUR',
    amountCents: -1_000,
    amountSource: 'INDICATOR',
    memoNamesReceivedIncome: false,
    bookingDate: new Date('2026-07-15T00:00:00Z'),
    valueDate: null,
    status: 'BOOKED',
    merchantName,
    merchantGroupKey: merchantGroupKey(merchantName),
    detail: null,
    category: 'Dining',
    transactionType: 'Card purchase',
    transferKind: 'NONE',
    hasUserMemo: true,
    counterpartyAccountHint: null,
    ownAccountIdentifiers: [],
    ...overrides,
  }
}

function classifiedRow(
  overrides: Omit<Partial<AnalyticsTransactionInput>, 'bookingDate'> & { id: string; bookingDate?: string | Date },
) {
  const { bookingDate, ...rest } = overrides
  const row = analyticsRow({
    ...rest,
    bookingDate: typeof bookingDate === 'string' ? new Date(`${bookingDate}T00:00:00Z`) : bookingDate ?? null,
  })
  return { ...row, flowClass: classifyFlow(row, new Set<string>()) }
}

function analytics(rows: AnalyticsTransactionInput[], options: Partial<AnalyticsInput> = {}) {
  return buildBankingAnalytics({
    transactions: rows,
    accounts: [],
    limits: [],
    subscriptions: [],
    periodDays: 30,
    now: new Date('2026-07-16T12:00:00Z'),
    ...options,
  }).currencies[0]
}

test('refunds reduce spending instead of inflating income', () => {
  const eur = analytics([
    analyticsRow({ id: 'buy', amountCents: -12_000, category: 'Shopping', merchantName: 'Big Shop' }),
    analyticsRow({ id: 'back', amountCents: 3_000, category: 'Refunds', merchantName: 'Big Shop' }),
    analyticsRow({ id: 'pay', amountCents: 100_000, category: 'Income', merchantName: 'Payroll' }),
  ])
  assert.equal(eur.summary.spendingCents, 12_000)
  assert.equal(eur.summary.refundsCents, 3_000)
  assert.equal(eur.summary.netSpendingCents, 9_000)
  assert.equal(eur.summary.incomeCents, 100_000)
  assert.equal(eur.summary.netCents, 91_000)
  assert.equal(eur.summary.savingsRatePercent, 91)
})

test('every transaction lands in exactly one flow count', () => {
  const eur = analytics([
    analyticsRow({ id: 'spend' }),
    analyticsRow({ id: 'income', amountCents: 100_000, category: 'Income' }),
    analyticsRow({ id: 'refund', amountCents: 500, category: 'Refunds' }),
    analyticsRow({ id: 'zero', amountCents: 0 }),
    analyticsRow({ id: 'unknown', amountCents: 2_450, amountSource: 'UNKNOWN' }),
    analyticsRow({ id: 'shuffle', amountCents: -50_000, transferKind: 'OWN_ACCOUNT', hasUserMemo: false, category: 'Transfers' }),
  ])
  const counts = eur.summary.counts
  assert.equal(counts.total, 6)
  assert.equal(
    counts.spending + counts.income + counts.refund + counts.internalMatched
      + counts.internalUnmatchedIn + counts.internalUnmatchedOut + counts.zero + counts.unknownSign,
    counts.total,
  )
  assert.equal(counts.unknownSign, 1)
  assert.equal(counts.zero, 1)
  assert.equal(counts.internalUnmatchedOut, 1)
  assert.equal(eur.summary.spendingCents, 1_000)
  assert.equal(eur.dataQuality.unknownSignCount, 1)
})

test('a matched transfer pair is excluded from both sides and reported separately', () => {
  const eur = analytics([
    analyticsRow({
      id: 'out', accountId: 'a', amountCents: -191_150, transferKind: 'OWN_ACCOUNT',
      category: 'Transfers', hasUserMemo: false, counterpartyAccountHint: '40025916061',
    }),
    analyticsRow({
      id: 'in', accountId: 'b', amountCents: 191_150, transferKind: 'OWN_ACCOUNT',
      category: 'Transfers', hasUserMemo: false,
    }),
    analyticsRow({ id: 'spend' }),
  ], {
    accounts: [
      { id: 'a', displayName: 'Current', currency: 'EUR', maskedIdentifier: '•••• 9684', balanceCents: null, balanceType: null, balanceAsOf: null },
      { id: 'b', displayName: 'Savings', currency: 'EUR', maskedIdentifier: '•••• 6061', balanceCents: null, balanceType: null, balanceAsOf: null },
    ],
  })
  assert.equal(eur.summary.spendingCents, 1_000)
  assert.equal(eur.summary.incomeCents, 0)
  assert.equal(eur.internalTransfers.matchedPairCount, 1)
  // Counted once for the pair, not once per leg.
  assert.equal(eur.internalTransfers.matchedAmountCents, 191_150)
  assert.equal(eur.internalTransfers.pairs[0].fromAccountName, 'Current')
  assert.equal(eur.internalTransfers.pairs[0].toAccountName, 'Savings')
  assert.equal(eur.internalTransfers.unmatchedCount, 0)
})

test('an unmatched credit from an unconnected own account is disclosed, not counted', () => {
  const eur = analytics([
    analyticsRow({
      id: 'phantom', amountCents: 350_000, transferKind: 'OWN_ACCOUNT', hasUserMemo: false,
      category: 'Transfers', counterpartyAccountHint: '40099990813',
    }),
    analyticsRow({ id: 'spend' }),
  ])
  assert.equal(eur.summary.incomeCents, 0)
  assert.equal(eur.internalTransfers.unmatchedInCents, 350_000)
  assert.deepEqual(eur.internalTransfers.unmatchedAccountHints, ['•••• 0813'])
  assert.match(eur.internalTransfers.note ?? '', /have not connected/)
})

test('a merchant spanning categories keeps shares within its own category', () => {
  const eur = analytics([
    analyticsRow({ id: 'groceries', amountCents: -5_000, category: 'Groceries', merchantName: 'Big Shop' }),
    analyticsRow({ id: 'dining', amountCents: -7_000, category: 'Dining', merchantName: 'Big Shop' }),
  ])
  const merchant = eur.merchants[0]
  assert.equal(merchant.amountCents, 12_000)
  assert.equal(merchant.categories.length, 2)
  assert.equal(merchant.categories.reduce((total, entry) => total + entry.amountCents, 0), 12_000)
  // The previous pipeline divided the merchant's all-category total by one
  // category's total and rendered 240%.
  for (const category of eur.categories) {
    const merchantShare = category.merchants.reduce((total, entry) => total + entry.sharePercent, 0)
    assert.ok(merchantShare <= 100.05, `${category.category} merchant shares summed to ${merchantShare}`)
    assert.equal(category.merchants.reduce((total, entry) => total + entry.amountCents, 0), category.amountCents)
  }
  assert.ok(eur.categories.reduce((total, category) => total + category.sharePercent, 0) <= 100.05)
})

test('merchant grouping collapses serials, casing and masked recipients', () => {
  const eur = analytics([
    analyticsRow({ id: 'c1', amountCents: -10_000, merchantName: 'Cheque Withdrawal 000055', category: 'Cash' }),
    analyticsRow({ id: 'c2', amountCents: -20_000, merchantName: 'Cheque Withdrawal 000057', category: 'Cash' }),
    analyticsRow({ id: 'i1', amountCents: -1_000, merchantName: 'IGP Operations Limited', category: 'Shopping' }),
    analyticsRow({ id: 'i2', amountCents: -2_000, merchantName: 'Igp Operations Limited', category: 'Shopping' }),
  ])
  const cheque = eur.merchants.find(merchant => merchant.merchantKey.includes('cheque'))
  assert.equal(cheque?.count, 2)
  assert.equal(cheque?.amountCents, 30_000)
  const igp = eur.merchants.find(merchant => merchant.merchantKey.includes('igp'))
  assert.equal(igp?.count, 2)
})

test('a category that fell to zero still reports the drop', () => {
  const eur = analytics([
    analyticsRow({ id: 'now', amountCents: -1_000, category: 'Dining' }),
    analyticsRow({ id: 'then', amountCents: -80_000, category: 'Travel', bookingDate: new Date('2026-06-01T00:00:00Z') }),
  ])
  const travel = eur.categories.find(category => category.category === 'Travel')
  assert.ok(travel, 'the category should not vanish from the comparison')
  assert.equal(travel?.amountCents, 0)
  assert.equal(travel?.previousAmountCents, 80_000)
  assert.equal(travel?.changePercent, -100)
  const dining = eur.categories.find(category => category.category === 'Dining')
  assert.equal(dining?.previousAmountCents, 0)
  assert.equal(dining?.changePercent, null)
})

test('averages divide by days with data, and reconcile with the counts shown beside them', () => {
  const eur = analytics([
    analyticsRow({ id: 'a', amountCents: -30_000, bookingDate: new Date('2026-07-01T00:00:00Z') }),
    analyticsRow({ id: 'b', amountCents: -30_000, bookingDate: new Date('2026-07-15T00:00:00Z') }),
    analyticsRow({ id: 'c', amountCents: 500_000, category: 'Income' }),
  ], { periodDays: 365 })
  assert.equal(eur.coverage.complete, false)
  assert.equal(eur.coverage.coveredDays, 16)
  assert.equal(eur.coverage.dataStartDate, '2026-07-01')
  // Naively dividing by 365 would report €1.64 a day instead of €37.50.
  assert.equal(eur.summary.averageSpendPerDayCents, 3_750)
  assert.equal(eur.summary.counts.spending, 2)
  assert.notEqual(eur.summary.counts.spending, eur.summary.counts.total)
  assert.equal(eur.summary.averageSpendPerTransactionCents, 30_000)
})

test('net position reports a signed change rather than a percentage across zero', () => {
  const eur = analytics([
    analyticsRow({ id: 'income', amountCents: 200_000, category: 'Income' }),
    analyticsRow({ id: 'spend', amountCents: -50_000 }),
    analyticsRow({ id: 'past', amountCents: -80_000, bookingDate: new Date('2026-06-01T00:00:00Z') }),
  ])
  assert.equal(eur.summary.comparison.previousNetCents, -80_000)
  assert.equal(eur.summary.netCents, 150_000)
  assert.equal(eur.summary.comparison.netChangeCents, 230_000)
  assert.equal(eur.summary.comparison.netDirection, 'UP')
  assert.equal(eur.summary.savingsRatePercent, 75)
})

test('savings rate is undefined rather than zero when nothing came in', () => {
  const eur = analytics([analyticsRow({ id: 'spend' })])
  assert.equal(eur.summary.incomeCents, 0)
  assert.equal(eur.summary.savingsRatePercent, null)
})

test('currencies are kept apart and the primary one is stated explicitly', () => {
  const result = buildBankingAnalytics({
    transactions: [
      analyticsRow({ id: 'eur-1', amountCents: -1_000 }),
      analyticsRow({ id: 'eur-2', amountCents: -2_000 }),
      analyticsRow({ id: 'usd-1', amountCents: -900_000, currency: 'USD' }),
    ],
    accounts: [],
    limits: [],
    subscriptions: [],
    periodDays: 30,
    now: new Date('2026-07-16T12:00:00Z'),
  })
  assert.equal(result.currencies.length, 2)
  assert.equal(result.primaryCurrency, 'EUR')
  assert.equal(result.currencies[0].currency, result.primaryCurrency)
  assert.equal(result.currencies[0].summary.spendingCents, 3_000)
  assert.equal(result.currencies[1].summary.spendingCents, 900_000)
})

// --- Balance trend ------------------------------------------------------------

test('the balance trend walks backwards from today and flags what it cannot verify', () => {
  const accounts = [{
    id: 'account-1', displayName: 'Current', currency: 'EUR', maskedIdentifier: '•••• 6061',
    balanceCents: 1_082_249, balanceType: 'CLBD', balanceAsOf: new Date('2026-07-16T00:00:00Z'),
  }]
  const rows = [
    analyticsRow({ id: 'old', amountCents: -1_000, bookingDate: new Date('2026-04-30T00:00:00Z') }),
    analyticsRow({ id: 'in', amountCents: 694_112, category: 'Income', bookingDate: new Date('2026-06-15T00:00:00Z') }),
  ]
  const trend = deriveBalanceTrend(accounts, rows, 'EUR', new Date('2026-07-16T12:00:00Z'), 3)
  const may = trend?.points.find(point => point.date === '2026-05-31')
  // The real production figures: €10,822.49 less €6,941.12 of later activity.
  assert.equal(may?.balanceCents, 388_137)
  assert.equal(may?.derived, true)
  assert.equal(trend?.points.at(-1)?.balanceCents, 1_082_249)
  assert.equal(trend?.points.at(-1)?.derived, false)
  assert.equal(trend?.reliable, true)

  const unlabelled = deriveBalanceTrend(
    [{ ...accounts[0], balanceType: 'OTHR' }],
    rows,
    'EUR',
    new Date('2026-07-16T12:00:00Z'),
    3,
  )
  assert.equal(unlabelled?.reliable, false)
  assert.match(unlabelled?.caveat ?? '', /did not label/)
})

test('the balance trend refuses boundaries older than the data instead of inventing them', () => {
  const trend = deriveBalanceTrend(
    [{ id: 'a', displayName: 'Current', currency: 'EUR', maskedIdentifier: null, balanceCents: 100_000, balanceType: 'CLBD', balanceAsOf: null }],
    [analyticsRow({ id: 'only', amountCents: -1_000, bookingDate: new Date('2026-07-10T00:00:00Z') })],
    'EUR',
    new Date('2026-07-16T12:00:00Z'),
    6,
  )
  assert.deepEqual(trend?.points.map(point => point.date), ['2026-07-16'])
  assert.equal(trend?.reliable, false)
  assert.match(trend?.caveat ?? '', /not enough history/)
})

// --- Upcoming bills -----------------------------------------------------------

test('upcoming bills prefer confirmed subscriptions and respect the horizon', () => {
  const now = new Date('2026-07-16T12:00:00Z')
  const bills = buildUpcomingBills([
    {
      id: 'sub-soon', accountId: 'account-1', merchantKey: 'netflix', displayName: 'Netflix',
      cadence: 'MONTHLY', expectedAmountCents: 1_549, currency: 'EUR',
      nextExpectedDate: '2026-07-21', reminderDays: 3, status: 'CONFIRMED',
    },
    {
      id: 'sub-far', accountId: 'account-1', merchantKey: 'insurance', displayName: 'Car insurance',
      cadence: 'YEARLY', expectedAmountCents: 85_066, currency: 'EUR',
      nextExpectedDate: '2026-09-30', reminderDays: 7, status: 'CONFIRMED',
    },
    {
      id: 'sub-overdue', accountId: 'account-1', merchantKey: 'gym', displayName: 'Gym',
      cadence: 'MONTHLY', expectedAmountCents: 3_000, currency: 'EUR',
      nextExpectedDate: '2026-07-02', reminderDays: 3, status: 'CONFIRMED',
    },
    {
      id: 'sub-candidate', accountId: 'account-1', merchantKey: 'maybe', displayName: 'Maybe',
      cadence: 'MONTHLY', expectedAmountCents: 500, currency: 'EUR',
      nextExpectedDate: '2026-07-18', reminderDays: 3, status: 'CANDIDATE',
    },
  ], [], 'EUR', now)
  assert.deepEqual(bills.map(bill => bill.merchantName), ['Gym', 'Netflix'])
  assert.equal(bills[0].state, 'OVERDUE')
  assert.equal(bills[1].daysUntilDue, 5)
  assert.equal(bills[1].source, 'CONFIRMED')
})

test('a detected candidate does not duplicate a confirmed subscription', () => {
  const now = new Date('2026-07-16T12:00:00Z')
  const stored = [{
    id: 'sub-1', accountId: 'account-1', merchantKey: 'example streaming', displayName: 'Example Streaming',
    cadence: 'MONTHLY', expectedAmountCents: 999, currency: 'EUR',
    nextExpectedDate: '2026-07-20', reminderDays: 3, status: 'CONFIRMED' as const,
  }]
  const detected = detectSubscriptions([
    ['2026-04-20', -9.99], ['2026-05-20', -9.99], ['2026-06-20', -9.99],
  ].map(([bookingDate, signedAmount], index) => ({
    id: `detected-${index}`, accountId: 'account-1', merchantName: 'Example Streaming',
    signedAmount: Number(signedAmount), currency: 'EUR', bookingDate: String(bookingDate), status: 'BOOKED',
  })), now)
  const bills = buildUpcomingBills(stored, detected, 'EUR', now)
  assert.equal(bills.length, 1)
  assert.equal(bills[0].source, 'CONFIRMED')
})

// --- Budgets ------------------------------------------------------------------

test('limits ignore internal movement and are reduced by refunds', () => {
  const limit = {
    id: 'limit-1', accountId: null, scope: 'CATEGORY' as const, scopeKey: 'Groceries',
    displayName: 'Groceries', amountCents: 40_000, currency: 'EUR', enabled: true,
  }
  const now = new Date('2026-07-16T12:00:00Z')
  const shuffle = classifiedRow({
    id: 'shuffle', amountCents: -100_000, category: 'Groceries', bookingDate: '2026-07-05',
    transferKind: 'OWN_ACCOUNT', hasUserMemo: false,
  })
  assert.equal(shuffle.flowClass, 'INTERNAL_UNMATCHED_OUT')
  assert.equal(buildBudgetProgress([limit], [shuffle], now)[0].spentCents, 0)

  const spend = classifiedRow({ id: 'shop', amountCents: -20_000, category: 'Groceries', bookingDate: '2026-07-05' })
  const refund = classifiedRow({ id: 'back', amountCents: 5_000, category: 'Refunds', bookingDate: '2026-07-06' })
  const merchantLimit = { ...limit, scope: 'MERCHANT' as const, scopeKey: 'corner cafe' }
  assert.equal(buildBudgetProgress([limit], [spend], now)[0].spentCents, 20_000)
  assert.equal(buildBudgetProgress([merchantLimit], [spend, refund], now)[0].spentCents, 15_000)
})

// --- Dedup identity -----------------------------------------------------------

test('the fallback dedup key depends on provider fields only', () => {
  const raw = {
    transaction_amount: { amount: '24.50', currency: 'EUR' },
    credit_debit_indicator: 'DBIT',
    booking_date: '2026-07-15',
    value_date: '2026-07-16',
    creditor: { name: 'EXAMPLE MARKET LTD' },
    remittance_information: ['POS'],
  }
  const key = deduplicationKeyFor(raw, 'BOOKED')
  assert.match(key, /^hash2:[a-f0-9]{64}$/)

  // Changing how we categorise or name a merchant must not re-key stored rows —
  // that is what previously duplicated them on the next sync.
  assert.equal(deduplicationKeyFor({ ...raw, merchant_category_code: '5411' }, 'BOOKED'), key)
  assert.equal(deduplicationKeyFor({ ...raw, merchant: { name: 'Nicer Name' } }, 'BOOKED'), key)
  assert.equal(deduplicationKeyFor({ ...raw, note: 'Sliema' }, 'BOOKED'), key)

  // Provider facts genuinely identify the transaction.
  assert.notEqual(deduplicationKeyFor({ ...raw, booking_date: '2026-07-14' }, 'BOOKED'), key)
  assert.notEqual(deduplicationKeyFor({ ...raw, transaction_amount: { amount: '24.51', currency: 'EUR' } }, 'BOOKED'), key)
  assert.notEqual(deduplicationKeyFor({ ...raw, credit_debit_indicator: 'CRDT' }, 'BOOKED'), key)
  assert.notEqual(deduplicationKeyFor(raw, 'PENDING'), key)
  assert.equal(isLegacyDeduplicationKey('hash:abc'), true)
  assert.equal(isLegacyDeduplicationKey(key), false)
})

// --- Categorisation -----------------------------------------------------------

function categoryOf(code: string, note: string, indicator = 'DBIT', amount = '40') {
  return enrichTransaction({
    amount,
    providerData: { remittance_information: [code], credit_debit_indicator: indicator, note: [note] },
  })
}

test('categories come from the bank code first and word-anchored merchant text second', () => {
  // Each of these was previously miscategorised by an unanchored regex or by a
  // merchant rule outranking the bank's own code.
  assert.equal(categoryOf('POS', 'CAR RENTAL MALTA').category, 'Transport')
  assert.equal(categoryOf('24X7 BILL PAYMENT', 'PARENT SCHOOL FUND').category, 'Education')
  assert.equal(categoryOf('POS', 'TRANSPORT MALTA FEE').category, 'Transport')
  assert.equal(categoryOf('POS', 'BUSINESS CENTRE LTD').category !== 'Transport', true)
  // A processor is not the merchant, and its name should not swallow the category.
  const paypal = categoryOf('POS', 'PAYPAL *SPOTIFY')
  assert.equal(paypal.merchantName, 'Spotify')
  assert.equal(paypal.category, 'Entertainment')
  // The boundary fix must not lose the true positive.
  assert.equal(categoryOf('24X7 PAY THIRD PARTIES', 'RENT JULY').category, 'Housing')
  assert.equal(categoryOf('SCT OUTWARDS FEE', '').category, 'Fees')
  assert.equal(categoryOf('CHEQUE BOOK ORDER FEE', '').category, 'Fees')
  assert.equal(categoryOf('CURRENCY CONVERSION FEE', '').category, 'Fees')
  assert.equal(categoryOf('REPAYMENT OF PRINCIPAL', '').category, 'Housing')
  assert.equal(categoryOf('REPAYMENT OF MAIN INTEREST', '').category, 'Housing')
  assert.equal(categoryOf('ATM', '').category, 'Cash')
  assert.equal(categoryOf('SEPA DIRECT DEBIT', 'ARMS LTD').category, 'Bills & utilities')
  assert.equal(categoryOf('STANDING INSTRUCTION', '').category, 'Bills & utilities')
})

test('an inbound credit is income unless it only moved between your own accounts', () => {
  // A salary arrives as a SEPA credit; calling that a transfer would drop it out
  // of income entirely.
  assert.equal(categoryOf('SCT INWARDS', 'ACME PAYROLL', 'CRDT', '1000').category, 'Income')
  assert.equal(categoryOf('24X7 TRANSFER BETWEEN OWN ACCOUNTS', '40025916061', 'CRDT', '200').category, 'Transfers')
  assert.equal(categoryOf('REFUND', 'BIG SHOP', 'CRDT', '30').category, 'Refunds')
})

test('own-account transfers expose the memo and counterparty account they carry', () => {
  const shuffle = enrichTransaction({
    amount: '3500',
    providerData: {
      remittance_information: ['24X7 TRANSFER BETWEEN OWN ACCOUNTS'],
      credit_debit_indicator: 'CRDT',
      note: ['40025916061'],
    },
  })
  assert.equal(shuffle.transferKind, 'OWN_ACCOUNT')
  assert.equal(shuffle.hasUserMemo, false)
  assert.equal(shuffle.counterpartyAccountHint, '40025916061')

  const purchase = enrichTransaction({
    amount: '188',
    providerData: {
      remittance_information: ['24X7 TRANSFER BETWEEN OWN ACCOUNTS'],
      credit_debit_indicator: 'DBIT',
      note: ['40025916061', 'greens'],
    },
  })
  assert.equal(purchase.hasUserMemo, true)
  assert.equal(purchase.category, 'Groceries')
  assert.equal(purchase.amountCents, -18_800)
  assert.equal(purchase.memoNamesReceivedIncome, false)

  // The real row: the memo names the benefit the money came from, so the leg is
  // a shuffle of received income rather than a €545.16 purchase.
  const allowance = enrichTransaction({
    amount: '545.16',
    providerData: {
      remittance_information: ['24X7 TRANSFER BETWEEN OWN ACCOUNTS'],
      credit_debit_indicator: 'DBIT',
      note: ['40025916061', "SOCIAL SECURITY EUR 545.16 CHILDREN'S ALLOWANCE"],
    },
  })
  assert.equal(allowance.hasUserMemo, true)
  assert.equal(allowance.memoNamesReceivedIncome, true)

  // "greens" must not trip the income wording, or real spending disappears.
  assert.equal(purchase.memoNamesReceivedIncome, false)
})

test('the summary reconciles with the balance line drawn beside it', () => {
  const eur = analytics([
    analyticsRow({ id: 'income', amountCents: 200_000, category: 'Income' }),
    analyticsRow({ id: 'spend', amountCents: -50_000 }),
    analyticsRow({ id: 'refund', amountCents: 4_000, category: 'Refunds' }),
    analyticsRow({
      id: 'topup', amountCents: 110_000, transferKind: 'OWN_ACCOUNT',
      hasUserMemo: false, category: 'Transfers',
    }),
    analyticsRow({
      id: 'shuffle', amountCents: -30_000, transferKind: 'OWN_ACCOUNT',
      hasUserMemo: false, category: 'Transfers',
    }),
  ])
  // Net answers "how are we doing"; the balance change is what the bank sees.
  assert.equal(eur.summary.netCents, 154_000)
  assert.equal(eur.summary.balanceChangeCents, 234_000)
  assert.equal(
    eur.summary.netCents + eur.internalTransfers.unmatchedInCents - eur.internalTransfers.unmatchedOutCents,
    eur.summary.balanceChangeCents,
  )
})

// --- Chart bucketing and scales ----------------------------------------------

test('chart buckets are calendar-aligned, so no bucket is quietly short', () => {
  const days = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 6, 17) + index * 86_400_000)
    return { date: date.toISOString().slice(0, 10) }
  })
  const range = { from: days[0].date, to: days[days.length - 1].date }
  assert.equal(bucketUnitFor(30), 'day')
  assert.equal(bucketUnitFor(90), 'week')
  assert.equal(bucketUnitFor(365), 'month')

  const months = bucketByCalendar(days, row => row.date, 'month', range)
  // Only the clipped first and last calendar months may be partial. The old
  // ceil(n/14) slicing left the final bucket at roughly half width every time.
  assert.equal(months.filter(bucket => bucket.partial).length, 2)
  assert.equal(months[0].partial, true)
  assert.equal(months.at(-1)?.partial, true)
  for (const bucket of months.slice(1, -1)) {
    assert.equal(bucket.coveredDays, bucket.spanDays)
  }
  assert.equal(months.reduce((total, bucket) => total + bucket.items.length, 0), days.length)
  // Labels describe a range, never a single date standing in for a month.
  assert.match(months[5].label, /^[A-Z][a-z]{2}$/)
  assert.match(months[5].longLabel, /–/)
})

test('empty periods keep their place in the chart instead of disappearing', () => {
  const sparse = [{ date: '2026-07-02' }, { date: '2026-07-05' }]
  const buckets = bucketByCalendar(sparse, row => row.date, 'day', { from: '2026-07-01', to: '2026-07-07' })
  assert.equal(buckets.length, 7)
  assert.deepEqual(buckets.map(bucket => bucket.items.length), [0, 1, 0, 0, 1, 0, 0])
  assert.equal(buckets.every(bucket => !bucket.partial), true)
})

test('weekly buckets start on Monday and clip to the requested range', () => {
  const buckets = bucketByCalendar(
    [{ date: '2026-07-15' }],
    row => row.date,
    'week',
    { from: '2026-07-15', to: '2026-07-21' },
  )
  assert.equal(buckets[0].key, '2026-07-13')
  assert.equal(buckets[0].from, '2026-07-15')
  assert.equal(buckets[0].partial, true)
  assert.equal(buckets[0].items.length, 1)
})

test('chart scales survive flat, empty and single-point data', () => {
  // A flat series draws through the middle rather than dividing by zero.
  const flat = linearScale([50, 50], [100, 0])
  assert.equal(Number.isFinite(flat(50)), true)
  assert.equal(flat(50), 50)
  // An all-zero series still gets an axis, so the chart reads as "zero", not "broken".
  assert.deepEqual(niceTicks(0), [0, 1])
  assert.equal(bandScale(0, [0, 100]).bandWidth, 0)
  const single = bandScale(1, [0, 100])
  assert.equal(single.center(0), 50)
  assert.equal(single.bandWidth, 60)
  const many = bandScale(4, [0, 100])
  assert.equal(many.indexAt(-10), 0)
  assert.equal(many.indexAt(1_000), 3)
})

// --- URL filter state ---------------------------------------------------------

test('filter fields reject values that are not offered', () => {
  const period = filterField.numberOneOf([30, 90, 180, 365], 90)
  assert.equal(period.parse('30'), 30)
  assert.equal(period.parse('45'), null)
  assert.equal(period.parse('abc'), null)
  assert.equal(period.default, 90)

  const sort = filterField.oneOf(['amount', 'count', 'change', 'name'] as const, 'amount')
  assert.equal(sort.parse('count'), 'count')
  assert.equal(sort.parse('sideways'), null)

  // Free text is accepted but bounded, so a crafted URL cannot carry a novel.
  assert.equal(filterField.text().parse('x'.repeat(400))?.length, 120)
})

test('a comparison window the bank never covered is reported as such, not as growth', () => {
  // 90 days of history, viewed over 90 days: the current period is complete, but
  // the 90 days it would be compared against contain nothing at all.
  const rows = Array.from({ length: 6 }, (_, index) => analyticsRow({
    id: `row-${index}`,
    amountCents: -5_000,
    category: 'Groceries',
    bookingDate: new Date(Date.UTC(2026, 3, 30) + index * 15 * 86_400_000),
  }))
  const eur = analytics(rows, { periodDays: 90, now: new Date('2026-07-28T12:00:00Z') })

  assert.equal(eur.coverage.complete, true)
  // Which is exactly why `complete` is the wrong flag to gate comparisons on.
  assert.equal(eur.coverage.previousCovered, false)
  const groceries = eur.categories.find(category => category.category === 'Groceries')
  assert.equal(groceries?.previousAmountCents, 0)

  // With history reaching back through both windows, comparisons are meaningful.
  const withHistory = analytics([
    ...rows,
    analyticsRow({ id: 'old', amountCents: -2_000, category: 'Groceries', bookingDate: new Date('2026-01-20T00:00:00Z') }),
  ], { periodDays: 90, now: new Date('2026-07-28T12:00:00Z') })
  assert.equal(withHistory.coverage.previousCovered, true)
})
