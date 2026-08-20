import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import { requireMembershipIn } from '@/lib/api-guards';
import {
  normalizeDosage, normalizeFrequency, parseRequiredDate,
  normalizeMinGapHours, normalizeMaxDosesPer24h,
} from '@/lib/medicine';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.query.householdId || req.body?.householdId || '');
  const context = await requireMembershipIn(req, res, householdId);
  if (!context) return;

  if (req.method === 'GET') {
    const templates = req.query.templates;
    const where = templates === 'true'
      ? { householdId, isTemplate: true }
      : templates === 'false'
        ? { householdId, isTemplate: false }
        : { householdId };

    const medicines = await prisma.medicine.findMany({
      where,
      include: { child: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(medicines);
  }

  if (req.method === 'POST') {
    const isTemplate = req.body?.isTemplate === true;
    const templateId = typeof req.body?.templateId === 'string' ? req.body.templateId : null;
    const childId = typeof req.body?.childId === 'string' ? req.body.childId : null;

    const child = childId
      ? await prisma.child.findFirst({ where: { id: childId, householdId }, select: { id: true } })
      : null;
    if (!isTemplate && !child) {
      return res.status(400).json({ error: 'A child in this household is required' });
    }

    const template = templateId
      ? await prisma.medicine.findFirst({
          where: { id: templateId, householdId, isTemplate: true },
          select: {
            name: true, description: true, dosage: true, frequency: true, notes: true,
            minGapHours: true, maxDosesPer24h: true, isPrn: true,
            activeIngredient: true, formulation: true, concentration: true,
            doseAmount: true, doseUnit: true, scheduleSource: true, scheduleSourceNotes: true,
            scheduleVerifiedAt: true,
          },
        })
      : null;
    if (templateId && !template) return res.status(404).json({ error: 'Template not found' });

    const name = template?.name || (typeof req.body?.name === 'string' ? req.body.name.trim() : '');
    const dosage = template?.dosage || normalizeDosage(req.body?.dosage, req.body?.unit);
    const frequency = template?.frequency || normalizeFrequency(req.body?.frequency);
    if (!name || name.length > 100 || !dosage || !frequency) {
      return res.status(400).json({ error: 'Valid name, dosage, and frequency are required' });
    }

    const minGapHours = template ? template.minGapHours : normalizeMinGapHours(req.body?.minGapHours);
    const maxDosesPer24h = template ? template.maxDosesPer24h : normalizeMaxDosesPer24h(req.body?.maxDosesPer24h);
    if (!template && (
      (req.body?.minGapHours != null && req.body?.minGapHours !== '' && minGapHours === undefined) ||
      (req.body?.maxDosesPer24h != null && req.body?.maxDosesPer24h !== '' && maxDosesPer24h === undefined)
    )) {
      return res.status(400).json({ error: 'Invalid safety limits: min gap must be 0.25-48 hours, daily max 1-24 doses' });
    }
    const isPrn = template
      ? template.isPrn
      : req.body?.isPrn === true || frequency === 'as needed';

    const activeIngredient = template?.activeIngredient || (typeof req.body?.activeIngredient === 'string' ? req.body.activeIngredient.trim() : '');
    const formulation = template?.formulation || (typeof req.body?.formulation === 'string' ? req.body.formulation.trim() : '');
    const concentration = template?.concentration || (typeof req.body?.concentration === 'string' ? req.body.concentration.trim() : null);
    const doseAmount = template?.doseAmount ?? Number(req.body?.doseAmount);
    const doseUnit = template?.doseUnit || (typeof req.body?.doseUnit === 'string' ? req.body.doseUnit.trim() : '');
    const scheduleSourceValue = template?.scheduleSource || req.body?.scheduleSource;
    const scheduleSource = new Set(['PACKAGING', 'LEAFLET', 'CLINICIAN']).has(scheduleSourceValue) ? scheduleSourceValue as 'PACKAGING' | 'LEAFLET' | 'CLINICIAN' : null;
    const scheduleSourceNotes = template?.scheduleSourceNotes || (typeof req.body?.scheduleSourceNotes === 'string' ? req.body.scheduleSourceNotes.trim() : null);
    const episodeId = typeof req.body?.episodeId === 'string' ? req.body.episodeId : null;
    const isVerified = Boolean(
      activeIngredient && formulation && Number.isFinite(doseAmount) && doseAmount > 0 && doseUnit
      && scheduleSource && minGapHours && maxDosesPer24h
    );
    if (!isTemplate && !isVerified) {
      return res.status(400).json({ error: 'Verify the active ingredient, formulation, dose, minimum gap, daily maximum, and schedule source' });
    }
    if ([activeIngredient, formulation, concentration || '', doseUnit].some((value) => value.length > 120)
      || (scheduleSourceNotes?.length || 0) > 500 || (Number.isFinite(doseAmount) && (doseAmount <= 0 || doseAmount > 100000))) {
      return res.status(400).json({ error: 'Invalid product or schedule verification details' });
    }
    if (!isTemplate && episodeId) {
      const episode = await prisma.healthEpisode.findFirst({ where: { id: episodeId, householdId, childId }, select: { id: true } });
      if (!episode) return res.status(400).json({ error: 'Episode does not belong to the selected child' });
    }

    const startDate = req.body?.startDate ? parseRequiredDate(req.body.startDate) : new Date();
    const endDate = req.body?.endDate ? parseRequiredDate(req.body.endDate) : null;
    if (!startDate || (req.body?.endDate && !endDate) || (endDate && endDate < startDate)) {
      return res.status(400).json({ error: 'Invalid medicine date range' });
    }
    const description = template?.description
      || (typeof req.body?.description === 'string' ? req.body.description.trim() : null);
    const notes = template?.notes
      || (typeof req.body?.notes === 'string'
        ? req.body.notes.trim()
        : typeof req.body?.instructions === 'string' ? req.body.instructions.trim() : null);
    if ((description?.length || 0) > 500 || (notes?.length || 0) > 2000) {
      return res.status(400).json({ error: 'Description or notes are too long' });
    }

    const medicine = await prisma.medicine.create({
      data: {
        householdId,
        childId: isTemplate ? null : childId,
        name,
        description,
        dosage,
        frequency,
        notes,
        startDate,
        endDate,
        isTemplate,
        isActive: !isTemplate,
        minGapHours: minGapHours ?? null,
        maxDosesPer24h: maxDosesPer24h ?? null,
        isPrn,
        activeIngredient: activeIngredient || null,
        formulation: formulation || null,
        concentration,
        doseAmount: Number.isFinite(doseAmount) ? doseAmount : null,
        doseUnit: doseUnit || null,
        scheduleSource,
        scheduleSourceNotes,
        scheduleVerifiedAt: isVerified ? new Date() : null,
        scheduleVerifiedBy: isVerified ? context.userId : null,
        episodeId: isTemplate ? null : episodeId,
      },
      include: { child: true },
    });
    return res.status(201).json(medicine);
  }

  if (req.method === 'PATCH') {
    const medicineId = typeof req.body?.medicineId === 'string' ? req.body.medicineId : '';
    const action = req.body?.action;
    const existing = await prisma.medicine.findFirst({ where: { id: medicineId, householdId } });
    if (!existing) return res.status(404).json({ error: 'Medicine not found' });
    if (action !== 'stop') return res.status(400).json({ error: 'Invalid action' });

    const medicine = await prisma.medicine.update({
      where: { id: medicineId },
      data: { isActive: false },
      include: { child: true },
    });
    return res.status(200).json(medicine);
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiHandler(handler)
