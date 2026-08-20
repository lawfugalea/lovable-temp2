import { normalizeDosage, normalizeFrequency, normalizeMaxDosesPer24h, normalizeMinGapHours, parseRequiredDate } from '@/lib/medicine'
import { prisma } from '@/lib/prisma'

export async function mobileHealthMember(userId: string, householdId: string) {
  if (!householdId) return null
  return prisma.membership.findUnique({ where: { userId_householdId: { userId, householdId } }, select: { role: true } })
}

export function normalizedText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, max) : null
}

export function verifiedMedicineInput(body: Record<string, unknown>, existing?: {
  childId: string | null; episodeId: string | null; description: string | null; notes: string | null; startDate: Date; endDate: Date | null; isActive: boolean
}) {
  const childId = typeof body.childId === 'string' ? body.childId : existing?.childId || ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const dosage = normalizeDosage(body.dosage, null)
  const frequency = normalizeFrequency(body.frequency)
  const activeIngredient = typeof body.activeIngredient === 'string' ? body.activeIngredient.trim() : ''
  const formulation = typeof body.formulation === 'string' ? body.formulation.trim() : ''
  const concentration = normalizedText(body.concentration, 120)
  const doseAmount = Number(body.doseAmount)
  const doseUnit = typeof body.doseUnit === 'string' ? body.doseUnit.trim() : ''
  const minGapHours = normalizeMinGapHours(body.minGapHours)
  const maxDosesPer24h = normalizeMaxDosesPer24h(body.maxDosesPer24h)
  const sourceValue = body.scheduleSource
  const scheduleSource = sourceValue === 'PACKAGING' || sourceValue === 'LEAFLET' || sourceValue === 'CLINICIAN' ? sourceValue : null
  const startDate = body.startDate ? parseRequiredDate(body.startDate) : existing?.startDate || new Date()
  const endDate = body.endDate === null || body.endDate === '' ? null : body.endDate ? parseRequiredDate(body.endDate) : existing?.endDate || null
  const description = normalizedText(body.description, 500) ?? existing?.description ?? null
  const notes = normalizedText(body.notes, 2000) ?? existing?.notes ?? null
  const scheduleSourceNotes = normalizedText(body.scheduleSourceNotes, 500)
  const episodeId = typeof body.episodeId === 'string' && body.episodeId ? body.episodeId : body.episodeId === null ? null : existing?.episodeId || null
  if (!childId || !name || name.length > 100 || !dosage || !frequency || !activeIngredient || !formulation || !Number.isFinite(doseAmount) || doseAmount <= 0 || doseAmount > 100000 || !doseUnit || minGapHours == null || maxDosesPer24h == null || !scheduleSource || !startDate || (endDate && endDate < startDate)) {
    return { error: 'Verify the child, medicine, dose, schedule, minimum gap, daily maximum, source, and dates' } as const
  }
  if ([activeIngredient, formulation, doseUnit].some(value => value.length > 120)) return { error: 'Medicine verification details are too long' } as const
  return { data: { childId, name, description, dosage, frequency, notes, startDate, endDate, isActive: typeof body.isActive === 'boolean' ? body.isActive : existing?.isActive ?? true, isTemplate: false, isPrn: body.isPrn === true || frequency === 'as needed', activeIngredient, formulation, concentration, doseAmount, doseUnit, minGapHours, maxDosesPer24h, scheduleSource, scheduleSourceNotes, scheduleVerifiedAt: new Date(), episodeId } } as const
}
