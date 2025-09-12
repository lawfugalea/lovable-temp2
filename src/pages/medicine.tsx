import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useHouseholdId } from '@/lib/useHouseholdId'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import Tabs, { TabPanel } from '../components/ui/Tabs'
import MedicineSetupWizard from '@/components/MedicineSetupWizard'
import MedicineAnalytics from '@/components/MedicineAnalytics'
import { 
  Plus, 
  Calendar, 
  Clock, 
  Pill, 
  Baby, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Bell,
  User,
  Edit,
  Trash2,
  Settings,
  X,
  Heart,
  Activity,
  BarChart3,
  Download,
  Upload,
  HelpCircle
} from 'lucide-react'
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns'
import FeverJournal from '../components/FeverJournal'

interface Child {
  id: string
  name: string
  dateOfBirth: string
  notes?: string
  isActive: boolean
}

interface Medicine {
  id: string
  childId: string | null
  name: string
  description?: string
  dosage: string
  medicineType?: string
  frequency: string
  startDate: string
  endDate?: string
  isActive: boolean
  isTemplate: boolean
  notes?: string
  nextDoseOverride?: string
  overrideReason?: string
  
  // Inventory tracking
  currentQuantity?: number
  totalQuantity?: number
  unit?: string
  lowStockThreshold?: number
  expiryDate?: string
  
  // Prescription information
  prescriptionNumber?: string
  doctorName?: string
  pharmacyName?: string
  prescriptionDate?: string
}

interface MedicineDose {
  id: string
  childId: string
  medicineId: string
  takenAt: string
  dosage: string
  notes?: string
  takenBy?: string
}

interface MedicineReminder {
  id: string
  childId: string
  medicineId: string
  scheduledAt: string
  reminderType: 'FIFTEEN_MINUTES' | 'FIVE_MINUTES' | 'DUE_NOW'
  isActive: boolean
}

interface MedicineReaction {
  id: string
  childId: string
  medicineId: string
  reactionType: 'side_effect' | 'allergy' | 'adverse_reaction'
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  symptoms?: string
  occurredAt: string
  duration?: string
  actionTaken?: string
  notes?: string
}

export default function MedicinePage() {
  const { data: session } = useSession()
  const { householdId, loading: householdLoading } = useHouseholdId()
  
  // State
  const [children, setChildren] = useState<Child[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [doses, setDoses] = useState<MedicineDose[]>([])
  const [reminders, setReminders] = useState<MedicineReminder[]>([])
  const [reactions, setReactions] = useState<MedicineReaction[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  
  // Modal states
  const [showAddChild, setShowAddChild] = useState(false)
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [showDoseModal, setShowDoseModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showNextDoseModal, setShowNextDoseModal] = useState(false)
  const [showReactionModal, setShowReactionModal] = useState(false)
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [showFAB, setShowFAB] = useState(false)
  const [showFABMenu, setShowFABMenu] = useState(false)
  const [triggerFeverAddModal, setTriggerFeverAddModal] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  
  // Tab state
  const [activeTab, setActiveTab] = useState('medicines')
  
  // Onboarding state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showOnboardingTour, setShowOnboardingTour] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false)
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null)
  
  // Edit states
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [editingDose, setEditingDose] = useState<MedicineDose | null>(null)
  
  // Form states
  const [newChild, setNewChild] = useState({ name: '', dateOfBirth: '', notes: '' })
  const [newMedicine, setNewMedicine] = useState({ 
    name: '', 
    description: '', 
    dosage: '', 
    medicineType: '',
    frequency: '', 
    notes: '',
    // Prescription fields
    doctorName: '',
    pharmacyName: ''
  })
  const [newDose, setNewDose] = useState({ 
    childId: '',
    medicineId: '', 
    dosage: '', 
    notes: '', 
    takenAt: new Date().toISOString().slice(0, 16)
  })
  const [nextDoseOverride, setNextDoseOverride] = useState({
    medicineId: '',
    nextDoseTime: '',
    reason: ''
  })
  const [reportDates, setReportDates] = useState({ 
    startDate: '', 
    endDate: '' 
  })
  const [newReaction, setNewReaction] = useState({
    childId: '',
    medicineId: '',
    reactionType: 'side_effect' as 'side_effect' | 'allergy' | 'adverse_reaction',
    severity: 'mild' as 'mild' | 'moderate' | 'severe',
    description: '',
    symptoms: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    duration: '',
    actionTaken: '',
    notes: ''
  })

  // Load data
  useEffect(() => {
    if (householdId && !householdLoading) {
      setDataLoading(true)
      Promise.all([
        loadChildren(),
        loadMedicines(),
        loadDoses(),
        loadReminders(),
        loadReactions()
      ]).finally(() => {
        setDataLoading(false)
      })
    }
  }, [householdId, householdLoading])

  // Check if user is new and show welcome modal
  useEffect(() => {
    if (children.length === 0 && medicines.length === 0 && !dataLoading && !hasSeenOnboarding) {
      setShowWelcomeModal(true)
      setHasSeenOnboarding(true)
    }
  }, [children.length, medicines.length, dataLoading, hasSeenOnboarding])

  // Show/hide FAB based on screen size
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768
      setShowFAB(isMobile)
      if (!isMobile) {
        setShowFABMenu(false)
      }
    }

    // Check on mount
    handleResize()
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Check for due medicines every minute (only when data is loaded)
  useEffect(() => {
    // Only set up the interval if we have data loaded
    if (medicines.length > 0 || doses.length > 0) {
      const interval = setInterval(() => {
        checkDueMedicines()
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }
  }, [medicines, doses])

  const loadChildren = async () => {
    try {
      const response = await fetch(`/api/medicine/children?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setChildren(data)
      }
    } catch (error) {
      console.error('Failed to load children:', error)
    }
  }

  const loadMedicines = async () => {
    try {
      const response = await fetch(`/api/medicine/medicines?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded medicines:', data)
        // Filter out inactive medicines (soft deleted)
        const activeMedicines = data.filter((medicine: any) => medicine.isActive !== false)
        console.log('Active medicines after filtering:', activeMedicines)
        setMedicines(activeMedicines)
      }
    } catch (error) {
      console.error('Failed to load medicines:', error)
    }
  }

  const loadDoses = async () => {
    try {
      const response = await fetch(`/api/medicine/doses?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setDoses(data)
      }
    } catch (error) {
      console.error('Failed to load doses:', error)
    }
  }

  const loadReminders = async () => {
    try {
      const response = await fetch(`/api/medicine/reminders?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setReminders(data)
      }
    } catch (error) {
      console.error('Failed to load reminders:', error)
    }
  }

  const loadReactions = async () => {
    try {
      const response = await fetch(`/api/medicine/reactions?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setReactions(data)
      }
    } catch (error) {
      console.error('Failed to load reactions:', error)
    }
  }

  const checkDueMedicines = () => {
    // Don't check if we don't have data loaded yet
    if (medicines.length === 0 && doses.length === 0) {
      return
    }

    const now = new Date()
    const dueMedicines = medicines.filter(medicine => {
      if (!medicine.isActive) return false
      
      // Check if there's a manual override first
      if (medicine.nextDoseOverride) {
        return new Date(medicine.nextDoseOverride) <= now
      }
      
      const lastDose = doses
        .filter(dose => dose.medicineId === medicine.id)
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
      
      if (!lastDose) return true // No doses taken yet
      
      // Calculate next dose time based on frequency
      const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
      return now >= nextDoseTime
    })

    if (dueMedicines.length > 0) {
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const medicineNames = dueMedicines.map(m => {
          const child = children.find(c => c.id === m.childId)
          return `${m.name} (${child?.name || 'Unknown'})`
        }).join(', ')
        
        new Notification('Medicine Reminder', {
          body: `${dueMedicines.length} medicine(s) are due: ${medicineNames}`,
          icon: '/logo.png',
          tag: 'medicine-reminder',
          requireInteraction: true
        })
      }
    }
  }

  const calculateNextDoseTime = (frequency: string, lastDoseTime: Date): Date => {
    const now = new Date()
    
    switch (frequency) {
      case 'every 2 hours':
        return new Date(lastDoseTime.getTime() + 2 * 60 * 60 * 1000)
      case 'every 4 hours':
        return new Date(lastDoseTime.getTime() + 4 * 60 * 60 * 1000)
      case 'every 6 hours':
        return new Date(lastDoseTime.getTime() + 6 * 60 * 60 * 1000)
      case 'every 8 hours':
        return new Date(lastDoseTime.getTime() + 8 * 60 * 60 * 1000)
      case 'every 12 hours':
        return new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
      case 'twice daily':
        return new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
      case 'once daily':
        return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
      case 'as needed':
        return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000) // Default to 24 hours for "as needed"
      default:
        // Fallback for any custom frequencies
        if (frequency.includes('hour')) {
          const hours = parseInt(frequency.match(/\d+/)?.[0] || '6')
          return new Date(lastDoseTime.getTime() + hours * 60 * 60 * 1000)
        } else if (frequency.includes('daily')) {
          return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
        }
        return now
    }
  }

  const getNextDoseInfo = (medicine: any) => {
    // Don't calculate if we don't have data loaded yet
    if (medicines.length === 0 && doses.length === 0) {
      return {
        nextDoseTime: new Date(),
        isOverdue: false,
        timeUntilNext: null,
        lastDoseTime: null,
        isOverride: false
      }
    }

    const lastDose = doses
      .filter(d => d.medicineId === medicine.id)
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
    
    // Check if there's a manual override for next dose
    if (medicine.nextDoseOverride) {
      const overrideTime = new Date(medicine.nextDoseOverride)
      const now = new Date()
      const isOverdue = now > overrideTime
      const timeUntilNext = overrideTime > now ? overrideTime.getTime() - now.getTime() : 0

      return {
        nextDoseTime: overrideTime,
        isOverdue,
        timeUntilNext,
        lastDoseTime: lastDose ? new Date(lastDose.takenAt) : null,
        isOverride: true,
        overrideReason: medicine.overrideReason
      }
    }
    
    if (!lastDose) {
      // For templates, if no doses have been taken, don't show next dose time
      if (medicine.isTemplate) {
        return {
          nextDoseTime: new Date(),
          isOverdue: false,
          timeUntilNext: null,
          lastDoseTime: null,
          isOverride: false
        }
      }
      
      // For active courses, use start date
      return {
        nextDoseTime: new Date(medicine.startDate),
        isOverdue: new Date() > new Date(medicine.startDate),
        timeUntilNext: null,
        isOverride: false
      }
    }

    const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
    const now = new Date()
    const isOverdue = now > nextDoseTime
    const timeUntilNext = nextDoseTime > now ? nextDoseTime.getTime() - now.getTime() : 0

    return {
      nextDoseTime,
      isOverdue,
      timeUntilNext,
      lastDoseTime: new Date(lastDose.takenAt),
      isOverride: false
    }
  }

  const formatTimeUntilNext = (milliseconds: number) => {
    if (milliseconds <= 0) return 'Overdue'
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const addChild = async () => {
    if (!newChild.name || !newChild.dateOfBirth) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/medicine/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          ...newChild
        })
      })
      
      if (response.ok) {
        setNewChild({ name: '', dateOfBirth: '', notes: '' })
        setShowAddChild(false)
        loadChildren()
      }
    } catch (error) {
      console.error('Failed to add child:', error)
    } finally {
      setLoading(false)
    }
  }

  const addMedicine = async () => {
    if (!newMedicine.name || !newMedicine.dosage || !newMedicine.medicineType || !newMedicine.frequency) {
      alert('Please fill in all required fields: medicine name, dosage, type, and frequency.')
      return
    }
    
    console.log('Adding medicine:', newMedicine)
    console.log('Household ID:', householdId)
    
    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/medicines?householdId=${householdId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMedicine.name,
          dosage: newMedicine.dosage,
          medicineType: newMedicine.medicineType,
          frequency: newMedicine.frequency,
          unit: 'mg',
          instructions: newMedicine.description || newMedicine.notes || '',
          childId: null, // Templates don't have a specific child
          isTemplate: true, // Always create templates
          startDate: null, // Templates don't have start dates
          endDate: null, // Templates don't have end dates
          // Prescription fields
          doctorName: newMedicine.doctorName || null,
          pharmacyName: newMedicine.pharmacyName || null
        })
      })
      
      if (response.ok) {
        console.log('Medicine added successfully')
        setNewMedicine({ 
          name: '', 
          description: '', 
          dosage: '', 
          medicineType: '',
          frequency: '', 
          notes: '',
          doctorName: '',
          pharmacyName: ''
        })
        setShowAddMedicine(false)
        loadMedicines()
      } else {
        const errorData = await response.json()
        console.error('Failed to add medicine:', errorData)
        alert(`Failed to add medicine: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to add medicine:', error)
      alert('Failed to add medicine')
    } finally {
      setLoading(false)
    }
  }

  const editMedicine = async () => {
    if (!editingMedicine || !newMedicine.name || !newMedicine.dosage || !newMedicine.frequency) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/medicines/${editingMedicine.id}?householdId=${householdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMedicine.name,
          dosage: newMedicine.dosage,
          medicineType: newMedicine.medicineType,
          frequency: newMedicine.frequency,
          unit: 'mg', // Default unit
          instructions: newMedicine.description || newMedicine.notes || '',
          isActive: true,
          doctorName: newMedicine.doctorName,
          pharmacyName: newMedicine.pharmacyName
        })
      })
      
      if (response.ok) {
        setNewMedicine({ 
          name: '', 
          description: '', 
          dosage: '', 
          medicineType: '',
          frequency: '', 
          notes: '',
          doctorName: '',
          pharmacyName: ''
        })
        setEditingMedicine(null)
        setShowAddMedicine(false)
        loadMedicines()
      }
    } catch (error) {
      console.error('Failed to edit medicine:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteMedicine = async (medicineId: string) => {
    if (!confirm('Are you sure you want to delete this medicine template? This will also deactivate it if it has associated doses.')) return
    
    console.log(`Frontend: Attempting to delete medicine ${medicineId}`)
    console.log(`Frontend: Household ID: ${householdId}`)
    
    setLoading(true)
    try {
      const url = `/api/medicine/medicines/${medicineId}?householdId=${householdId}`
      console.log(`Frontend: DELETE request to: ${url}`)
      
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      console.log(`Frontend: Response status: ${response.status}`)
      console.log(`Frontend: Response ok: ${response.ok}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Frontend: Delete result:', result)
        console.log('Frontend: Medicine deleted successfully')
        
        // Check if it was soft deleted or hard deleted
        if (result.message && result.message.includes('deactivated')) {
          console.log('Frontend: Medicine was soft deleted (deactivated)')
        } else {
          console.log('Frontend: Medicine was hard deleted')
        }
        
        console.log('Frontend: Refreshing medicine list...')
        await loadMedicines()
        console.log('Frontend: Medicine list refreshed')
      } else {
        const errorData = await response.json()
        console.error('Frontend: Failed to delete medicine:', errorData)
        alert(`Failed to delete medicine: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Frontend: Failed to delete medicine:', error)
      alert('Failed to delete medicine')
    } finally {
      setLoading(false)
    }
  }

  const stopTreatment = async (medicineId: string) => {
    if (!confirm('Are you sure you want to stop this treatment? This will prevent new doses from being scheduled, but existing doses will remain in the history.')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/medicines/${medicineId}?householdId=${householdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: medicines.find(m => m.id === medicineId)?.name || '',
          dosage: medicines.find(m => m.id === medicineId)?.dosage || '',
          frequency: medicines.find(m => m.id === medicineId)?.frequency || '',
          isActive: false
        })
      })
      
      if (response.ok) {
        loadMedicines()
      }
    } catch (error) {
      console.error('Failed to stop treatment:', error)
    } finally {
      setLoading(false)
    }
  }

  const recordDose = async () => {
    console.log('Attempting to record dose:', newDose)
    if (!newDose.medicineId || !newDose.dosage || !newDose.childId) {
      console.log('Validation failed:', {
        medicineId: newDose.medicineId,
        dosage: newDose.dosage,
        childId: newDose.childId
      })
      alert('Please select a child, medicine, and enter a dosage before recording the dose.')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/medicine/doses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDose,
          takenBy: session?.user?.id
        })
      })
      
      if (response.ok) {
        console.log('Dose recorded successfully')
        setNewDose({
          childId: '',
          medicineId: '',
          dosage: '',
          notes: '',
          takenAt: getCurrentLocalTime()
        })
        setShowDoseModal(false)
        loadDoses()
      } else {
        const errorData = await response.json()
        console.error('Failed to record dose:', errorData.error)
        alert(`Failed to record dose: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Failed to record dose:', error)
    } finally {
      setLoading(false)
    }
  }

  const editDose = async () => {
    if (!editingDose || !newDose.dosage) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/doses/${editingDose.id}?householdId=${householdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takenAt: newDose.takenAt,
          dosage: newDose.dosage,
          notes: newDose.notes || ''
        })
      })
      
      if (response.ok) {
        setNewDose({
          childId: '',
          medicineId: '',
          dosage: '',
          notes: '',
          takenAt: getCurrentLocalTime()
        })
        setEditingDose(null)
        setShowDoseModal(false)
        loadDoses()
      }
    } catch (error) {
      console.error('Failed to edit dose:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteDose = async (doseId: string) => {
    if (!confirm('Are you sure you want to delete this dose record?')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/doses/${doseId}?householdId=${householdId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadDoses()
      }
    } catch (error) {
      console.error('Failed to delete dose:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!reportDates.startDate || !reportDates.endDate) return

    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/report-pdf?householdId=${householdId}&startDate=${reportDates.startDate}&endDate=${reportDates.endDate}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `houseflow-medicine-report-${reportDates.startDate}-to-${reportDates.endDate}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setShowReportModal(false)
      } else {
        console.error('Failed to generate PDF report')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetNextDoseOverride = async () => {
    if (!nextDoseOverride.medicineId || !nextDoseOverride.nextDoseTime) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/next-dose-override?householdId=${householdId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: nextDoseOverride.medicineId,
          nextDoseOverride: nextDoseOverride.nextDoseTime,
          overrideReason: nextDoseOverride.reason || null
        })
      })
      
      if (response.ok) {
        setNextDoseOverride({
          medicineId: '',
          nextDoseTime: '',
          reason: ''
        })
        setShowNextDoseModal(false)
        loadMedicines()
      }
    } catch (error) {
      console.error('Failed to set next dose override:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearNextDoseOverride = async (medicineId: string) => {
    if (!confirm('Are you sure you want to clear the next dose override? This will revert to the automatic schedule.')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/next-dose-override?householdId=${householdId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId })
      })
      
      if (response.ok) {
        loadMedicines()
      }
    } catch (error) {
      console.error('Failed to clear next dose override:', error)
    } finally {
      setLoading(false)
    }
  }

  const startCourseFromTemplate = async (template: Medicine) => {
    if (!confirm(`Start a new medicine course from template "${template.name}"?`)) return
    
    // For templates, we need to select a child
    if (template.isTemplate && !template.childId) {
      // Show a simple prompt to select child
      const childOptions = children.map((child, index) => `${index + 1}. ${child.name}`).join('\n')
      const childIndex = prompt(`Select a child for this medicine course:\n\n${childOptions}\n\nEnter the number (1-${children.length}):`)
      
      if (!childIndex || isNaN(parseInt(childIndex)) || parseInt(childIndex) < 1 || parseInt(childIndex) > children.length) {
        alert('Invalid selection. Please try again.')
        return
      }
      
      const selectedChild = children[parseInt(childIndex) - 1]
      
      setLoading(true)
      try {
        const response = await fetch(`/api/medicine/medicines?householdId=${householdId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: template.id,
            childId: selectedChild.id,
            isTemplate: false
          })
        })
        
        if (response.ok) {
          await loadMedicines()
          alert(`Medicine course started successfully for ${selectedChild.name}!`)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to start medicine course')
        }
      } catch (error) {
        console.error('Failed to start medicine course:', error)
        alert('Failed to start medicine course')
      } finally {
        setLoading(false)
      }
    } else {
      // For active courses, use the existing childId
      setLoading(true)
      try {
        const response = await fetch(`/api/medicine/medicines?householdId=${householdId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: template.id,
            childId: template.childId,
            isTemplate: false
          })
        })
        
        if (response.ok) {
          await loadMedicines()
          alert('Medicine course started successfully!')
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to start medicine course')
        }
      } catch (error) {
        console.error('Failed to start medicine course:', error)
        alert('Failed to start medicine course')
      } finally {
        setLoading(false)
      }
    }
  }

  const getCurrentLocalTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const getChildAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth)
    const now = new Date()
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    
    if (ageInMonths < 12) {
      return `${ageInMonths} months`
    } else {
      const years = Math.floor(ageInMonths / 12)
      const months = ageInMonths % 12
      return months > 0 ? `${years}y ${months}m` : `${years} years`
    }
  }

  const getDueMedicines = () => {
    const now = new Date()
    return medicines.filter(medicine => {
      if (!medicine.isActive) return false
      
      const lastDose = doses
        .filter(dose => dose.medicineId === medicine.id)
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
      
      if (!lastDose) return true
      
      const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
      return now >= nextDoseTime
    })
  }

  const isMedicineDue = (medicine: Medicine) => {
    // Templates are never "due" - they're just reusable blueprints
    if (medicine.isTemplate) return false
    
    const now = new Date()
    
    // Only active courses can be due
    if (medicine.isActive) {
      const lastDose = doses
        .filter(dose => dose.medicineId === medicine.id)
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
      
      if (!lastDose) return true // No doses taken yet, so it's due
      
      const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
      return now >= nextDoseTime
    }
    
    return false
  }

  const getAllDueMedicines = () => {
    return medicines.filter(medicine => isMedicineDue(medicine))
  }


  const handleWizardComplete = async (data: { children: any[], medicines: any[] }) => {
    // Add children from wizard
    for (const child of data.children) {
      try {
        await fetch('/api/medicine/children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            householdId,
            name: child.name,
            dateOfBirth: child.dateOfBirth,
            notes: child.notes
          })
        })
      } catch (error) {
        console.error('Failed to add child from wizard:', error)
      }
    }

    // Add medicines from wizard
    for (const medicine of data.medicines) {
      try {
        await fetch(`/api/medicine/medicines?householdId=${householdId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: medicine.name,
            dosage: medicine.dosage,
            frequency: medicine.frequency,
            unit: medicine.unit || 'mg',
            instructions: medicine.description || '',
            childId: null, // Will be assigned to first child or can be edited later
            isTemplate: true,
            currentQuantity: medicine.currentQuantity || null,
            totalQuantity: medicine.totalQuantity || null,
            lowStockThreshold: medicine.lowStockThreshold || null,
            expiryDate: medicine.expiryDate || null,
            prescriptionNumber: medicine.prescriptionNumber || null,
            doctorName: medicine.doctorName || null,
            pharmacyName: medicine.pharmacyName || null,
            prescriptionDate: medicine.prescriptionDate || null
          })
        })
      } catch (error) {
        console.error('Failed to add medicine from wizard:', error)
      }
    }

    // Reload data
    await Promise.all([
      loadChildren(),
      loadMedicines(),
      loadDoses(),
      loadReminders(),
      loadReactions()
    ])
  }

  const getTodaysDoses = () => {
    const today = new Date().toISOString().split('T')[0]
    return doses.filter(dose => dose.takenAt.startsWith(today))
  }

  // Onboarding tour steps
  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Medicine Tracking! 💊',
      content: 'Let\'s take a quick tour to help you get started with tracking your children\'s medications and health.',
      target: null,
      action: () => setActiveTab('overview')
    },
    {
      id: 'children-setup',
      title: 'Step 1: Add Your Children',
      content: 'Start by adding your children to the system. This helps us track which medicines are for which child.',
      target: 'children-section',
      action: () => setActiveTab('children')
    },
    {
      id: 'medicine-templates',
      title: 'Step 2: Create Medicine Templates',
      content: 'Create reusable medicine templates with standard dosages and frequencies. These can be used for any child.',
      target: 'templates-section',
      action: () => setActiveTab('medicines')
    },
    {
      id: 'record-doses',
      title: 'Step 3: Record Medicine Doses',
      content: 'When you give medicine to a child, record it here. The system will track timing and calculate next doses.',
      target: 'doses-section',
      action: () => setActiveTab('medicines')
    },
    {
      id: 'fever-journal',
      title: 'Step 4: Track Temperature',
      content: 'Use the fever journal to track your child\'s temperature readings and monitor their health.',
      target: 'fever-section',
      action: () => setActiveTab('health')
    },
    {
      id: 'reports',
      title: 'Step 5: Generate Reports',
      content: 'Create PDF reports for doctors or keep records of all medicine doses and health data.',
      target: 'reports-section',
      action: () => setActiveTab('reports')
    }
  ]

  // Onboarding tour functions
  const startOnboardingTour = () => {
    setShowWelcomeModal(false)
    setShowOnboardingTour(true)
    setOnboardingStep(0)
    setHighlightedElement(onboardingSteps[0].target)
  }

  const nextOnboardingStep = () => {
    if (onboardingStep < onboardingSteps.length - 1) {
      const nextStep = onboardingStep + 1
      setOnboardingStep(nextStep)
      setHighlightedElement(onboardingSteps[nextStep].target)
      onboardingSteps[nextStep].action()
    } else {
      finishOnboardingTour()
    }
  }

  const previousOnboardingStep = () => {
    if (onboardingStep > 0) {
      const prevStep = onboardingStep - 1
      setOnboardingStep(prevStep)
      setHighlightedElement(onboardingSteps[prevStep].target)
      onboardingSteps[prevStep].action()
    }
  }

  const finishOnboardingTour = () => {
    setShowOnboardingTour(false)
    setOnboardingStep(0)
    setHighlightedElement(null)
    localStorage.setItem('medicine-onboarding-completed', 'true')
  }

  const skipOnboardingTour = () => {
    setShowWelcomeModal(false)
    setShowOnboardingTour(false)
    setOnboardingStep(0)
    setHighlightedElement(null)
    localStorage.setItem('medicine-onboarding-completed', 'true')
  }

  if (!session) {
    return <div>Please sign in to access medicine tracking.</div>
  }

  if (householdLoading || dataLoading) {
    return (
      <ModernAppShell title="Medicine">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading medicine tracking...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  // Tab configuration
  const tabs = [
    { 
      id: 'medicines', 
      label: 'Medicines', 
      icon: Pill,
      badge: getAllDueMedicines().length > 0 ? getAllDueMedicines().length : undefined
    },
    { 
      id: 'children', 
      label: 'Children', 
      icon: Baby,
      badge: children.length > 0 ? children.length : undefined
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3
    },
    { 
      id: 'health', 
      label: 'Health Tracking', 
      icon: Heart
    },
    { 
      id: 'emergency', 
      label: 'Emergency', 
      icon: AlertTriangle
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText
    }
  ]

  return (
    <ModernAppShell title="Medicine">
      <div className="min-h-screen bg-cozy-bg">
        {/* Hero Header Section */}
        <div className="relative overflow-hidden bg-cozy-warm border-b border-cozy-gray-200/60">
          <div className="absolute inset-0 bg-gradient-to-br from-cozy-primary/5 via-transparent to-cozy-sage/5"></div>
          <div className="relative px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Header Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-cozy-primary/20 to-cozy-primary/10 rounded-2xl border border-cozy-primary/30 shadow-cozy-sm">
                      <Pill className="w-6 h-6 sm:w-8 sm:h-8 text-cozy-primary" />
                    </div>
        <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cozy-text mb-2">
                        Medicine Tracking
                      </h1>
                      <p className="text-sm sm:text-base text-cozy-text-muted">
                        Track and manage your children's medications with care
                      </p>
                    </div>
        </div>

        {/* Quick Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs sm:text-sm text-cozy-text-muted mb-1">Children</div>
                      <div className="text-lg sm:text-xl font-bold text-blue-600">{children.length}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs sm:text-sm text-cozy-text-muted mb-1">Templates</div>
                      <div className="text-lg sm:text-xl font-bold text-green-600">{medicines.filter(m => m.isTemplate).length}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs sm:text-sm text-cozy-text-muted mb-1">Active Courses</div>
                      <div className="text-lg sm:text-xl font-bold text-cozy-primary">{medicines.filter(m => !m.isTemplate && m.isActive).length}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs sm:text-sm text-cozy-text-muted mb-1">Due Now</div>
                      <div className={`text-lg sm:text-xl font-bold ${getAllDueMedicines().length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {getAllDueMedicines().length}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Panel */}
                <div className="lg:w-80">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-cozy-gray-200/50 shadow-cozy-sm">
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        onClick={() => setShowAddChild(true)}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start bg-white hover:bg-cozy-cream border-cozy-gray-300"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Child
                      </Button>
                      <Button
                        onClick={() => setShowAddMedicine(true)}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start bg-white hover:bg-cozy-cream border-cozy-gray-300"
                      >
                        <Pill className="w-4 h-4 mr-2" />
                        Add Medicine
                      </Button>
                      <Button
                        onClick={() => setShowDoseModal(true)}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start bg-white hover:bg-cozy-cream border-cozy-gray-300"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Give Medicine
                      </Button>
                      <Button
                        onClick={() => setShowReportModal(true)}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start bg-white hover:bg-cozy-cream border-cozy-gray-300"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Report
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOnboardingTour(true)
                          setOnboardingStep(0)
                          setHighlightedElement(onboardingSteps[0].target)
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start bg-white hover:bg-cozy-cream border-cozy-gray-300"
                      >
                        <span className="mr-2">🎯</span>
                        Take Guided Tour
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-4 sm:space-y-6">

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-cozy-gray-200/50 shadow-cozy-sm overflow-hidden">
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                variant="pills"
                className="p-2"
              />
            </div>

            {/* Tab Content */}
            <TabPanel isActive={activeTab === 'overview'}>
              <div className="space-y-4">
                {/* Due Medicines Alert */}
                {getAllDueMedicines().length > 0 && (
                  <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                          <h3 className="font-semibold text-orange-800 text-sm">Medicines Due</h3>
                          <p className="text-orange-700 text-sm">
                            {getAllDueMedicines().length} medicine(s) are due for administration
                          </p>
                </div>
              </div>
            </CardContent>
          </Card>
                )}
          
                {/* Today's Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Recent Doses */}
          <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        Recent Doses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {doses.length === 0 ? (
                        <div className="text-center py-6 text-cozy-text-muted">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No doses recorded yet</p>
                </div>
                      ) : (
                        <div className="space-y-2">
                          {doses
                            .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
                            .slice(0, 4)
                            .map(dose => {
                              const medicine = medicines.find(m => m.id === dose.medicineId)
                              const child = children.find(c => c.id === dose.childId)
                              
                              return (
                                <div key={dose.id} className="flex items-center justify-between p-2 border border-cozy-gray-200 rounded-lg">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-cozy-text text-sm truncate">{medicine?.name}</h3>
                                    <p className="text-xs text-cozy-text-muted">
                                      {child?.name} • {dose.dosage} • {format(new Date(dose.takenAt), 'MMM dd, HH:mm')}
                                    </p>
              </div>
                                  <Badge variant="outline" className="text-xs">
                                    {isToday(new Date(dose.takenAt)) ? 'Today' : 
                                     isTomorrow(new Date(dose.takenAt)) ? 'Tomorrow' : 
                                     format(new Date(dose.takenAt), 'MMM dd')}
                                  </Badge>
                                </div>
                              )
                            })}
                        </div>
                      )}
            </CardContent>
          </Card>
          
                  {/* Active Courses */}
          <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle className="h-4 w-4" />
                        Active Courses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {medicines.filter(m => !m.isTemplate && m.isActive).length === 0 ? (
                        <div className="text-center py-6 text-cozy-text-muted">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No active courses</p>
                          <p className="text-xs mt-1">Start from a template</p>
                </div>
                      ) : (
                        <div className="space-y-2">
                          {medicines.filter(m => !m.isTemplate && m.isActive).slice(0, 4).map(medicine => {
                            const child = children.find(c => c.id === medicine.childId)
                            const isDue = isMedicineDue(medicine)
                            
                            return (
                              <div key={medicine.id} className={`p-2 border rounded-lg ${isDue ? 'border-orange-200 bg-orange-50' : 'border-cozy-gray-200'}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-cozy-text text-sm truncate">{medicine.name}</h3>
                                    <p className="text-xs text-cozy-text-muted">
                                      {child?.name} • {medicine.dosage}
                                    </p>
              </div>
                                  {isDue && (
                                    <Badge variant="destructive" className="text-xs">
                                      Due
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
            </CardContent>
          </Card>
                </div>
              </div>
            </TabPanel>
          
            {/* Analytics Tab */}
            <TabPanel isActive={activeTab === 'analytics'}>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Medicine Analytics
                    </CardTitle>
                    <p className="text-sm text-cozy-text-muted">
                      Track medicine administration patterns and adherence
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 text-cozy-text-muted opacity-50" />
                      <h3 className="text-lg font-medium text-cozy-text mb-2">Analytics Coming Soon</h3>
                      <p className="text-sm text-cozy-text-muted">
                        Advanced analytics and visualizations are being prepared
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabPanel>

            {/* Children Tab */}
            <TabPanel isActive={activeTab === 'children'}>
              <div className="space-y-4">
                <Card id="children-section" className={`transition-all duration-300 ${highlightedElement === 'children-section' ? 'ring-4 ring-cozy-primary ring-opacity-50 shadow-lg scale-[1.02]' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Baby className="h-4 w-4" />
                Children
              </CardTitle>
            </CardHeader>
                  <CardContent className="pt-0">
              {children.length === 0 ? (
                      <div className="text-center py-6 text-cozy-text-muted">
                        <Baby className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No children added yet</p>
                  <Button 
                    onClick={() => setShowAddChild(true)} 
                    variant="outline" 
                          size="sm"
                          className="mt-3"
                  >
                    Add First Child
                  </Button>
                </div>
              ) : (
                      <div className="space-y-2">
                  {children.map(child => (
                          <div key={child.id} className="flex items-center justify-between p-3 border border-cozy-gray-200 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-cozy-text text-sm">{child.name}</h3>
                              <p className="text-xs text-cozy-text-muted">
                          {getChildAge(child.dateOfBirth)} • Born {format(new Date(child.dateOfBirth), 'MMM dd, yyyy')}
                        </p>
                        {child.notes && (
                                <p className="text-xs text-cozy-text-muted mt-1 truncate">{child.notes}</p>
                        )}
                      </div>
                            <Badge variant={child.isActive ? "default" : "secondary"} className="text-xs">
                        {child.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
              </div>
            </TabPanel>

            {/* Medicines Tab - Simplified Flow */}
            <TabPanel isActive={activeTab === 'medicines'}>
              <div className="space-y-4">
                {/* Alerts Section */}
                <div className="space-y-3">
                  {/* Due Medicines Alert */}
                  {getAllDueMedicines().length > 0 && (
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <div className="flex-1">
                            <h3 className="font-medium text-orange-800">
                              {getAllDueMedicines().length} Medicine{getAllDueMedicines().length > 1 ? 's' : ''} Due Now
                            </h3>
                            <p className="text-sm text-orange-700">
                              Click "Give Now" to record administration
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                </div>

                {/* Quick Actions */}
          <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Pill className="h-4 w-4" />
                      Quick Actions
              </CardTitle>
            </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button 
                    onClick={() => setShowAddMedicine(true)} 
                        className="h-12 justify-start bg-cozy-primary hover:bg-cozy-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Medicine Template
                      </Button>
                      <Button
                        onClick={() => setShowDoseModal(true)}
                    variant="outline" 
                        className="h-12 justify-start"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Record Dose
                      </Button>
                      <Button
                        onClick={() => setShowSetupWizard(true)}
                        variant="outline"
                        className="h-12 justify-start border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Setup Wizard
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* All Medicines - Simplified View */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Pill className="h-4 w-4" />
                      All Medicines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {medicines.length === 0 ? (
                      <div className="text-center py-8 text-cozy-text-muted">
                        <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <h3 className="text-lg font-medium text-cozy-text mb-2">No medicines yet</h3>
                        <p className="text-sm mb-4">Start by adding your first medicine for your child</p>
                        <Button 
                          onClick={() => setShowAddMedicine(true)} 
                          className="bg-cozy-primary hover:bg-cozy-primary/90"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Medicine
                  </Button>
                </div>
              ) : (
                      <div className="space-y-3">
                        {medicines.map(medicine => {
                          const child = children.find(c => c.id === medicine.childId)
                    const lastDose = doses
                      .filter(dose => dose.medicineId === medicine.id)
                      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
                    
                    const isDue = isMedicineDue(medicine)
                    const nextDoseInfo = getNextDoseInfo(medicine)
                          const isActive = medicine.isActive
                    
                    return (
                            <div key={medicine.id} className={`p-4 border rounded-lg transition-all ${
                              isDue ? 'border-orange-200 bg-orange-50 shadow-md' : 
                              isActive ? 'border-green-200 bg-green-50' : 
                              'border-cozy-gray-200 bg-white'
                            }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium text-cozy-text">{medicine.name}</h4>
                                    {isDue && (
                                      <Badge className="bg-orange-500 text-white text-xs animate-pulse">
                                        DUE NOW
                                      </Badge>
                                    )}
                                    {!isActive && (
                                      <Badge variant="outline" className="text-xs">
                                        Inactive
                                      </Badge>
                                    )}
                                    {medicine.isTemplate && (
                                      <Badge variant="outline" className="text-xs">
                              Template
                            </Badge>
                                    )}
                          </div>
                          
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-cozy-text-muted mb-2">
                                    <div>
                                      <span className="font-medium">Child:</span> {child?.name || 'Template'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Dosage:</span> {medicine.dosage}
                                    </div>
                                    <div>
                                      <span className="font-medium">Type:</span> 
                                      <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                        medicine.medicineType === 'one-time' ? 'bg-green-100 text-green-800' :
                                        medicine.medicineType === 'course' ? 'bg-blue-100 text-blue-800' :
                                        medicine.medicineType === 'as-needed' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {medicine.medicineType === 'one-time' ? 'One-time' :
                                         medicine.medicineType === 'course' ? 'Course' :
                                         medicine.medicineType === 'as-needed' ? 'As-needed' :
                                         'Unknown'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Frequency:</span> {medicine.frequency}
                                    </div>
                                    <div>
                                      <span className="font-medium">Status:</span> {isActive ? 'Active' : 'Inactive'}
                                    </div>
                                    {medicine.doctorName && (
                                      <div>
                                        <span className="font-medium">Doctor:</span> {medicine.doctorName}
                                      </div>
                                    )}
                                  </div>
                                
                          {lastDose && (
                                    <div className="text-xs text-cozy-text-muted mb-1">
                                      Last dose: {format(new Date(lastDose.takenAt), 'MMM d, h:mm a')}
                                    </div>
                                  )}
                                  
                                  {nextDoseInfo.timeUntilNext && isActive && (
                                    <div className="text-xs text-cozy-text-muted">
                                      Next dose: {format(nextDoseInfo.nextDoseTime, 'MMM d, h:mm a')}
                                </div>
                              )}
                            </div>
                          
                                <div className="flex items-center gap-1 ml-3">
                                  {medicine.medicineType === 'one-time' && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMedicine(medicine)
                                        setNewDose({
                                          childId: '', // Will be selected in modal
                                          medicineId: medicine.id,
                                          dosage: medicine.dosage,
                                          notes: '',
                                          takenAt: new Date().toISOString().slice(0, 16)
                                        })
                                        setShowDoseModal(true)
                                      }}
                                      className="text-xs px-3 bg-green-500 hover:bg-green-600"
                                    >
                                      Give Now
                                    </Button>
                                  )}
                                  
                                  {medicine.medicineType === 'course' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // TODO: Implement start course functionality
                                        alert('Start Course functionality coming soon!')
                                      }}
                                      className="text-xs px-3"
                                    >
                                      Start Course
                                    </Button>
                                  )}
                                  
                                  {medicine.medicineType === 'as-needed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMedicine(medicine)
                                        setNewDose({
                                          childId: '', // Will be selected in modal
                                          medicineId: medicine.id,
                                          dosage: medicine.dosage,
                                          notes: '',
                                          takenAt: new Date().toISOString().slice(0, 16)
                                        })
                                        setShowDoseModal(true)
                                      }}
                                      className="text-xs px-3"
                                    >
                                      Give As Needed
                                    </Button>
                                  )}
                                  
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingMedicine(medicine)
                                  setNewMedicine({
                                    name: medicine.name,
                                    description: medicine.description || '',
                                    dosage: medicine.dosage,
                                    medicineType: medicine.medicineType || '',
                                    frequency: medicine.frequency,
                                    notes: medicine.notes || '',
                                    doctorName: medicine.doctorName || '',
                                    pharmacyName: medicine.pharmacyName || ''
                                  })
                                  setShowAddMedicine(true)
                                }}
                                className="px-2"
                                    title="Edit medicine"
                              >
                                    <Edit className="w-3 h-3" />
                              </Button>
                                  
                                  {isActive && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => stopTreatment(medicine.id)}
                                      className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Stop treatment"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  )}
                                  
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteMedicine(medicine.id)}
                                    className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete medicine"
                              >
                                    <Trash2 className="w-3 h-3" />
                              </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Medicine Courses */}
                <Card id="doses-section" className={`transition-all duration-300 ${highlightedElement === 'doses-section' ? 'ring-4 ring-cozy-primary ring-opacity-50 shadow-lg scale-[1.02]' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="h-4 w-4" />
                      Active Courses
              </CardTitle>
            </CardHeader>
                  <CardContent className="pt-0">
              {medicines.filter(m => !m.isTemplate && m.isActive).length === 0 ? (
                      <div className="text-center py-6 text-cozy-text-muted">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No active courses</p>
                        <p className="text-xs mt-1">Start from a template above</p>
                </div>
              ) : (
                      <div className="space-y-3">
                  {medicines.filter(m => !m.isTemplate && m.isActive).map(medicine => {
                    const child = children.find(c => c.id === medicine.childId)
                    const lastDose = doses
                      .filter(dose => dose.medicineId === medicine.id)
                      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
                    
                    const isDue = isMedicineDue(medicine)
                    const nextDoseInfo = getNextDoseInfo(medicine)
                    
                    return (
                            <div key={medicine.id} className={`p-3 border rounded-lg ${isDue ? 'border-orange-200 bg-orange-50' : 'border-cozy-gray-200'}`}>
                              <div className="space-y-2">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-cozy-text text-sm truncate">{medicine.name}</h3>
                                    <p className="text-xs text-cozy-text-muted">
                                {child?.name} • {medicine.dosage} • {medicine.frequency}
                              </p>
                            </div>
                                  <div className="flex items-center gap-1 ml-2">
                              {isDue && (
                                <Badge variant="destructive" className="text-xs">
                                        Due
                                </Badge>
                              )}
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Description */}
                          {medicine.description && (
                                  <p className="text-xs text-cozy-text-muted truncate">{medicine.description}</p>
                          )}
                          
                          {/* Last dose info */}
                          {lastDose && (
                            <p className="text-xs text-cozy-text-muted">
                                    Last: {format(new Date(lastDose.takenAt), 'MMM dd, HH:mm')}
                            </p>
                          )}
                          
                          {/* Next dose info */}
                          <div className="text-xs">
                            {nextDoseInfo.timeUntilNext !== null ? (
                                <p className={`font-medium ${nextDoseInfo.isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                                      {nextDoseInfo.isOverdue ? 'Overdue' : 'Next in'} {nextDoseInfo.timeUntilNext > 0 ? formatTimeUntilNext(nextDoseInfo.timeUntilNext) : 'now'}
                                </p>
                            ) : (
                              <p className="text-cozy-text-muted">
                                      Next: {format(nextDoseInfo.nextDoseTime, 'MMM dd, HH:mm')}
                              </p>
                            )}
                          </div>
                          
                          {/* Action buttons */}
                                <div className="flex gap-1 pt-1">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setNewDose({
                                  ...newDose,
                                  childId: '', // User will select child in modal
                                  medicineId: medicine.id,
                                  dosage: medicine.dosage,
                                  takenAt: getCurrentLocalTime()
                                })
                                setShowDoseModal(true)
                              }}
                                    className="flex-1 text-xs px-2"
                            >
                                    Give
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => stopTreatment(medicine.id)}
                                    className="flex-1 text-xs px-2 text-orange-600 hover:text-orange-700"
                            >
                                    Stop
                            </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingMedicine(medicine)
                                  setNewMedicine({
                                    name: medicine.name,
                                    description: medicine.description || '',
                                    dosage: medicine.dosage,
                                    medicineType: medicine.medicineType || '',
                                    frequency: medicine.frequency,
                                    notes: medicine.notes || '',
                                    doctorName: medicine.doctorName || '',
                                    pharmacyName: medicine.pharmacyName || ''
                                  })
                                  setShowAddMedicine(true)
                                }}
                                className="px-2"
                                title="Edit course"
                              >
                                    <Edit className="w-3 h-3" />
                              </Button>
                              {nextDoseInfo.isOverride ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => clearNextDoseOverride(medicine.id)}
                                  className="px-2 text-purple-600 hover:text-purple-700"
                                      title="Clear override"
                                >
                                      <X className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setNextDoseOverride({
                                      medicineId: medicine.id,
                                      nextDoseTime: '',
                                      reason: ''
                                    })
                                    setShowNextDoseModal(true)
                                  }}
                                  className="px-2"
                                      title="Set timing"
                                >
                                      <Settings className="w-3 h-3" />
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
            </TabPanel>

            {/* Health Tracking Tab */}
            <TabPanel isActive={activeTab === 'health'}>
              <div className="space-y-4">
                <Card id="fever-section" className={`transition-all duration-300 ${highlightedElement === 'fever-section' ? 'ring-4 ring-cozy-primary ring-opacity-50 shadow-lg scale-[1.02]' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="h-6 w-6 rounded-lg bg-red-100 flex items-center justify-center text-sm">
                        🌡️
                      </span>
                      Fever Journal
            </CardTitle>
          </CardHeader>
          <CardContent>
                    {householdId ? (
                      <FeverJournal 
                        householdId={householdId} 
                        kids={children} 
                        triggerAddModal={triggerFeverAddModal}
                        onAddModalTriggered={() => setTriggerFeverAddModal(false)}
                      />
                    ) : (
              <div className="text-center py-8 text-cozy-text-muted">
                        <div className="text-6xl mb-4">🌡️</div>
                        <p className="text-gray-600 mb-4">Track your child's temperature readings</p>
                        <p className="text-sm text-gray-500">Please set up your household first to access the fever journal.</p>
              </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabPanel>

            {/* Emergency Tab */}
            <TabPanel isActive={activeTab === 'emergency'}>
              <div className="space-y-4">
                {/* Emergency Medicine List */}
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      Emergency Medicine Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="bg-white border border-red-200 rounded-lg p-4">
                      <h3 className="font-medium text-red-800 mb-3">All Medicines for Emergency Reference</h3>
                      <div className="space-y-3">
                        {children.map(child => {
                          const childMedicines = medicines.filter(m => m.childId === child.id)
                    return (
                            <div key={child.id} className="border border-gray-200 rounded-lg p-3">
                              <h4 className="font-medium text-cozy-text mb-2">{child.name}</h4>
                              {childMedicines.length === 0 ? (
                                <p className="text-sm text-cozy-text-muted">No medicines recorded</p>
                              ) : (
                                <div className="space-y-2">
                                  {childMedicines.map(medicine => (
                                    <div key={medicine.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                      <div>
                                        <p className="font-medium text-cozy-text">{medicine.name}</p>
                          <p className="text-sm text-cozy-text-muted">
                                          {medicine.dosage} • {medicine.frequency}
                                        </p>
                                        {medicine.doctorName && (
                                          <p className="text-xs text-cozy-text-muted">
                                            Prescribed by: {medicine.doctorName}
                                          </p>
                          )}
                        </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Allergy Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4" />
                      Allergy & Reaction Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {reactions.filter(r => r.reactionType === 'allergy').length === 0 ? (
                      <div className="text-center py-6 text-cozy-text-muted">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No allergies recorded</p>
                        <p className="text-xs mt-1">Record any known allergies for emergency reference</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reactions.filter(r => r.reactionType === 'allergy').map(reaction => {
                          const child = children.find(c => c.id === reaction.childId)
                          const medicine = medicines.find(m => m.id === reaction.medicineId)
                          return (
                            <div key={reaction.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium text-red-800">{child?.name}</h4>
                                  <p className="text-sm text-red-700">Allergic to: {medicine?.name}</p>
                                  <p className="text-sm text-red-600 mt-1">{reaction.description}</p>
                                  {reaction.symptoms && (
                                    <p className="text-xs text-red-600 mt-1">
                                      <strong>Symptoms:</strong> {reaction.symptoms}
                                    </p>
                                  )}
                                  {reaction.actionTaken && (
                                    <p className="text-xs text-red-600 mt-1">
                                      <strong>Action taken:</strong> {reaction.actionTaken}
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-red-500 text-white text-xs">
                                  {reaction.severity}
                          </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Emergency Contacts */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      Emergency Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-center py-6 text-cozy-text-muted">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Emergency contacts will be integrated with household settings</p>
                      <p className="text-xs mt-1">Add emergency contacts in household management</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabPanel>

            {/* Reports Tab */}
            <TabPanel isActive={activeTab === 'reports'}>
              <div className="space-y-4">
                <Card id="reports-section" className={`transition-all duration-300 ${highlightedElement === 'reports-section' ? 'ring-4 ring-cozy-primary ring-opacity-50 shadow-lg scale-[1.02]' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Generate Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-800 mb-1 text-sm">PDF Medicine Report</h3>
                        <p className="text-blue-700 text-xs mb-3">
                          Create a comprehensive PDF report with medicine doses, templates, and fever readings.
                        </p>
                          <Button
                          onClick={() => setShowReportModal(true)}
                            size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Generate PDF
                          </Button>
                        </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="p-3 border border-cozy-gray-200 rounded-lg">
                          <h4 className="font-semibold text-cozy-text mb-2 text-sm">Quick Stats</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-cozy-text-muted">Children:</span>
                              <span className="font-medium">{children.length}</span>
                      </div>
                            <div className="flex justify-between">
                              <span className="text-cozy-text-muted">Templates:</span>
                              <span className="font-medium">{medicines.filter(m => m.isTemplate).length}</span>
              </div>
                            <div className="flex justify-between">
                              <span className="text-cozy-text-muted">Active Courses:</span>
                              <span className="font-medium">{medicines.filter(m => !m.isTemplate && m.isActive).length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-cozy-text-muted">Today's Doses:</span>
                              <span className="font-medium">{getTodaysDoses().length}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 border border-cozy-gray-200 rounded-lg">
                          <h4 className="font-semibold text-cozy-text mb-2 text-sm">Recent Activity</h4>
                          <div className="space-y-1 text-xs">
                            {doses.length > 0 ? (
                              doses
                                .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
                                .slice(0, 3)
                                .map(dose => {
                                  const medicine = medicines.find(m => m.id === dose.medicineId)
                                  const child = children.find(c => c.id === dose.childId)
                                  return (
                                    <div key={dose.id} className="text-cozy-text-muted truncate">
                                      {medicine?.name} for {child?.name} - {format(new Date(dose.takenAt), 'MMM dd, HH:mm')}
                                    </div>
                                  )
                                })
                            ) : (
                              <div className="text-cozy-text-muted">No recent doses</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
          </CardContent>
        </Card>
              </div>
            </TabPanel>
          </div>
        </div>
      </div>

      {/* Add Child Modal */}
      {showAddChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Child</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Child's name"
                value={newChild.name}
                onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Date of birth"
                value={newChild.dateOfBirth}
                onChange={(e) => setNewChild({ ...newChild, dateOfBirth: e.target.value })}
              />
              <Input
                placeholder="Notes (optional)"
                value={newChild.notes}
                onChange={(e) => setNewChild({ ...newChild, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={addChild} disabled={loading} className="flex-1">
                  Add Child
                </Button>
                <Button onClick={() => setShowAddChild(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingMedicine ? 'Edit Medicine Template' : 'Add Medicine Template'}</CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                {editingMedicine ? 'Update the medicine template' : 'Create a reusable medicine template'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Medicine Name *
                </label>
                <Input
                  placeholder="e.g., Paracetamol, Ibuprofen"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Description (optional)
                </label>
                <Input
                  placeholder="e.g., For fever and pain relief"
                  value={newMedicine.description}
                  onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Dosage *
                </label>
                <Input
                  placeholder="e.g., 5ml, 1 tablet, 2 drops"
                  value={newMedicine.dosage}
                  onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Medicine Type *
                </label>
                <select
                  className="w-full p-2 border border-cozy-gray-300 rounded-md"
                  value={newMedicine.medicineType}
                  onChange={(e) => setNewMedicine({ ...newMedicine, medicineType: e.target.value })}
                >
                  <option value="">Select type</option>
                  <option value="one-time">One-time dose (pain relief, fever reducer)</option>
                  <option value="course">Treatment course (antibiotics, chronic meds)</option>
                  <option value="as-needed">As needed (emergency, occasional use)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Frequency *
                </label>
                <select
                  className="w-full p-2 border border-cozy-gray-300 rounded-md"
                  value={newMedicine.frequency}
                  onChange={(e) => setNewMedicine({ ...newMedicine, frequency: e.target.value })}
                >
                  <option value="">Select frequency</option>
                  <option value="every 2 hours">Every 2 hours</option>
                  <option value="every 4 hours">Every 4 hours</option>
                  <option value="every 6 hours">Every 6 hours</option>
                  <option value="every 8 hours">Every 8 hours</option>
                  <option value="every 12 hours">Every 12 hours</option>
                  <option value="twice daily">Twice daily</option>
                  <option value="once daily">Once daily</option>
                  <option value="as needed">As needed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Notes (optional)
                </label>
                <Input
                  placeholder="e.g., Take with food, avoid dairy products"
                  value={newMedicine.notes}
                  onChange={(e) => setNewMedicine({ ...newMedicine, notes: e.target.value })}
                />
              </div>
              
              {/* Prescription Information Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-cozy-text mb-3">Prescription Information (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-cozy-text mb-1">
                      Doctor Name
                    </label>
                    <Input
                      placeholder="e.g., Dr. Smith"
                      value={newMedicine.doctorName}
                      onChange={(e) => setNewMedicine({ ...newMedicine, doctorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cozy-text mb-1">
                      Pharmacy
                    </label>
                    <Input
                      placeholder="e.g., CVS Pharmacy"
                      value={newMedicine.pharmacyName}
                      onChange={(e) => setNewMedicine({ ...newMedicine, pharmacyName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-sm text-blue-800">
                    This will be saved as a reusable template. You can create treatment courses from it later.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={editingMedicine ? editMedicine : addMedicine} disabled={loading} className="flex-1">
                  {editingMedicine ? 'Update Template' : 'Add Template'}
                </Button>
                <Button onClick={() => {
                  setShowAddMedicine(false)
                  setEditingMedicine(null)
                  setNewMedicine({ 
                    name: '', 
                    description: '', 
                    dosage: '', 
                    medicineType: '',
                    frequency: '', 
                    notes: '',
                    doctorName: '',
                    pharmacyName: ''
                  })
                }} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Dose Modal */}
      {showDoseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingDose ? 'Edit Dose Record' : 'Give Medicine'}</CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                {editingDose ? 'Update the dose record details' : 'Record when a medicine from your templates was given'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Select Child *
                </label>
                <select
                  className="w-full p-2 border border-cozy-gray-300 rounded-md"
                  value={newDose.childId}
                  onChange={(e) => setNewDose({ ...newDose, childId: e.target.value })}
                >
                  <option value="">Select child</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Select Medicine Template *
                </label>
                <select
                  className="w-full p-2 border border-cozy-gray-300 rounded-md"
                  value={newDose.medicineId}
                  onChange={(e) => {
                    const selectedMedicine = medicines.find(m => m.id === e.target.value)
                    setNewDose({ 
                      ...newDose, 
                      medicineId: e.target.value,
                      dosage: selectedMedicine?.dosage || '' // Pre-fill with template dosage
                    })
                  }}
                >
                  <option value="">Select medicine template</option>
                  {medicines.filter(m => m.isTemplate).map(medicine => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} ({medicine.dosage})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Actual Dosage Given *
                </label>
                <Input
                  placeholder="e.g., 5ml, 1 tablet (pre-filled from template)"
                  value={newDose.dosage}
                  onChange={(e) => setNewDose({ ...newDose, dosage: e.target.value })}
                />
                <p className="text-xs text-cozy-text-muted mt-1">
                  Pre-filled from template, adjust if different
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  When was this dose taken?
                </label>
                <Input
                  type="datetime-local"
                  value={newDose.takenAt}
                  onChange={(e) => setNewDose({ ...newDose, takenAt: e.target.value })}
                  className="w-full"
                />
              </div>
              <Input
                placeholder="Notes (optional)"
                value={newDose.notes}
                onChange={(e) => setNewDose({ ...newDose, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={editingDose ? editDose : recordDose} disabled={loading} className="flex-1">
                  {editingDose ? 'Update Dose Record' : 'Record Medicine Given'}
                </Button>
                <Button onClick={() => {
                  setShowDoseModal(false)
                  setEditingDose(null)
                  setNewDose({ 
                    childId: '',
                    medicineId: '', 
                    dosage: '', 
                    notes: '', 
                    takenAt: getCurrentLocalTime()
                  })
                }} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next Dose Override Modal */}
      {showNextDoseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Set Next Dose Timing</CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                Override the automatic schedule for the next dose
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Medicine Template
                </label>
                <select
                  className="w-full p-2 border border-cozy-gray-300 rounded-md"
                  value={nextDoseOverride.medicineId}
                  onChange={(e) => setNextDoseOverride({ ...nextDoseOverride, medicineId: e.target.value })}
                >
                  <option value="">Select medicine template</option>
                  {medicines.filter(m => m.isTemplate).map(medicine => {
                    const child = children.find(c => c.id === medicine.childId)
                    return (
                      <option key={medicine.id} value={medicine.id}>
                        {medicine.name} ({medicine.dosage}) - {child?.name}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Next Dose Time *
                </label>
                <Input
                  type="datetime-local"
                  value={nextDoseOverride.nextDoseTime}
                  onChange={(e) => setNextDoseOverride({ ...nextDoseOverride, nextDoseTime: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Reason (optional)
                </label>
                <Input
                  placeholder="e.g., Sleep schedule, meal timing, doctor's advice"
                  value={nextDoseOverride.reason}
                  onChange={(e) => setNextDoseOverride({ ...nextDoseOverride, reason: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSetNextDoseOverride} disabled={loading} className="flex-1">
                  Set Override
                </Button>
                <Button onClick={() => {
                  setShowNextDoseModal(false)
                  setNextDoseOverride({
                    medicineId: '',
                    nextDoseTime: getCurrentLocalTime(),
                    reason: ''
                  })
                }} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Generate PDF Report</CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                Create a comprehensive PDF report with medicine doses, templates, and fever readings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="date"
                placeholder="Start date"
                value={reportDates.startDate}
                onChange={(e) => setReportDates({ ...reportDates, startDate: e.target.value })}
              />
              <Input
                type="date"
                placeholder="End date"
                value={reportDates.endDate}
                onChange={(e) => setReportDates({ ...reportDates, endDate: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={generateReport} disabled={loading} className="flex-1">
                  {loading ? 'Generating PDF...' : 'Generate PDF Report'}
                </Button>
                <Button onClick={() => setShowReportModal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {showFAB && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          {/* FAB Menu */}
          {showFABMenu && (
            <div className="absolute bottom-16 right-0 space-y-3">
              <div className="bg-cozy-surface rounded-lg shadow-cozy-glow border border-cozy-gray-300 p-2 min-w-[200px]">
                <button
                  onClick={() => {
                    setShowDoseModal(true)
                    setShowFABMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-cozy-cream rounded-lg transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-cozy-primary-soft flex items-center justify-center">
                    <Pill className="h-4 w-4 text-cozy-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-cozy-text">Record Dose</p>
                    <p className="text-xs text-cozy-text-muted">Give medicine to child</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    // Scroll to fever journal section and trigger add modal
                    const feverSection = document.querySelector('[data-fever-journal]')
                    if (feverSection) {
                      feverSection.scrollIntoView({ behavior: 'smooth' })
                    }
                    setTriggerFeverAddModal(true)
                    setShowFABMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-cozy-cream rounded-lg transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600">🌡️</span>
                  </div>
                  <div>
                    <p className="font-medium text-cozy-text">Add Reading</p>
                    <p className="text-xs text-cozy-text-muted">Record temperature</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Main FAB Button */}
          <button
            onClick={() => setShowFABMenu(!showFABMenu)}
            className="h-14 w-14 bg-cozy-primary hover:bg-cozy-primary-deep text-white rounded-full shadow-cozy-glow flex items-center justify-center transition-all duration-200 transform hover:scale-105 hover:-translate-y-0.5"
          >
            <Plus className={`h-6 w-6 transition-transform duration-200 ${showFABMenu ? 'rotate-45' : ''}`} />
          </button>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-center">Welcome to Medicine Tracking! 💊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-6xl mb-4">💊</div>
                <p className="text-cozy-text-muted">
                  Let's help you get started with tracking your children's medications and health data.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={startOnboardingTour} className="flex-1">
                  Take Guided Tour
                </Button>
                <Button onClick={skipOnboardingTour} variant="outline">
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onboarding Tour Modal */}
      {showOnboardingTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="text-center">
                {onboardingSteps[onboardingStep]?.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-cozy-text-muted">
                  {onboardingSteps[onboardingStep]?.content}
                </p>
              </div>
              
              {/* Progress indicator */}
              <div className="flex justify-center space-x-2">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === onboardingStep ? 'bg-cozy-primary' : 'bg-cozy-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex gap-2">
                {onboardingStep > 0 && (
                  <Button onClick={previousOnboardingStep} variant="outline">
                    Previous
                  </Button>
                )}
                <Button 
                  onClick={nextOnboardingStep} 
                  className="flex-1"
                >
                  {onboardingStep === onboardingSteps.length - 1 ? 'Finish Tour' : 'Next'}
                </Button>
                <Button onClick={skipOnboardingTour} variant="outline">
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Setup Wizard */}
      <MedicineSetupWizard
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onComplete={handleWizardComplete}
      />
    </ModernAppShell>
  )
}
