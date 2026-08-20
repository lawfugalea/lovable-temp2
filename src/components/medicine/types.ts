export interface Child {
  id: string
  name: string
  dateOfBirth: string
  notes?: string | null
  isActive: boolean
}

export interface Medicine {
  id: string
  childId: string | null
  name: string
  description?: string | null
  dosage: string
  frequency: string
  startDate: string
  endDate?: string | null
  isActive: boolean
  isTemplate: boolean
  notes?: string | null
  nextDoseOverride?: string | null
  overrideReason?: string | null
  minGapHours?: number | null
  maxDosesPer24h?: number | null
  isPrn?: boolean
  activeIngredient?: string | null
  formulation?: string | null
  concentration?: string | null
  doseAmount?: number | null
  doseUnit?: string | null
  scheduleSource?: 'PACKAGING' | 'LEAFLET' | 'CLINICIAN' | null
  scheduleSourceNotes?: string | null
  scheduleVerifiedAt?: string | null
  episodeId?: string | null
}

export interface MedicineDose {
  id: string
  childId: string
  medicineId: string
  takenAt: string
  dosage: string
  notes?: string | null
  takenBy?: string | null
  episodeId: string
  safetyWarnings?: boolean
}

export interface HealthEpisode {
  id: string
  householdId: string
  childId: string
  title?: string | null
  notes?: string | null
  startedAt: string
  endedAt?: string | null
  isInferred: boolean
}

export interface FeverReading {
  id: string
  childId: string
  episodeId: string
  temperature: number
  unit: 'C' | 'F'
  method: string
  takenAt: string
  notes?: string | null
  takenBy?: string | null
}

export interface WeightMeasurement {
  id: string
  childId: string
  weightKg: number
  measuredAt: string
  notes?: string | null
}

export const FREQUENCY_OPTIONS = [
  'every 2 hours',
  'every 4 hours',
  'every 6 hours',
  'every 8 hours',
  'every 12 hours',
  'twice daily',
  'once daily',
  'as needed',
] as const

export function getChildAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth)
  const now = new Date()
  let ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) ageInMonths -= 1
  if (ageInMonths < 12) return `${Math.max(ageInMonths, 0)} months`
  const years = Math.floor(ageInMonths / 12)
  const months = ageInMonths % 12
  return months > 0 ? `${years}y ${months}m` : `${years} years`
}

export function toLocalDateTimeInput(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
