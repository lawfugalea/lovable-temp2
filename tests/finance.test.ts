import assert from 'node:assert/strict'
import { generateKeyPairSync, verify } from 'node:crypto'
import test from 'node:test'
import { createEnableBankingJwt } from '../src/lib/finance/enable-banking'
import { getFinanceAspsp, isFinanceProviderConfigured } from '../src/lib/finance/config'
import {
  maskBankIdentifier,
  normalizeBalances,
  normalizeBankAccount,
  normalizeTransaction,
} from '../src/lib/finance/normalization'
import { buildAccessibleBankAccountWhere } from '../src/lib/finance/visibility'
import { enrichTransaction } from '../src/lib/finance/enrichment'
import { buildFinanceInsights } from '../src/lib/finance/insights'
import { enrichWithFinanceMetadata, normalizeMerchantKey } from '../src/lib/finance/metadata'
import { detectSubscriptions, subscriptionDueState } from '../src/lib/finance/subscriptions'
import { buildCoachSignals, buildLimitProgress } from '../src/lib/finance/coach'
import { buildDeepSeekRequestBody, buildRedactedFinancePayload, hashRedactedPayload } from "../src/lib/finance/deepseek"

test('finance reads are scoped to ownership or an explicit household share', () => {
  assert.deepEqual(buildAccessibleBankAccountWhere('owner-id', 'household-id'), {
    OR: [
      { connection: { userId: 'owner-id' } },
      { shares: { some: { householdId: 'household-id' } } },
    ],
  })
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
  assert.equal(normalized?.amount, '-24.5')
  assert.equal(normalized?.counterparty, 'Lidl Malta')
  assert.equal(normalized?.description, 'Sliema')
  assert.deepEqual(enrichTransaction({ amount: '24.50', providerData: raw }), {
    merchantName: 'Lidl Malta',
    detail: 'Sliema',
    transactionType: 'Card purchase',
    category: 'Groceries',
    signedAmount: -24.5,
  })
})

test('finance insights calculate cash flow, previous-period comparison, categories, and merchants', () => {
  const insights = buildFinanceInsights([
    {
      amount: '40', currency: 'EUR', bookingDate: new Date('2026-07-15T00:00:00Z'),
      providerData: { credit_debit_indicator: 'DBIT', note: 'Corner Cafe -', remittance_information: ['POS'] },
    },
    {
      amount: '1000', currency: 'EUR', bookingDate: new Date('2026-07-14T00:00:00Z'),
      providerData: { credit_debit_indicator: 'CRDT', note: 'Salary', remittance_information: ['SCT INWARDS'] },
    },
    {
      amount: '20', currency: 'EUR', bookingDate: new Date('2026-06-15T00:00:00Z'),
      providerData: { credit_debit_indicator: 'DBIT', note: 'Corner Cafe -', remittance_information: ['POS'] },
    },
  ], 30, new Date('2026-07-16T12:00:00Z'))
  const eur = insights.currencies[0]
  assert.equal(eur.summary.income, 1000)
  assert.equal(eur.summary.outgoing, 40)
  assert.equal(eur.summary.net, 960)
  assert.equal(eur.summary.outgoingChangePercent, 100)
  assert.equal(eur.summary.savingsRate, 96)
  assert.equal(eur.summary.averageTransaction, 40)
  assert.equal(eur.summary.largestExpense, 40)
  assert.equal(eur.categories[0].category, 'Dining')
  assert.equal(eur.categories[0].previousAmount, 20)
  assert.equal(eur.categories[0].changePercent, 100)
  assert.equal(eur.categories[0].average, 40)
  assert.equal(eur.merchants[0].merchantName, 'Corner Cafe')
  assert.equal(eur.transactions.length, 1)
  assert.equal(eur.transactions[0].merchantName, 'Corner Cafe')
  assert.equal(eur.transactions[0].category, 'Dining')
  assert.equal(eur.transactions[0].amount, 40)
  assert.equal(eur.transactions[0].date, '2026-07-15')
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
  const progress = buildLimitProgress([{
    id: 'limit-1', accountId: null, scope: 'CATEGORY', scopeKey: 'Dining', displayName: 'Dining',
    amount: 50, currency: 'EUR', enabled: true,
  }], [{
    id: 'transaction-1', accountId: 'account-1', merchantName: 'Cafe', category: 'Dining',
    signedAmount: -60, currency: 'EUR', bookingDate: '2026-07-10', status: 'BOOKED',
  }], new Date('2026-07-16T12:00:00Z'))
  assert.equal(progress[0].spent, 60)
  assert.equal(progress[0].percentage, 120)
  assert.equal(progress[0].exceeded, true)
  assert.ok(progress[0].projected > progress[0].spent)
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
