import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireMembershipIn } from '@/lib/api-guards';
import { normalizeDosage, parseRequiredDate, checkDoseSafety, serializableDoseWarnings } from '@/lib/medicine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.method === 'GET' ? req.query.householdId || '' : req.body?.householdId || '');
  const context = await requireMembershipIn(req, res, householdId);
  if (!context) return;

  if (req.method === 'GET') {
    const startDate = req.query.startDate ? parseRequiredDate(req.query.startDate) : null;
    if (req.query.startDate && !startDate) return res.status(400).json({ error: 'Invalid start date' });
    const doses = await prisma.medicineDose.findMany({
      where: {
        child: { householdId },
        ...(startDate ? { takenAt: { gte: startDate } } : {}),
      },
      include: { child: true, medicine: true },
      orderBy: { takenAt: 'desc' },
    });
    return res.status(200).json(doses);
  }

  if (req.method === 'POST') {
    const childId = typeof req.body?.childId === 'string' ? req.body.childId : '';
    const medicineId = typeof req.body?.medicineId === 'string' ? req.body.medicineId : '';
    const medicineName = typeof req.body?.medicineName === 'string' ? req.body.medicineName.trim() : '';
    const episodeId = typeof req.body?.episodeId === 'string' ? req.body.episodeId : '';
    const takenAt = parseRequiredDate(req.body?.takenAt);
    const dosage = normalizeDosage(req.body?.dosage, null);
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
    if (!childId || (!medicineId && !medicineName) || !episodeId || !takenAt || !dosage) {
      return res.status(400).json({ error: 'Valid episode, child, medicine, time, and dosage are required' });
    }
    if (medicineName.length > 100) return res.status(400).json({ error: 'Medicine name is too long' });
    if ((notes?.length || 0) > 2000) return res.status(400).json({ error: 'Dose notes are too long' });

    const medicine = medicineId ? await prisma.medicine.findFirst({
      where: { id: medicineId, householdId, childId, isTemplate: false, isActive: true },
    }) : null;
    if (medicineId && !medicine) {
      return res.status(400).json({ error: 'Medicine does not belong to the selected child and household' });
    }
    const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId }, select: { id: true } });
    if (!episode) return res.status(400).json({ error: 'Episode does not belong to the selected child and household' });

    // Timing checks apply only when a parent has verified a schedule. A factual
    // journal entry must still be possible when no schedule has been configured.
    let warnings: ReturnType<typeof serializableDoseWarnings> = [];
    if (medicine?.scheduleVerifiedAt) {
      const windowMs = 50 * 60 * 60 * 1000;
      const nearbyDoses = await prisma.medicineDose.findMany({
        where: {
          medicineId: medicine.id,
          takenAt: {
            gte: new Date(takenAt.getTime() - windowMs),
            lte: new Date(takenAt.getTime() + windowMs),
          },
        },
        select: { id: true, medicineId: true, takenAt: true },
      });
      const safety = checkDoseSafety(medicine, nearbyDoses, takenAt);
      warnings = serializableDoseWarnings(safety.warnings);
      if (!safety.ok && req.body?.force !== true) {
        return res.status(409).json({ error: 'Dose safety check failed', warnings });
      }
    }
    const warningReason = typeof req.body?.warningReason === 'string' ? req.body.warningReason.trim().slice(0, 500) : null;

    const dose = await prisma.$transaction(async (tx) => {
      const doseMedicine = medicine || await tx.medicine.create({
        data: {
          householdId,
          childId,
          name: medicineName,
          dosage,
          frequency: 'schedule not set',
          startDate: takenAt,
          isActive: true,
          isTemplate: false,
          isPrn: false,
          episodeId,
        },
      });
      const created = await tx.medicineDose.create({
        data: {
          childId,
          medicineId: doseMedicine.id,
          episodeId,
          takenAt,
          dosage,
          notes,
          takenBy: context.userId,
          safetyWarnings: warnings.length ? warnings : undefined,
          warningAcknowledgedAt: warnings.length ? new Date() : undefined,
          warningAcknowledgedBy: warnings.length ? context.userId : undefined,
          warningReason,
        },
      });
      if (medicine) {
        await tx.medicine.update({
          where: { id: medicine.id },
          data: { nextDoseOverride: null, overrideReason: null },
        });
      }
      return created;
    });
    return res.status(201).json(dose);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
