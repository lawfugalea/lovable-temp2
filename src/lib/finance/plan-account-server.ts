import type { FinancePlanAccount } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export class FinancePlanError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

export function parseNonNegativeCents(value: unknown, options: { nullable?: boolean; max?: number } = {}): number | null {
  if ((value === undefined || value === null || value === '') && options.nullable) return null
  const normalized = typeof value === 'number'
    ? String(value)
    : typeof value === 'string'
      ? value.replace(/[€\s,]/g, '')
      : ''
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  const max = options.max ?? 10_000_000
  if (!Number.isFinite(amount) || amount < 0 || amount > max) return null
  return Math.round(amount * 100)
}

export function canSeePlanAccount(
  account: Pick<FinancePlanAccount, 'visibility' | 'ownerUserId' | 'archivedAt'>,
  userId: string,
): boolean {
  return !account.archivedAt && (account.visibility === 'SHARED' || account.ownerUserId === userId)
}

export function canManagePlanAccount(
  account: Pick<FinancePlanAccount, 'visibility' | 'ownerUserId' | 'archivedAt'>,
  userId: string,
): boolean {
  return !account.archivedAt && (account.visibility === 'SHARED' || account.ownerUserId === userId)
}

export async function assignmentAccountId(
  householdId: string,
  userId: string,
  value: unknown,
): Promise<string | null> {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new FinancePlanError('Invalid planning account')
  const account = await prisma.financePlanAccount.findFirst({
    where: { id: value, householdId },
    select: { id: true, visibility: true, ownerUserId: true, archivedAt: true },
  })
  if (!account || !canSeePlanAccount(account, userId)) {
    throw new FinancePlanError('Planning account not found', 404)
  }
  return account.id
}

export function financePlanErrorResponse(error: unknown): { status: number; message: string } {
  if (error instanceof FinancePlanError) return { status: error.status, message: error.message }
  return { status: 500, message: 'Could not update the money flow' }
}

