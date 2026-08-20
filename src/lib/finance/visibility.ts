/**
 * Prisma predicate used by every read path. A viewer can see accounts they own
 * or accounts explicitly shared to the household whose membership was already
 * verified by requireFinanceAccess.
 */
export function buildAccessibleBankAccountWhere(userId: string, householdId: string) {
  return {
    OR: [
      { connection: { userId } },
      { shares: { some: { householdId } } },
    ],
  }
}

export type DedupableAccount = {
  id: string
  identificationHash: string
  connection: { userId: string; lastSyncedAt: Date | null }
}

/**
 * Collapse the copies of a jointly held account down to one.
 *
 * A joint account reached through two people's bank logins is imported once per
 * connection: `BankAccount` is unique on (connectionId, identificationHash), so
 * the same real account legitimately occupies one row per owner. Both rows carry
 * the same provider `identificationHash` — it is derived from the IBAN and
 * currency — and the same transactions under the same `deduplicationKey`. Once
 * both owners share to the household, every read path would otherwise count that
 * account's balance twice and its transactions twice.
 *
 * The copy kept is the viewer's own, so ownership and the Share control stay
 * where the reader expects them. When the viewer owns none of the copies — they
 * are seeing someone else's shared account — the most recently synced one wins,
 * falling back to account id so the choice is stable between requests rather
 * than dependent on row order.
 */
export function dedupeAccountsByIdentity<T extends DedupableAccount>(
  accounts: T[],
  viewerUserId: string,
): T[] {
  const canonical = new Map<string, T>()
  for (const account of accounts) {
    const held = canonical.get(account.identificationHash)
    if (!held || preferAccount(account, held, viewerUserId)) {
      canonical.set(account.identificationHash, account)
    }
  }
  // Preserve the caller's ordering; the map is only used to choose a winner.
  const kept = new Set([...canonical.values()].map(account => account.id))
  return accounts.filter(account => kept.has(account.id))
}

function preferAccount<T extends DedupableAccount>(candidate: T, held: T, viewerUserId: string): boolean {
  const candidateIsOwn = candidate.connection.userId === viewerUserId
  const heldIsOwn = held.connection.userId === viewerUserId
  if (candidateIsOwn !== heldIsOwn) return candidateIsOwn

  const candidateSynced = candidate.connection.lastSyncedAt?.getTime() ?? -1
  const heldSynced = held.connection.lastSyncedAt?.getTime() ?? -1
  if (candidateSynced !== heldSynced) return candidateSynced > heldSynced
  return candidate.id < held.id
}
