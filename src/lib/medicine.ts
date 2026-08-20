const FREQUENCY_HOURS: Record<string, number> = {
  'every 2 hours': 2,
  'every 4 hours': 4,
  'every 6 hours': 6,
  'every 8 hours': 8,
  'every 12 hours': 12,
  'twice daily': 12,
  'once daily': 24,
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const EPISODE_QUIET_GAP_MS = 72 * HOUR_MS;

export function needsEpisodeDecision(lastEventAt: Date | string | null | undefined, eventAt: Date = new Date()): boolean {
  if (!lastEventAt) return true;
  const last = new Date(lastEventAt);
  return Number.isNaN(last.getTime()) || eventAt.getTime() - last.getTime() > EPISODE_QUIET_GAP_MS;
}

export function serializableDoseWarnings(warnings: DoseSafetyWarning[]) {
  return warnings.map((warning) => warning.kind === 'too-early'
    ? {
        kind: warning.kind,
        earliestSafeTime: warning.earliestSafeTime.toISOString(),
        nearestDoseAt: warning.nearestDoseAt.toISOString(),
        minGapHours: warning.minGapHours,
      }
    : warning);
}

/** Hours between doses implied by a frequency string; null for "as needed" or unparseable input. */
export function parseFrequencyHours(frequency: string): number | null {
  const normalized = frequency.trim().toLowerCase();
  if (normalized === 'as needed') return null;
  let hours = FREQUENCY_HOURS[normalized];
  if (!hours) {
    const match = normalized.match(/(?:every\s+)?(\d+(?:\.\d+)?)\s*hours?/);
    if (match) hours = Number(match[1]);
    else if (normalized.includes('daily')) hours = 24;
  }
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

/**
 * Fallback gap, in hours, when a frequency string cannot be parsed.
 *
 * Six hours is the conservative choice among the frequencies this app accepts —
 * long enough that it never suggests a dose earlier than a 4-, 8- or 12-hourly
 * schedule would, without being so long that the reminder is useless.
 */
export const UNPARSEABLE_FREQUENCY_FALLBACK_HOURS = 6;

export function calculateNextDoseTime(frequency: string, lastDoseTime: Date): Date {
  const parsed = parseFrequencyHours(frequency);
  if (parsed === null) {
    // Guessing silently in a dosing calculation is the wrong default. The value
    // is still returned so the schedule renders, but the guess is recorded —
    // an unparseable frequency means a medicine was saved with a format the
    // parser does not know, and that is a data problem worth seeing.
    console.warn(
      `[medicine] unparseable frequency ${JSON.stringify(frequency)}; ` +
      `assuming ${UNPARSEABLE_FREQUENCY_FALLBACK_HOURS}h until the next dose`,
    );
  }
  const hours = parsed ?? UNPARSEABLE_FREQUENCY_FALLBACK_HOURS;
  return new Date(lastDoseTime.getTime() + hours * HOUR_MS);
}

export interface ScheduleMedicine {
  id: string;
  frequency: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  isActive: boolean;
  isTemplate: boolean;
  nextDoseOverride?: string | Date | null;
  overrideReason?: string | null;
  minGapHours?: number | null;
  maxDosesPer24h?: number | null;
  isPrn?: boolean;
}

export interface ScheduleDose {
  id?: string;
  medicineId: string;
  takenAt: string | Date;
}

export interface MedicineSchedule {
  /** When the next dose is expected; always null for PRN, templates, stopped, or ended courses. */
  nextDoseTime: Date | null;
  isDue: boolean;
  lastDoseAt: Date | null;
  isOverride: boolean;
  overrideReason: string | null;
  hasEnded: boolean;
  /** Milliseconds until the next dose; 0 when due, null when nothing is scheduled. */
  msUntilNext: number | null;
  isPrn: boolean;
  /** Earliest time it is safe to give (last dose + min gap); null when no gap applies or nothing given yet. */
  canGiveAt: Date | null;
  /** Milliseconds until the next eligible PRN/safety time, calculated using the same render tick as the schedule. */
  msUntilCanGive: number | null;
  /** True when canGiveAt is in the past (or no gap applies) and the daily limit isn't reached. */
  canGiveNow: boolean;
  dosesLast24h: number;
  dailyLimitReached: boolean;
}

export function isPrnMedicine(medicine: Pick<ScheduleMedicine, 'frequency' | 'isPrn'>): boolean {
  return medicine.isPrn === true || medicine.frequency.trim().toLowerCase() === 'as needed';
}

/** Minimum milliseconds between doses: explicit minGapHours, else the scheduled frequency interval. PRN has no implicit gap. */
export function getMinGapMs(medicine: Pick<ScheduleMedicine, 'frequency' | 'isPrn' | 'minGapHours'>): number | null {
  if (typeof medicine.minGapHours === 'number' && medicine.minGapHours > 0) {
    return medicine.minGapHours * HOUR_MS;
  }
  if (isPrnMedicine(medicine)) return null;
  const hours = parseFrequencyHours(medicine.frequency);
  return hours ? hours * HOUR_MS : null;
}

function medicineDoses(medicine: ScheduleMedicine, doses: ScheduleDose[]): Date[] {
  return doses
    .filter((dose) => dose.medicineId === medicine.id)
    .map((dose) => new Date(dose.takenAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
}

/**
 * Single source of truth for medicine scheduling, shared by the medicine page
 * and the notifications API. Scheduled medicines: manual override first, then
 * last dose + frequency, then the course start date. PRN ("as needed")
 * medicines are never due; they expose canGiveAt/canGiveNow instead.
 * Templates, stopped courses, and courses past their end date are never due.
 */
export function getMedicineSchedule(
  medicine: ScheduleMedicine,
  doses: ScheduleDose[],
  now: Date = new Date()
): MedicineSchedule {
  const taken = medicineDoses(medicine, doses);
  const lastDoseAt = taken[0] || null;
  const prn = isPrnMedicine(medicine);

  const endDate = medicine.endDate ? new Date(medicine.endDate) : null;
  const hasEnded = !!endDate && !Number.isNaN(endDate.getTime()) && now > endDate;
  const inactive = medicine.isTemplate || !medicine.isActive || hasEnded;

  const dosesLast24h = taken.filter((d) => d.getTime() > now.getTime() - DAY_MS && d <= now).length;
  const max = medicine.maxDosesPer24h;
  const dailyLimitReached = !inactive && typeof max === 'number' && max > 0 && dosesLast24h >= max;

  const gapMs = getMinGapMs(medicine);
  const canGiveAt = !inactive && lastDoseAt && gapMs
    ? new Date(lastDoseAt.getTime() + gapMs)
    : null;
  const canGiveNow = !inactive && !dailyLimitReached && (!canGiveAt || now >= canGiveAt);
  const msUntilCanGive = canGiveAt ? Math.max(0, canGiveAt.getTime() - now.getTime()) : null;

  const base = {
    lastDoseAt,
    hasEnded,
    isPrn: prn,
    canGiveAt,
    msUntilCanGive,
    canGiveNow,
    dosesLast24h,
    dailyLimitReached,
  };
  const idle: MedicineSchedule = {
    ...base,
    nextDoseTime: null,
    isDue: false,
    isOverride: false,
    overrideReason: null,
    msUntilNext: null,
  };
  if (inactive || prn) return idle;

  const override = medicine.nextDoseOverride ? new Date(medicine.nextDoseOverride) : null;
  const nextDoseTime = override && !Number.isNaN(override.getTime())
    ? override
    : lastDoseAt
      ? calculateNextDoseTime(medicine.frequency, lastDoseAt)
      : new Date(medicine.startDate);
  if (Number.isNaN(nextDoseTime.getTime())) return idle;

  return {
    ...base,
    nextDoseTime,
    isDue: now >= nextDoseTime,
    isOverride: !!override,
    overrideReason: override ? medicine.overrideReason || null : null,
    msUntilNext: Math.max(0, nextDoseTime.getTime() - now.getTime()),
  };
}

export type DoseSafetyWarning =
  | { kind: 'too-early'; earliestSafeTime: Date; nearestDoseAt: Date; minGapHours: number }
  | { kind: 'daily-limit'; count: number; max: number };

export interface DoseSafetyResult {
  ok: boolean;
  warnings: DoseSafetyWarning[];
}

/**
 * Check a proposed dose time against the medicine's safety guardrails:
 * minimum gap to the nearest other dose (in either direction, so backdated
 * entries are covered) and the max-doses-per-24h cap. Pass excludeDoseId when
 * editing an existing dose so it doesn't collide with itself.
 */
export function checkDoseSafety(
  medicine: ScheduleMedicine,
  doses: ScheduleDose[],
  proposedTakenAt: Date,
  excludeDoseId?: string
): DoseSafetyResult {
  const others = doses.filter(
    (dose) => dose.medicineId === medicine.id && (!excludeDoseId || dose.id !== excludeDoseId)
  );
  const times = others
    .map((dose) => new Date(dose.takenAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  const warnings: DoseSafetyWarning[] = [];

  const gapMs = getMinGapMs(medicine);
  if (gapMs && times.length > 0) {
    const nearest = times.reduce((best, t) =>
      Math.abs(t.getTime() - proposedTakenAt.getTime()) < Math.abs(best.getTime() - proposedTakenAt.getTime()) ? t : best
    );
    if (Math.abs(nearest.getTime() - proposedTakenAt.getTime()) < gapMs) {
      warnings.push({
        kind: 'too-early',
        earliestSafeTime: new Date(nearest.getTime() + gapMs),
        nearestDoseAt: nearest,
        minGapHours: gapMs / HOUR_MS,
      });
    }
  }

  const max = medicine.maxDosesPer24h;
  if (typeof max === 'number' && max > 0) {
    const count = times.filter(
      (t) => t.getTime() > proposedTakenAt.getTime() - DAY_MS && t <= proposedTakenAt
    ).length;
    if (count >= max) {
      warnings.push({ kind: 'daily-limit', count, max });
    }
  }

  return { ok: warnings.length === 0, warnings };
}

export function describeDoseSafetyWarning(warning: DoseSafetyWarning): string {
  if (warning.kind === 'too-early') {
    const time = warning.earliestSafeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Too soon after the previous dose (minimum gap ${warning.minGapHours}h). Safe after ${time}.`;
  }
  return `Daily limit reached: ${warning.count} of ${warning.max} doses already given in this 24h window.`;
}

export function formatTimeUntil(milliseconds: number): string {
  if (milliseconds <= 0) return 'now';
  const hours = Math.floor(milliseconds / HOUR_MS);
  const minutes = Math.floor((milliseconds % HOUR_MS) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDosage(dosage: unknown, unit: unknown): string | null {
  const value = typeof dosage === 'string' || typeof dosage === 'number' ? String(dosage).trim() : '';
  if (!value || value.length > 80) return null;
  const normalizedUnit = typeof unit === 'string' && unit.trim() ? unit.trim() : '';
  if (!normalizedUnit || /[a-z]/i.test(value) || value.toLowerCase().includes(normalizedUnit.toLowerCase())) return value;
  return `${value} ${normalizedUnit}`;
}

export function normalizeFrequency(frequency: unknown): string | null {
  const value = typeof frequency === 'string' ? frequency.trim().toLowerCase() : '';
  if (!value || value.length > 80) return null;
  if (/^\d+(?:\.\d+)?$/.test(value)) return `every ${value} hours`;
  return value;
}

/** Validate optional safety fields from a request body. Returns undefined when absent, null when explicitly cleared. */
export function normalizeMinGapHours(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(num) || num < 0.25 || num > 48) return undefined;
  return num;
}

export function normalizeMaxDosesPer24h(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(num) || num < 1 || num > 24) return undefined;
  return num;
}
