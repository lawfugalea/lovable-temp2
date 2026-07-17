import { enrichTransaction, type FinanceCategory } from './enrichment'

export type InsightTransaction = {
  id?: string
  amount: string | number
  currency: string
  bookingDate: Date | null
  accountName?: string | null
  counterparty?: string | null
  description?: string | null
  providerData?: unknown
  enriched?: ReturnType<typeof enrichTransaction>
}

export type CurrencyFinanceInsights = {
  currency: string
  summary: {
    income: number
    outgoing: number
    net: number
    averageOutgoing: number
    transactionCount: number
    outgoingChangePercent: number | null
    incomeChangePercent: number | null
    netChangePercent: number | null
    savingsRate: number | null
    averageTransaction: number
    largestExpense: number
    billsTotal: number
    groceriesTotal: number
  }
  daily: Array<{ date: string; income: number; outgoing: number }>
  categories: Array<{ category: FinanceCategory; amount: number; previousAmount: number; changePercent: number | null; count: number; percentage: number; average: number; largest: number; merchantCount: number }>
  merchants: Array<{ merchantName: string; amount: number; count: number; average: number; percentage: number; category: FinanceCategory }>
  transactions: Array<{
    id: string
    date: string
    merchantName: string
    detail: string | null
    category: FinanceCategory
    amount: number
    accountName: string | null
  }>
}

export type FinanceInsights = {
  periodDays: number
  dateFrom: string
  dateTo: string
  currencies: CurrencyFinanceInsights[]
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function insightDateRange(periodDays: number, now = new Date()) {
  const dateTo = startOfUtcDay(now)
  const dateFrom = addDays(dateTo, -(periodDays - 1))
  const previousFrom = addDays(dateFrom, -periodDays)
  return { dateFrom, dateTo, previousFrom }
}

export function buildFinanceInsights(
  transactions: InsightTransaction[],
  periodDays: number,
  now = new Date(),
): FinanceInsights {
  const range = insightDateRange(periodDays, now)
  const currentEnd = addDays(range.dateTo, 1)
  const currencies = new Set(transactions.map(transaction => transaction.currency.toUpperCase()))
  const result: CurrencyFinanceInsights[] = []

  for (const currency of currencies) {
    const current = transactions.filter(transaction => transaction.currency.toUpperCase() === currency
      && transaction.bookingDate
      && transaction.bookingDate >= range.dateFrom
      && transaction.bookingDate < currentEnd)
    const previous = transactions.filter(transaction => transaction.currency.toUpperCase() === currency
      && transaction.bookingDate
      && transaction.bookingDate >= range.previousFrom
      && transaction.bookingDate < range.dateFrom)
    if (!current.length && !previous.length) continue

    const dailyMap = new Map<string, { income: number; outgoing: number }>()
    for (let day = range.dateFrom; day < currentEnd; day = addDays(day, 1)) {
      dailyMap.set(day.toISOString().slice(0, 10), { income: 0, outgoing: 0 })
    }
    const categoryMap = new Map<FinanceCategory, { amount: number; count: number; largest: number; merchants: Set<string> }>()
    const merchantMap = new Map<string, { amount: number; count: number; category: FinanceCategory }>()
    let income = 0
    let outgoing = 0
    let largestExpense = 0
    let outgoingCount = 0

    for (const transaction of current) {
      const enriched = transaction.enriched || enrichTransaction(transaction)
      const key = transaction.bookingDate!.toISOString().slice(0, 10)
      const daily = dailyMap.get(key)
      if (enriched.signedAmount >= 0) {
        income += enriched.signedAmount
        if (daily) daily.income += enriched.signedAmount
      } else {
        const amount = Math.abs(enriched.signedAmount)
        largestExpense = Math.max(largestExpense, amount)
        outgoingCount += 1
        outgoing += amount
        if (daily) daily.outgoing += amount
        const category = categoryMap.get(enriched.category) || { amount: 0, count: 0, largest: 0, merchants: new Set<string>() }
        category.amount += amount
        category.count += 1
        category.largest = Math.max(category.largest, amount)
        category.merchants.add(enriched.merchantName)
        categoryMap.set(enriched.category, category)
        const merchant = merchantMap.get(enriched.merchantName) || { amount: 0, count: 0, category: enriched.category }
        merchant.amount += amount
        merchant.count += 1
        merchantMap.set(enriched.merchantName, merchant)
      }
    }

    const previousOutgoing = previous.reduce((total, transaction) => {
      const amount = (transaction.enriched || enrichTransaction(transaction)).signedAmount
      return total + (amount < 0 ? Math.abs(amount) : 0)
    }, 0)
    const previousIncome = previous.reduce((total, transaction) => {
      const amount = (transaction.enriched || enrichTransaction(transaction)).signedAmount
      return total + (amount > 0 ? amount : 0)
    }, 0)
    const previousCategoryMap = new Map<FinanceCategory, number>()
    for (const transaction of previous) {
      const enriched = transaction.enriched || enrichTransaction(transaction)
      if (enriched.signedAmount < 0) previousCategoryMap.set(enriched.category, (previousCategoryMap.get(enriched.category) || 0) + Math.abs(enriched.signedAmount))
    }
    const previousNet = previousIncome - previousOutgoing
    const categories = [...categoryMap]
      .map(([category, values]) => ({
        category,
        amount: round(values.amount),
        previousAmount: round(previousCategoryMap.get(category) || 0),
        changePercent: (previousCategoryMap.get(category) || 0) > 0 ? round((values.amount - (previousCategoryMap.get(category) || 0)) / (previousCategoryMap.get(category) || 1) * 100) : null,
        count: values.count,
        percentage: outgoing > 0 ? round(values.amount / outgoing * 100) : 0,
        average: round(values.amount / values.count),
        largest: round(values.largest),
        merchantCount: values.merchants.size,
      }))
      .sort((a, b) => b.amount - a.amount)
    const merchants = [...merchantMap]
      .map(([merchantName, values]) => ({ merchantName, amount: round(values.amount), count: values.count, average: round(values.amount / values.count), percentage: outgoing > 0 ? round(values.amount / outgoing * 100) : 0, category: values.category }))
      .sort((a, b) => b.amount - a.amount)
    const detailTransactions = current
      .map((transaction, index) => ({
        transaction,
        enriched: transaction.enriched || enrichTransaction(transaction),
        index,
      }))
      .filter(item => item.enriched.signedAmount < 0)
      .map(({ transaction, enriched, index }) => ({
        id: transaction.id || `${currency}-${transaction.bookingDate?.toISOString() || 'unknown'}-${index}`,
        date: transaction.bookingDate!.toISOString().slice(0, 10),
        merchantName: enriched.merchantName,
        detail: enriched.detail || transaction.description || null,
        category: enriched.category,
        amount: round(Math.abs(enriched.signedAmount)),
        accountName: transaction.accountName || null,
      }))
      .sort((left, right) => right.date.localeCompare(left.date) || right.amount - left.amount)

    result.push({
      currency,
      summary: {
        income: round(income),
        outgoing: round(outgoing),
        net: round(income - outgoing),
        averageOutgoing: round(outgoing / periodDays),
        transactionCount: current.length,
        outgoingChangePercent: previousOutgoing > 0 ? round((outgoing - previousOutgoing) / previousOutgoing * 100) : null,
        incomeChangePercent: previousIncome > 0 ? round((income - previousIncome) / previousIncome * 100) : null,
        netChangePercent: previousNet !== 0 ? round(((income - outgoing) - previousNet) / Math.abs(previousNet) * 100) : null,
        savingsRate: income > 0 ? round((income - outgoing) / income * 100) : null,
        averageTransaction: outgoingCount > 0 ? round(outgoing / outgoingCount) : 0,
        largestExpense: round(largestExpense),
        billsTotal: round(categoryMap.get("Bills & utilities")?.amount || 0),
        groceriesTotal: round(categoryMap.get("Groceries")?.amount || 0),
      },
      daily: [...dailyMap].map(([date, values]) => ({ date, income: round(values.income), outgoing: round(values.outgoing) })),
      categories,
      merchants,
      transactions: detailTransactions,
    })
  }

  result.sort((a, b) => b.summary.transactionCount - a.summary.transactionCount)
  return {
    periodDays,
    dateFrom: range.dateFrom.toISOString().slice(0, 10),
    dateTo: range.dateTo.toISOString().slice(0, 10),
    currencies: result,
  }
}
