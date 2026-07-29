import {
  enrichTransaction,
  FINANCE_CATEGORIES,
  type EnrichedTransaction,
  type FinanceCategory,
  type TransactionEnrichmentInput,
} from './enrichment'
import { normalizeMerchantKey } from './merchant-key'

// Re-exported so the many call sites that key rules, limits and subscriptions off
// it keep importing from one place.
export { merchantGroupKey, normalizeMerchantKey } from './merchant-key'

export type FinanceRuleLike = {
  id: string
  accountId: string | null
  matchType: 'EXACT' | 'CONTAINS' | string
  matchValue: string
  merchantName: string | null
  category: string | null
  enabled: boolean
}

export type FinanceOverrideLike = {
  transactionId: string
  merchantName: string | null
  category: string | null
}

export type FinanceMetadataInput = TransactionEnrichmentInput & {
  id: string
  accountId: string
}

export type FinanceMetadata = EnrichedTransaction & {
  originalMerchantName: string
  originalCategory: FinanceCategory
  enrichmentSource: 'local' | 'rule' | 'override'
  ruleId: string | null
}

export function isFinanceCategory(value: unknown): value is FinanceCategory {
  return typeof value === 'string' && (FINANCE_CATEGORIES as readonly string[]).includes(value)
}

function matchingRule(rules: FinanceRuleLike[], accountId: string, merchantKey: string): FinanceRuleLike | null {
  const matches = rules.filter(rule => {
    if (!rule.enabled || (rule.accountId && rule.accountId !== accountId)) return false
    if (rule.matchType === 'CONTAINS') return Boolean(rule.matchValue) && merchantKey.includes(rule.matchValue)
    return merchantKey === rule.matchValue
  })
  return matches.sort((left, right) => {
    const accountDifference = Number(Boolean(right.accountId)) - Number(Boolean(left.accountId))
    if (accountDifference) return accountDifference
    const exactDifference = Number(right.matchType === 'EXACT') - Number(left.matchType === 'EXACT')
    if (exactDifference) return exactDifference
    return right.matchValue.length - left.matchValue.length
  })[0] || null
}

export function enrichWithFinanceMetadata(
  input: FinanceMetadataInput,
  rules: FinanceRuleLike[] = [],
  overrides: FinanceOverrideLike[] = [],
): FinanceMetadata {
  const local = enrichTransaction(input)
  const originalMerchantName = local.merchantName
  const originalCategory = local.category
  const override = overrides.find(item => item.transactionId === input.id)
  const rule = matchingRule(rules, input.accountId, normalizeMerchantKey(local.merchantName))
  const merchantName = override?.merchantName?.trim().slice(0, 160)
    || rule?.merchantName?.trim().slice(0, 160)
    || local.merchantName
  const selectedCategory = override?.category || rule?.category
  const category = isFinanceCategory(selectedCategory) ? selectedCategory : local.category

  return {
    ...local,
    merchantName,
    category,
    originalMerchantName,
    originalCategory,
    enrichmentSource: override ? 'override' : rule ? 'rule' : 'local',
    ruleId: !override && rule ? rule.id : null,
  }
}

export function ruleMatchesMerchant(rule: Pick<FinanceRuleLike, 'matchType' | 'matchValue'>, merchantName: string): boolean {
  const key = normalizeMerchantKey(merchantName)
  return rule.matchType === 'CONTAINS' ? key.includes(rule.matchValue) : key === rule.matchValue
}
