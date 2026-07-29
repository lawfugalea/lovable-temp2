/** Shapes returned by `/api/finance/overview`, shared across the banking pages. */

export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'REAUTH_REQUIRED' | 'ERROR'

export type Connection = {
  id: string
  aspspName: string
  status: ConnectionStatus
  consentExpiresAt: string | null
  lastSyncedAt: string | null
  lastSyncAttemptAt: string | null
  syncStartedAt: string | null
  syncError: string | null
  _count?: { accounts: number }
}

export type Account = {
  id: string
  displayName: string
  providerDisplayName: string
  customName: string | null
  maskedIdentifier: string | null
  currency: string
  cashAccountType: string | null
  shared: boolean
  owned: boolean
  canRename: boolean
  balance: { amount: string; currency: string; type: string; updatedAt: string } | null
  availableBalance: { amount: string; currency: string } | null
  bookedBalance: { amount: string; currency: string } | null
  connection: Connection & { userId: string }
}

export type Transaction = {
  id: string
  account: { id: string; displayName: string; maskedIdentifier: string | null }
  amount: string
  currency: string
  status: 'BOOKED' | 'PENDING'
  bookingDate: string | null
  valueDate: string | null
  counterparty: string | null
  description: string | null
  merchantName: string
  detail: string | null
  transactionType: string
  category: string
  signedAmount: number
  originalMerchantName: string
  originalCategory: string
  enrichmentSource: 'local' | 'rule' | 'override'
  ruleId: string | null
  canEdit: boolean
}

export type Overview = {
  bankEnabled: boolean
  canManage: boolean
  providerConfigured: boolean
  accounts: Account[]
  connections: Connection[]
  totals: Array<{ currency: string; amount: string }>
  recentTransactions: Transaction[]
}

export type BankingTab = 'overview' | 'transactions' | 'subscriptions' | 'coach' | 'analytics'
