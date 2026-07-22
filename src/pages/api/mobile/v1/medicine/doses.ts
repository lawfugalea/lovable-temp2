import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileDoseWarning, MobileHealthMutationResponse, MobileRecordDoseRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { mobileHealthMember, normalizedText } from '@/lib/mobile-health'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { checkDoseSafety, normalizeDosage, parseRequiredDate, serializableDoseWarnings } from '@/lib/medicine'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type Response = MobileHealthMutationResponse | MobileApiError | { error: string; warnings: MobileDoseWarning[] }

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method || '')) { res.setHeader('Allow', ['POST', 'PUT', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileRecordDoseRequest> & { id?: string }
  const householdId = typeof body.householdId === 'string' ? body.householdId : ''
  if (!(await mobileHealthMember(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  const id = typeof body.id === 'string' ? body.id : ''
  if (req.method === 'DELETE') {
    const existing = await prisma.medicineDose.findFirst({ where: { id, child: { householdId } }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Dose not found' })
    await prisma.medicineDose.delete({ where: { id } }); return res.status(200).json({ ok: true, id })
  }
  const existing = req.method === 'PUT' ? await prisma.medicineDose.findFirst({ where: { id, child: { householdId } }, include: { medicine: true } }) : null
  if (req.method === 'PUT' && !existing) return res.status(404).json({ error: 'Dose not found' })
  const childId = typeof body.childId === 'string' ? body.childId : existing?.childId || ''
  const medicineId = typeof body.medicineId === 'string' ? body.medicineId : existing?.medicineId || ''
  const episodeId = typeof body.episodeId === 'string' ? body.episodeId : existing?.episodeId || ''
  const takenAt = body.takenAt ? parseRequiredDate(body.takenAt) : existing?.takenAt || new Date()
  const dosage = normalizeDosage(body.dosage, null)
  if (!childId || !medicineId || !episodeId || !takenAt || !dosage) return res.status(400).json({ error: 'Valid child, medicine, episode, time, and dosage are required' })
  const [medicine, episode] = await Promise.all([
    prisma.medicine.findFirst({ where: { id: medicineId, householdId, childId, isTemplate: false, ...(existing ? {} : { isActive: true }) } }),
    prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId }, select: { id: true } }),
  ])
  if (!medicine || !episode) return res.status(400).json({ error: 'Medicine and episode must belong to the selected child' })
  let warnings = [] as MobileDoseWarning[] & Prisma.InputJsonArray
  if (medicine.scheduleVerifiedAt) {
    const windowMs = 50 * 60 * 60 * 1000
    const nearby = await prisma.medicineDose.findMany({ where: { medicineId, takenAt: { gte: new Date(takenAt.getTime() - windowMs), lte: new Date(takenAt.getTime() + windowMs) } }, select: { id: true, medicineId: true, takenAt: true } })
    const safety = checkDoseSafety(medicine, nearby, takenAt, existing?.id)
    warnings = serializableDoseWarnings(safety.warnings) as unknown as MobileDoseWarning[] & Prisma.InputJsonArray
    if (!safety.ok && body.force !== true) return res.status(409).json({ error: 'Dose safety check failed', warnings })
  }
  const notes = normalizedText(body.notes, 2000)
  const warningReason = normalizedText(body.warningReason, 500)
  if (existing) {
    await prisma.medicineDose.update({ where: { id }, data: { childId, medicineId, episodeId, takenAt, dosage, notes, takenBy: identity.userId, safetyWarnings: warnings.length ? warnings : undefined, warningAcknowledgedAt: warnings.length ? new Date() : null, warningAcknowledgedBy: warnings.length ? identity.userId : null, warningReason: warnings.length ? warningReason : null } })
    return res.status(200).json({ ok: true, id })
  }
  const dose = await prisma.$transaction(async tx => {
    const created = await tx.medicineDose.create({ data: { childId, medicineId, episodeId, takenAt, dosage, notes, takenBy: identity.userId, safetyWarnings: warnings.length ? warnings : undefined, warningAcknowledgedAt: warnings.length ? new Date() : undefined, warningAcknowledgedBy: warnings.length ? identity.userId : undefined, warningReason } })
    await tx.medicine.update({ where: { id: medicineId }, data: { nextDoseOverride: null, overrideReason: null } })
    return created
  })
  return res.status(201).json({ ok: true, id: dose.id })
}

export default withApiHandler(handler)
