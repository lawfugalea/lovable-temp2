import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireMembershipIn } from '@/lib/api-guards';
import { normalizeDosage, parseRequiredDate, checkDoseSafety, serializableDoseWarnings } from '@/lib/medicine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : '';
  const context = await requireMembershipIn(req, res, householdId);
  if (!context) return;
  if (!id) return res.status(400).json({ error: 'Dose ID required' });

  const existing = await prisma.medicineDose.findFirst({
    where: { id, child: { householdId } },
    include: { child: true, medicine: true },
  });
  if (!existing) return res.status(404).json({ error: 'Dose not found' });
  if (req.method === 'GET') return res.status(200).json(existing);

  if (req.method === 'PUT') {
    const takenAt = parseRequiredDate(req.body?.takenAt);
    const dosage = normalizeDosage(req.body?.dosage, null);
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
    if (!takenAt || !dosage) return res.status(400).json({ error: 'Valid time and dosage are required' });
    if (notes.length > 2000) return res.status(400).json({ error: 'Dose notes are too long' });

    const episodeId = typeof req.body?.episodeId === 'string' ? req.body.episodeId : existing.episodeId;
    const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId: existing.childId }, select: { id: true } });
    if (!episode) return res.status(400).json({ error: 'Episode does not belong to this child and household' });
    // Safety guardrails on time edits; the edited dose itself is excluded from the check.
    const windowMs = 50 * 60 * 60 * 1000;
    const nearbyDoses = await prisma.medicineDose.findMany({
      where: {
        medicineId: existing.medicineId,
        takenAt: {
          gte: new Date(takenAt.getTime() - windowMs),
          lte: new Date(takenAt.getTime() + windowMs),
        },
      },
      select: { id: true, medicineId: true, takenAt: true },
    });
    const safety = checkDoseSafety(existing.medicine, nearbyDoses, takenAt, existing.id);
    const warnings = serializableDoseWarnings(safety.warnings);
    if (!safety.ok && req.body?.force !== true) {
      return res.status(409).json({ error: 'Dose safety check failed', warnings });
    }
    const warningReason = typeof req.body?.warningReason === 'string' ? req.body.warningReason.trim().slice(0, 500) : null;
    const dose = await prisma.medicineDose.update({
      where: { id },
      data: {
        takenAt,
        dosage,
        notes,
        episodeId,
        safetyWarnings: warnings.length ? warnings : undefined,
        warningAcknowledgedAt: warnings.length ? new Date() : null,
        warningAcknowledgedBy: warnings.length ? context.userId : null,
        warningReason: warnings.length ? warningReason : null,
      },
      include: { child: true, medicine: true },
    });
    return res.status(200).json(dose);
  }

  if (req.method === 'DELETE') {
    await prisma.medicineDose.delete({ where: { id } });
    return res.status(200).json({ message: 'Dose deleted' });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
