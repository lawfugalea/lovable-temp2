/**
 * The transaction list with its filters, lifted out of the page unchanged in
 * behaviour: search, account, status and date range, then a cursor-paged list.
 */
import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Clock3, Loader2, ReceiptText, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { EditTransactionButton } from '@/components/finance/FinanceTransactionTools'
import { longDate, money } from '@/lib/finance/format'
import type { Account, Transaction } from './types'

export type TransactionsPanelProps = {
  householdId: string
  accounts: Account[]
  reloadKey: number
  onError: (message: string) => void
  onEdit: (transaction: Transaction) => void
}

export function TransactionsPanel({ householdId, accounts, reloadKey, onError, onEdit }: TransactionsPanelProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const load = async (cursor?: string) => {
    if (!householdId) return
    setLoading(true)
    try {
      const query = new URLSearchParams({ householdId })
      if (accountFilter) query.set('accountId', accountFilter)
      if (statusFilter) query.set('status', statusFilter)
      if (dateFrom) query.set('dateFrom', dateFrom)
      if (dateTo) query.set('dateTo', dateTo)
      if (search) query.set('search', search)
      if (cursor) query.set('cursor', cursor)
      const response = await fetch(`/api/finance/transactions?${query.toString()}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load transactions')
      setTransactions(current => cursor ? [...current, ...(payload.transactions || [])] : payload.transactions || [])
      setNextCursor(payload.nextCursor || null)
    } catch (loadError) {
      onError(loadError instanceof Error ? loadError.message : 'Unable to load transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // The cursor is deliberately absent: changing it must not reload page one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountFilter, dateFrom, dateTo, householdId, search, statusFilter, reloadKey])

  return (
    <Card className="hover:-translate-y-0">
      <CardHeader>
        <CardTitle className="text-xl">Transaction activity</CardTitle>
        <CardDescription>Every booked and pending payment, with the merchant names Clankeep worked out.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              className="pl-9"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Search merchant or description"
              aria-label="Search transactions"
            />
          </div>
          <select
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
            value={accountFilter}
            onChange={event => setAccountFilter(event.target.value)}
            aria-label="Filter by account"
          >
            <option value="">All accounts</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.displayName}</option>)}
          </select>
          <select
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="PENDING">Pending</option>
          </select>
          <Input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} aria-label="From date" />
          <Input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} aria-label="To date" />
        </div>

        <div className="mt-5 divide-y divide-border">
          {transactions.map(transaction => {
            const cents = Math.round(Number(transaction.amount) * 100)
            const incoming = cents >= 0
            return (
              <div key={transaction.id} className="flex items-start gap-3 py-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${incoming ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-module-finances/10 text-module-finances'}`}>
                  {incoming
                    ? <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                    : transaction.transactionType === 'Card purchase'
                      ? <ReceiptText className="h-4 w-4" aria-hidden="true" />
                      : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold" title={transaction.merchantName}>
                        {transaction.merchantName || transaction.counterparty || 'Bank transaction'}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {transaction.detail || transaction.transactionType}
                      </p>
                    </div>
                    <p className={`whitespace-nowrap font-semibold tabular-nums ${incoming ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>
                      {money(cents, { currency: transaction.currency, sign: 'always' })}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" />
                      {transaction.bookingDate || transaction.valueDate
                        ? longDate((transaction.bookingDate || transaction.valueDate) as string)
                        : '—'}
                    </span>
                    <span>{transaction.account.displayName}</span>
                    <Badge variant="outline" className="font-normal">{transaction.category}</Badge>
                    {transaction.enrichmentSource !== 'local' && (
                      <Badge variant="outline" className="font-normal">
                        {transaction.enrichmentSource === 'rule' ? 'Learned rule' : 'Edited'}
                      </Badge>
                    )}
                    {transaction.status === 'PENDING' && (
                      <Badge variant="outline"><Clock3 className="mr-1 h-3 w-3" aria-hidden="true" />Pending</Badge>
                    )}
                    {transaction.canEdit && <EditTransactionButton onClick={() => onEdit(transaction)} />}
                  </div>
                </div>
              </div>
            )
          })}
          {!transactions.length && !loading && (
            <EmptyState
              className="border-0 bg-transparent"
              module="banking"
              icon={Search}
              title="No transactions match these filters"
              description="Try widening the date range, or clearing the search."
            />
          )}
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Loading activity…
            </div>
          )}
        </div>

        {nextCursor && !loading && (
          <div className="flex justify-center pt-5">
            <Button variant="outline" onClick={() => load(nextCursor)}>Load more</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
