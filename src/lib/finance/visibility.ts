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
