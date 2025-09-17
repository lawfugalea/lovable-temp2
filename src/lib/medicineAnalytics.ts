// Enhanced Medicine Analytics Library
import { format, differenceInDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'

export interface MedicineDose {
  id: string
  takenAt: string
  medicineId: string
  childId: string
  dosage: string
  notes?: string
}

export interface Medicine {
  id: string
  name: string
  frequency: string
  startDate: string
  endDate?: string
  childId: string
  isActive: boolean
  medicineType: string
}

export interface Child {
  id: string
  name: string
  dateOfBirth: string
}

export interface AdherenceMetrics {
  overallAdherence: number
  medicineAdherence: Array<{
    medicineId: string
    medicineName: string
    childName: string
    adherence: number
    expectedDoses: number
    actualDoses: number
    missedDoses: number
    period: {
      start: string
      end: string
      days: number
    }
  }>
  childAdherence: Array<{
    childId: string
    childName: string
    adherence: number
    totalExpected: number
    totalActual: number
    totalMissed: number
  }>
  dailyAdherence: Array<{
    date: string
    expectedDoses: number
    actualDoses: number
    adherence: number
  }>
}

/**
 * Calculate the expected number of doses for a medicine based on its frequency
 */
export function calculateExpectedDoses(
  medicine: Medicine,
  startDate: Date,
  endDate: Date
): number {
  const totalDays = differenceInDays(endDate, startDate) + 1
  
  // Parse frequency to get doses per day
  const dosesPerDay = parseFrequencyToDosesPerDay(medicine.frequency)
  
  return Math.max(0, totalDays * dosesPerDay)
}

/**
 * Parse medicine frequency string to get doses per day
 */
export function parseFrequencyToDosesPerDay(frequency: string): number {
  const freq = frequency.toLowerCase()
  
  // Handle specific frequencies
  if (freq.includes('once daily') || freq === 'daily') return 1
  if (freq.includes('twice daily')) return 2
  if (freq.includes('three times daily') || freq.includes('three daily')) return 3
  if (freq.includes('four times daily') || freq.includes('four daily')) return 4
  
  // Handle hourly frequencies
  if (freq.includes('every 2 hours')) return 12 // 24/2 = 12 doses per day
  if (freq.includes('every 4 hours')) return 6  // 24/4 = 6 doses per day
  if (freq.includes('every 6 hours')) return 4  // 24/6 = 4 doses per day
  if (freq.includes('every 8 hours')) return 3  // 24/8 = 3 doses per day
  if (freq.includes('every 12 hours')) return 2 // 24/12 = 2 doses per day
  
  // Handle "as needed" - assume 1 dose per day for calculation purposes
  if (freq.includes('as needed')) return 1
  
  // Default fallback
  return 1
}

/**
 * Calculate adherence metrics for a given time period
 */
export function calculateAdherenceMetrics(
  medicines: Medicine[],
  doses: MedicineDose[],
  children: Child[],
  startDate: Date,
  endDate: Date
): AdherenceMetrics {
  const activeMedicines = medicines.filter(m => m.isActive && m.medicineType === 'course')
  
  // Calculate medicine-specific adherence
  const medicineAdherence = activeMedicines.map(medicine => {
    const child = children.find(c => c.id === medicine.childId)
    const medicineStartDate = new Date(medicine.startDate)
    const medicineEndDate = medicine.endDate ? new Date(medicine.endDate) : endDate
    
    // Use the later of medicine start date or analysis start date
    const analysisStartDate = isAfter(medicineStartDate, startDate) ? medicineStartDate : startDate
    const analysisEndDate = isBefore(medicineEndDate, endDate) ? medicineEndDate : endDate
    
    // Skip if medicine wasn't active during the analysis period
    if (isAfter(analysisStartDate, analysisEndDate)) {
      return {
        medicineId: medicine.id,
        medicineName: medicine.name,
        childName: child?.name || 'Unknown',
        adherence: 0,
        expectedDoses: 0,
        actualDoses: 0,
        missedDoses: 0,
        period: {
          start: format(analysisStartDate, 'yyyy-MM-dd'),
          end: format(analysisEndDate, 'yyyy-MM-dd'),
          days: 0
        }
      }
    }
    
    const expectedDoses = calculateExpectedDoses(medicine, analysisStartDate, analysisEndDate)
    
    // Count actual doses taken during the period
    const actualDoses = doses.filter(dose => 
      dose.medicineId === medicine.id &&
      isAfter(new Date(dose.takenAt), analysisStartDate) &&
      isBefore(new Date(dose.takenAt), endOfDay(analysisEndDate))
    ).length
    
    const missedDoses = Math.max(0, expectedDoses - actualDoses)
    const adherence = expectedDoses > 0 ? (actualDoses / expectedDoses) * 100 : 0
    
    return {
      medicineId: medicine.id,
      medicineName: medicine.name,
      childName: child?.name || 'Unknown',
      adherence: Math.round(adherence * 10) / 10, // Round to 1 decimal
      expectedDoses,
      actualDoses,
      missedDoses,
      period: {
        start: format(analysisStartDate, 'yyyy-MM-dd'),
        end: format(analysisEndDate, 'yyyy-MM-dd'),
        days: differenceInDays(analysisEndDate, analysisStartDate) + 1
      }
    }
  })
  
  // Calculate child-specific adherence
  const childAdherence = children.map(child => {
    const childMedicines = activeMedicines.filter(m => m.childId === child.id)
    const childMedicineAdherence = medicineAdherence.filter(m => 
      childMedicines.some(cm => cm.id === m.medicineId)
    )
    
    const totalExpected = childMedicineAdherence.reduce((sum, m) => sum + m.expectedDoses, 0)
    const totalActual = childMedicineAdherence.reduce((sum, m) => sum + m.actualDoses, 0)
    const totalMissed = childMedicineAdherence.reduce((sum, m) => sum + m.missedDoses, 0)
    const adherence = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0
    
    return {
      childId: child.id,
      childName: child.name,
      adherence: Math.round(adherence * 10) / 10,
      totalExpected,
      totalActual,
      totalMissed
    }
  })
  
  // Calculate overall adherence
  const totalExpected = medicineAdherence.reduce((sum, m) => sum + m.expectedDoses, 0)
  const totalActual = medicineAdherence.reduce((sum, m) => sum + m.actualDoses, 0)
  const overallAdherence = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0
  
  // Calculate daily adherence
  const dailyAdherence = calculateDailyAdherence(activeMedicines, doses, startDate, endDate)
  
  return {
    overallAdherence: Math.round(overallAdherence * 10) / 10,
    medicineAdherence,
    childAdherence,
    dailyAdherence
  }
}

/**
 * Calculate daily adherence for the time period
 */
function calculateDailyAdherence(
  medicines: Medicine[],
  doses: MedicineDose[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; expectedDoses: number; actualDoses: number; adherence: number }> {
  const dailyData: Array<{ date: string; expectedDoses: number; actualDoses: number; adherence: number }> = []
  
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dayStart = startOfDay(currentDate)
    const dayEnd = endOfDay(currentDate)
    
    let expectedDoses = 0
    let actualDoses = 0
    
    // Calculate expected doses for this day
    medicines.forEach(medicine => {
      const medicineStartDate = new Date(medicine.startDate)
      const medicineEndDate = medicine.endDate ? new Date(medicine.endDate) : endDate
      
      // Check if medicine was active on this day
      if (currentDate >= medicineStartDate && currentDate <= medicineEndDate) {
        const dosesPerDay = parseFrequencyToDosesPerDay(medicine.frequency)
        expectedDoses += dosesPerDay
      }
    })
    
    // Count actual doses taken on this day
    actualDoses = doses.filter(dose => {
      const doseDate = new Date(dose.takenAt)
      return doseDate >= dayStart && doseDate <= dayEnd
    }).length
    
    const adherence = expectedDoses > 0 ? (actualDoses / expectedDoses) * 100 : 0
    
    dailyData.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      expectedDoses,
      actualDoses,
      adherence: Math.round(adherence * 10) / 10
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dailyData
}

/**
 * Get adherence insights and recommendations
 */
export function getAdherenceInsights(metrics: AdherenceMetrics): {
  insights: string[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
} {
  const insights: string[] = []
  const recommendations: string[] = []
  
  // Overall adherence insights
  if (metrics.overallAdherence >= 90) {
    insights.push('Excellent adherence! You\'re doing great with medicine schedules.')
  } else if (metrics.overallAdherence >= 80) {
    insights.push('Good adherence overall, with room for improvement.')
  } else if (metrics.overallAdherence >= 70) {
    insights.push('Moderate adherence. Consider setting up more reminders.')
  } else {
    insights.push('Low adherence detected. This may affect treatment effectiveness.')
  }
  
  // Medicine-specific insights
  const lowAdherenceMedicines = metrics.medicineAdherence.filter(m => m.adherence < 80)
  if (lowAdherenceMedicines.length > 0) {
    insights.push(`${lowAdherenceMedicines.length} medicine(s) have low adherence rates.`)
    recommendations.push('Set up specific reminders for medicines with low adherence.')
  }
  
  // Child-specific insights
  const lowAdherenceChildren = metrics.childAdherence.filter(c => c.adherence < 80)
  if (lowAdherenceChildren.length > 0) {
    insights.push(`${lowAdherenceChildren.length} child(ren) have low adherence rates.`)
    recommendations.push('Consider different reminder strategies for children with low adherence.')
  }
  
  // Daily pattern insights
  const recentDays = metrics.dailyAdherence.slice(-7) // Last 7 days
  const avgRecentAdherence = recentDays.reduce((sum, day) => sum + day.adherence, 0) / recentDays.length
  
  if (avgRecentAdherence < 70) {
    insights.push('Recent adherence has been declining.')
    recommendations.push('Review recent medicine schedules and adjust reminders.')
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (metrics.overallAdherence < 70) {
    riskLevel = 'high'
  } else if (metrics.overallAdherence < 85) {
    riskLevel = 'medium'
  }
  
  // Add general recommendations
  if (metrics.overallAdherence < 90) {
    recommendations.push('Enable push notifications for better reminder coverage.')
    recommendations.push('Consider using medicine tracking apps or pill organizers.')
    recommendations.push('Set up family member reminders for important medicines.')
  }
  
  return {
    insights,
    recommendations,
    riskLevel
  }
}
