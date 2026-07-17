import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireMembershipIn } from '@/lib/api-guards';
import {
  normalizeDosage, normalizeFrequency, parseRequiredDate,
  normalizeMinGapHours, normalizeMaxDosesPer24h,
} from '@/lib/medicine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : '';
  const context = await requireMembershipIn(req, res, householdId);
  if (!context) return;
  if (!id) return res.status(400).json({ error: 'Medicine ID required' });

  const existing = await prisma.medicine.findFirst({
    where: { id, householdId },
    include: { child: true },
  });
  if (!existing) return res.status(404).json({ error: 'Medicine not found' });

  if (req.method === 'GET') return res.status(200).json(existing);

  if (req.method === 'PUT') {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const dosage = normalizeDosage(req.body?.dosage, req.body?.unit);
    const frequency = normalizeFrequency(req.body?.frequency);
    if (!name || name.length > 100 || !dosage || !frequency) {
      return res.status(400).json({ error: 'Valid name, dosage, and frequency are required' });
    }

    const startDate = req.body?.startDate ? parseRequiredDate(req.body.startDate) : existing.startDate;
    const endDate = req.body?.endDate === '' || req.body?.endDate === null
      ? null
      : req.body?.endDate ? parseRequiredDate(req.body.endDate) : existing.endDate;
    if (!startDate || (req.body?.endDate && !endDate) || (endDate && endDate < startDate)) {
      return res.status(400).json({ error: 'Invalid medicine date range' });
    }

    const hasOverride = Object.prototype.hasOwnProperty.call(req.body || {}, 'nextDoseOverride');
    const nextDoseOverride = hasOverride && req.body?.nextDoseOverride
      ? parseRequiredDate(req.body.nextDoseOverride)
      : hasOverride ? null : existing.nextDoseOverride;
    if (hasOverride && req.body?.nextDoseOverride && !nextDoseOverride) {
      return res.status(400).json({ error: 'Invalid next dose override' });
    }
    const description = typeof req.body?.description === 'string'
      ? req.body.description.trim() || null
      : existing.description;
    const notes = typeof req.body?.notes === 'string'
      ? req.body.notes.trim() || null
      : typeof req.body?.instructions === 'string'
        ? req.body.instructions.trim() || null
        : existing.notes;
    if ((description?.length || 0) > 500 || (notes?.length || 0) > 2000) {
      return res.status(400).json({ error: 'Description or notes are too long' });
    }
    const hasOverrideReason = Object.prototype.hasOwnProperty.call(req.body || {}, 'overrideReason');
    const overrideReason = hasOverrideReason && typeof req.body?.overrideReason === 'string'
      ? req.body.overrideReason.trim() || null
      : hasOverrideReason ? null : existing.overrideReason;
    if ((overrideReason?.length || 0) > 500) {
      return res.status(400).json({ error: 'Override reason is too long' });
    }

    const minGapInput = normalizeMinGapHours(req.body?.minGapHours);
    const maxDosesInput = normalizeMaxDosesPer24h(req.body?.maxDosesPer24h);
    if (
      (req.body?.minGapHours != null && req.body?.minGapHours !== '' && minGapInput === undefined && req.body?.minGapHours !== undefined) ||
      (req.body?.maxDosesPer24h != null && req.body?.maxDosesPer24h !== '' && maxDosesInput === undefined && req.body?.maxDosesPer24h !== undefined)
    ) {
      return res.status(400).json({ error: 'Invalid safety limits: min gap must be 0.25-48 hours, daily max 1-24 doses' });
    }
    const activeIngredient = typeof req.body?.activeIngredient === 'string' ? req.body.activeIngredient.trim() : existing.activeIngredient || '';
    const formulation = typeof req.body?.formulation === 'string' ? req.body.formulation.trim() : existing.formulation || '';
    const concentration = typeof req.body?.concentration === 'string' ? req.body.concentration.trim() || null : existing.concentration;
    const rawDoseAmount = req.body?.doseAmount === undefined ? existing.doseAmount : Number(req.body.doseAmount);
    const doseUnit = typeof req.body?.doseUnit === 'string' ? req.body.doseUnit.trim() : existing.doseUnit || '';
    const sourceValue = req.body?.scheduleSource ?? existing.scheduleSource;
    const scheduleSource = new Set(['PACKAGING', 'LEAFLET', 'CLINICIAN']).has(sourceValue || '')
      ? sourceValue as 'PACKAGING' | 'LEAFLET' | 'CLINICIAN' : null;
    const scheduleSourceNotes = typeof req.body?.scheduleSourceNotes === 'string'
      ? req.body.scheduleSourceNotes.trim() || null : existing.scheduleSourceNotes;
    const finalMinGap = minGapInput === undefined ? existing.minGapHours : minGapInput;
    const finalMaxDoses = maxDosesInput === undefined ? existing.maxDosesPer24h : maxDosesInput;
    const isVerified = Boolean(activeIngredient && formulation && rawDoseAmount && rawDoseAmount > 0 && doseUnit && scheduleSource && finalMinGap && finalMaxDoses);
    if (!existing.isTemplate && !isVerified) {
      return res.status(400).json({ error: 'Verify the active ingredient, formulation, dose, minimum gap, daily maximum, and schedule source' });
    }
    const episodeId = typeof req.body?.episodeId === 'string' ? req.body.episodeId : existing.episodeId;
    if (episodeId && existing.childId) {
      const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId: existing.childId }, select: { id: true } });
      if (!episode) return res.status(400).json({ error: 'Episode does not belong to this child' });
    }

    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        name,
        description,
        dosage,
        frequency,
        notes,
        startDate,
        endDate,
        isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : existing.isActive,
        nextDoseOverride,
        overrideReason,
        minGapHours: finalMinGap,
        maxDosesPer24h: finalMaxDoses,
        isPrn: typeof req.body?.isPrn === 'boolean' ? req.body.isPrn : frequency === 'as needed' ? true : existing.isPrn,
        activeIngredient: activeIngredient || null,
        formulation: formulation || null,
        concentration,
        doseAmount: rawDoseAmount,
        doseUnit: doseUnit || null,
        scheduleSource,
        scheduleSourceNotes,
        scheduleVerifiedAt: isVerified ? new Date() : null,
        scheduleVerifiedBy: isVerified ? context.userId : null,
        episodeId,
      },
      include: { child: true },
    });
    return res.status(200).json(medicine);
  }

  if (req.method === 'DELETE') {
    if (existing.isTemplate) {
      await prisma.medicine.delete({ where: { id } });
      return res.status(200).json({ message: 'Medicine template deleted' });
    }

    const [doseCount, reminderCount] = await Promise.all([
      prisma.medicineDose.count({ where: { medicineId: id } }),
      prisma.medicineReminder.count({ where: { medicineId: id } }),
    ]);
    if (doseCount > 0 || reminderCount > 0) {
      await prisma.medicine.update({ where: { id }, data: { isActive: false } });
      return res.status(200).json({ message: 'Medicine deactivated because it has history' });
    }

    await prisma.medicine.delete({ where: { id } });
    return res.status(200).json({ message: 'Medicine deleted' });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
