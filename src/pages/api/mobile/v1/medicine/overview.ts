import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileMedicineOverviewResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { getMedicineSchedule } from '@/lib/medicine'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse<MobileMedicineOverviewResponse | MobileApiError>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : ''
  if (!householdId) return res.status(400).json({ error: 'Missing householdId' })
  if (!(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Forbidden: not a member' })

  const now = new Date()
  const [children, medicines, recentDoses, recentFeverReadings, recentEpisodes, recentWeights] = await Promise.all([
    prisma.child.findMany({
      where: { householdId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, dateOfBirth: true, notes: true, isActive: true },
    }),
    prisma.medicine.findMany({
      where: { householdId, isActive: true, isTemplate: false, childId: { not: null } },
      orderBy: [{ child: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true, childId: true, name: true, description: true, dosage: true, frequency: true, startDate: true,
        endDate: true, isActive: true, isTemplate: true, nextDoseOverride: true,
        overrideReason: true, minGapHours: true, maxDosesPer24h: true, isPrn: true,
        scheduleVerifiedAt: true, notes: true, activeIngredient: true, formulation: true,
        concentration: true, doseAmount: true, doseUnit: true, scheduleSource: true,
        scheduleSourceNotes: true, episodeId: true, child: { select: { name: true } },
        doses: { orderBy: { takenAt: 'desc' }, take: 50, select: { id: true, medicineId: true, takenAt: true } },
      },
    }),
    prisma.medicineDose.findMany({
      where: { child: { householdId } },
      orderBy: { takenAt: 'desc' },
      take: 30,
      select: { id: true, childId: true, medicineId: true, episodeId: true, dosage: true, notes: true, takenAt: true, child: { select: { name: true } }, medicine: { select: { name: true } } },
    }),
    prisma.feverReading.findMany({
      where: { child: { householdId } },
      orderBy: { takenAt: 'desc' },
      take: 30,
      select: { id: true, childId: true, episodeId: true, temperature: true, unit: true, method: true, notes: true, takenAt: true, child: { select: { name: true } } },
    }),
    prisma.healthEpisode.findMany({
      where: { householdId },
      orderBy: { startedAt: 'desc' },
      take: 30,
      select: {
        id: true, childId: true, title: true, notes: true, startedAt: true, endedAt: true, isInferred: true,
        child: { select: { name: true } },
        _count: { select: { doses: true, feverReadings: true } },
      },
    }),
    prisma.weightMeasurement.findMany({
      where: { child: { householdId } },
      orderBy: { measuredAt: 'desc' },
      take: 30,
      select: { id: true, childId: true, weightKg: true, notes: true, measuredAt: true, child: { select: { name: true } } },
    }),
  ])

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    householdId,
    generatedAt: now.toISOString(),
    children: children.map(child => ({ ...child, dateOfBirth: child.dateOfBirth.toISOString() })),
    medicines: medicines.map(medicine => {
      const schedule = getMedicineSchedule(medicine, medicine.doses, now)
      return {
        id: medicine.id,
        childId: medicine.childId as string,
        childName: medicine.child?.name || 'Child',
        name: medicine.name,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        isPrn: schedule.isPrn,
        scheduleVerified: Boolean(medicine.scheduleVerifiedAt),
        nextDoseAt: schedule.nextDoseTime?.toISOString() ?? null,
        isDue: schedule.isDue,
        lastDoseAt: schedule.lastDoseAt?.toISOString() ?? null,
        canGiveAt: schedule.canGiveAt?.toISOString() ?? null,
        canGiveNow: schedule.canGiveNow,
        dosesLast24h: schedule.dosesLast24h,
        maxDosesPer24h: medicine.maxDosesPer24h,
        dailyLimitReached: schedule.dailyLimitReached,
        isOverride: schedule.isOverride,
        description: medicine.description,
        notes: medicine.notes,
        startDate: medicine.startDate.toISOString(),
        endDate: medicine.endDate?.toISOString() ?? null,
        activeIngredient: medicine.activeIngredient,
        formulation: medicine.formulation,
        concentration: medicine.concentration,
        doseAmount: medicine.doseAmount,
        doseUnit: medicine.doseUnit,
        minGapHours: medicine.minGapHours,
        scheduleSource: medicine.scheduleSource,
        scheduleSourceNotes: medicine.scheduleSourceNotes,
        episodeId: medicine.episodeId || recentEpisodes.find(episode => episode.childId === medicine.childId && !episode.endedAt)?.id || null,
      }
    }),
    recentDoses: recentDoses.map(dose => ({
      id: dose.id,
      childId: dose.childId,
      medicineId: dose.medicineId,
      episodeId: dose.episodeId,
      childName: dose.child.name,
      medicineName: dose.medicine.name,
      dosage: dose.dosage,
      notes: dose.notes,
      takenAt: dose.takenAt.toISOString(),
    })),
    recentFeverReadings: recentFeverReadings.map(reading => ({
      id: reading.id,
      childId: reading.childId,
      childName: reading.child.name,
      temperature: reading.temperature,
      unit: reading.unit,
      method: reading.method,
      episodeId: reading.episodeId,
      notes: reading.notes,
      takenAt: reading.takenAt.toISOString(),
    })),
    recentEpisodes: recentEpisodes.map(episode => ({
      id: episode.id,
      childId: episode.childId,
      childName: episode.child.name,
      title: episode.title,
      notes: episode.notes,
      startedAt: episode.startedAt.toISOString(),
      endedAt: episode.endedAt?.toISOString() ?? null,
      isInferred: episode.isInferred,
      doseCount: episode._count.doses,
      feverReadingCount: episode._count.feverReadings,
    })),
    recentWeights: recentWeights.map(measurement => ({
      id: measurement.id,
      childId: measurement.childId,
      childName: measurement.child.name,
      weightKg: measurement.weightKg,
      measuredAt: measurement.measuredAt.toISOString(),
      notes: measurement.notes,
    })),
  })
}

export default withApiHandler(handler)
