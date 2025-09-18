import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './api/auth/[...nextauth]'
import { useHouseholdId } from '@/lib/useHouseholdId'
import ModernAppShell from '../components/ModernAppShell'
import SEO from '../components/SEO'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import Tabs, { TabPanel } from '../components/ui/Tabs'
import MedicineSetupWizard from '@/components/MedicineSetupWizard'
import ModernMedicineAnalytics from '@/components/ModernMedicineAnalytics'
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
  child: {
    id: string
    name: string
  }
  medicine: {
    id: string
    name: string
    medicineType?: string
  }
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
  const [showStartCourseModal, setShowStartCourseModal] = useState(false)
  const [templateToStart, setTemplateToStart] = useState<Medicine | null>(null)
  const [selectedChildForCourse, setSelectedChildForCourse] = useState<string>('')
  
  // Tab state
  const [activeTab, setActiveTab] = useState('templates')
  
  // Filter states for doses tab
  const [doseFilters, setDoseFilters] = useState({
    childId: '',
    medicineId: ''
  })
  
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
    pharmacyName: '',
    // Active course options
    createAsActiveCourse: false,
    selectedChildId: '',
    reminderTime: ''
  })
  const [newDose, setNewDose] = useState({ 
    childId: '',
    medicineId: '', 
    dosage: '', 
    notes: '', 
    takenAt: (() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    })()
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
    occurredAt: (() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    })(),
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

  // Request notification permission and register background sync on component mount
  useEffect(() => {
    const setupNotifications = async () => {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      
      // Register for periodic background sync if supported
      if ('serviceWorker' in navigator && 'periodicSync' in (window.ServiceWorkerRegistration.prototype as any)) {
        try {
          const registration = await navigator.serviceWorker.ready
          await (registration as any).periodicSync.register('medicine-reminders', {
            minInterval: 5 * 60 * 1000 // Check every 5 minutes
          })
          console.log('Periodic background sync registered for medicine reminders')
        } catch (error) {
          console.log('Periodic background sync not supported or failed:', error)
        }
      } else {
        // Fallback: Set up a background check using setTimeout for browsers without periodic sync
        console.log('Periodic background sync not supported, using fallback method')
        setupBackgroundCheckFallback()
      }
      
      // Store household ID for service worker to use
      if (householdId && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          // Store household ID in cache for service worker
          const cache = await caches.open('houseflow-settings')
          await cache.put('/api/household/active', new Response(JSON.stringify({ householdId }), {
            headers: { 'Content-Type': 'application/json' }
          }))
        } catch (error) {
          console.log('Failed to store household ID for service worker:', error)
        }
      }
    }
    
    setupNotifications()
  }, [householdId])

  // Fallback background check for browsers without periodic sync
  const setupBackgroundCheckFallback = () => {
    // This is a limited fallback - it only works when the app is in the background but still active
    // For true background notifications, periodic sync or push notifications are needed
    const checkInterval = setInterval(async () => {
      // Only check if the app is in the background (document.hidden)
      if (document.hidden && householdId) {
        try {
          const response = await fetch(`/api/medicine/notifications?householdId=${householdId}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            
            // Show notifications for due medicines (with anti-spam)
            if (data.dueNow && data.dueNow.length > 0 && Notification.permission === 'granted') {
              const medicineIds = data.dueNow.map((m: any) => m.id)
              const notificationKey = createNotificationKey('due-now-fallback', medicineIds)
              
              if (shouldShowNotification(notificationKey)) {
                const medicineNames = data.dueNow.map((m: any) => `${m.name} (${m.child?.name || 'Unknown'})`).join(', ')
                
                new Notification('Medicine Reminder', {
                  body: `${data.dueNow.length} medicine(s) are due: ${medicineNames}`,
                  icon: '/logo.png',
                  tag: 'medicine-reminder-fallback',
                  requireInteraction: true
                })
              }
            }
          }
        } catch (error) {
          console.log('Background check fallback failed:', error)
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
    
    // Clean up interval when component unmounts
    return () => clearInterval(checkInterval)
  }

  // Notification tracking to prevent spam
  const notificationHistory = useRef(new Map())
  const NOTIFICATION_COOLDOWN = 5 * 60 * 1000 // 5 minutes cooldown

  // Function to check if notification should be shown (anti-spam)
  const shouldShowNotification = (notificationKey: string) => {
    const now = Date.now()
    const lastShown = notificationHistory.current.get(notificationKey)
    
    // Clean up old entries (older than 1 hour) to prevent memory leaks
    if (notificationHistory.current.size > 100) {
      for (const [key, timestamp] of notificationHistory.current.entries()) {
        if (now - timestamp > 60 * 60 * 1000) { // 1 hour
          notificationHistory.current.delete(key)
        }
      }
    }
    
    if (!lastShown) {
      notificationHistory.current.set(notificationKey, now)
      return true
    }
    
    if (now - lastShown > NOTIFICATION_COOLDOWN) {
      notificationHistory.current.set(notificationKey, now)
      return true
    }
    
    return false
  }

  // Function to create a unique notification key
  const createNotificationKey = (type: string, medicineIds: string[]) => {
    return `${type}-${medicineIds.sort().join(',')}`
  }

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
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now()
      const response = await fetch(`/api/medicine/children?householdId=${householdId}&_t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
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
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now()
      const response = await fetch(`/api/medicine/medicines?householdId=${householdId}&_t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
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
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now()
      const response = await fetch(`/api/medicine/doses?householdId=${householdId}&_t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
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
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now()
      const response = await fetch(`/api/medicine/reminders?householdId=${householdId}&_t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
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
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now()
      const response = await fetch(`/api/medicine/reactions?householdId=${householdId}&_t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
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
      // Show notification using service worker for better background support (with anti-spam)
      if ('Notification' in window && Notification.permission === 'granted') {
        const medicineIds = dueMedicines.map(m => m.id)
        const notificationKey = createNotificationKey('due-now', medicineIds)
        
        if (shouldShowNotification(notificationKey)) {
          const medicineNames = dueMedicines.map(m => {
            const child = children.find(c => c.id === m.childId)
            return `${m.name} (${child?.name || 'Unknown'})`
          }).join(', ')
          
          // Use service worker to show notification for better background support
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SCHEDULE_NOTIFICATION',
              title: 'Medicine Reminder',
              body: `${dueMedicines.length} medicine(s) are due: ${medicineNames}`,
              icon: '/logo.png',
              tag: 'medicine-reminder',
              delay: 0
            })
          } else {
            // Fallback to regular notification
            new Notification('Medicine Reminder', {
              body: `${dueMedicines.length} medicine(s) are due: ${medicineNames}`,
              icon: '/logo.png',
              tag: 'medicine-reminder',
              requireInteraction: true
            })
          }
        }
      }
    }
  }

  const calculateNextDoseTime = (frequency: string, lastDoseTime: Date): Date => {
    const now = new Date()
    
    // Debug logging to understand the issue
    console.log('calculateNextDoseTime debug:', {
      frequency: frequency,
      lastDoseTime: lastDoseTime.toString(),
      lastDoseTimeLocal: lastDoseTime.toLocaleString(),
      now: now.toString(),
      nowLocal: now.toLocaleString()
    })
    
    let nextDoseTime: Date
    
    switch (frequency) {
      case 'every 2 hours':
        nextDoseTime = new Date(lastDoseTime.getTime() + 2 * 60 * 60 * 1000)
        break
      case 'every 4 hours':
        nextDoseTime = new Date(lastDoseTime.getTime() + 4 * 60 * 60 * 1000)
        break
      case 'every 6 hours':
        nextDoseTime = new Date(lastDoseTime.getTime() + 6 * 60 * 60 * 1000)
        break
      case 'every 8 hours':
        nextDoseTime = new Date(lastDoseTime.getTime() + 8 * 60 * 60 * 1000)
        break
      case 'every 12 hours':
        nextDoseTime = new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
        break
      case 'twice daily':
        nextDoseTime = new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
        break
      case 'once daily':
        nextDoseTime = new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'as needed':
        nextDoseTime = new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000) // Default to 24 hours for "as needed"
        break
      default:
        // Fallback for any custom frequencies
        // First check for daily patterns (most important)
        if (frequency.toLowerCase().includes('once') && frequency.toLowerCase().includes('daily')) {
          nextDoseTime = new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
        } else if (frequency.toLowerCase().includes('daily')) {
          nextDoseTime = new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
        } else if (frequency.toLowerCase().includes('hour')) {
          const hours = parseInt(frequency.match(/\d+/)?.[0] || '24')
          nextDoseTime = new Date(lastDoseTime.getTime() + hours * 60 * 60 * 1000)
        } else {
          // Default to 24 hours for unknown frequencies to be safe
          nextDoseTime = new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
        }
    }
    
    console.log('calculateNextDoseTime result:', {
      frequency: frequency,
      nextDoseTime: nextDoseTime.toString(),
      nextDoseTimeLocal: nextDoseTime.toLocaleString(),
      hoursAdded: (nextDoseTime.getTime() - lastDoseTime.getTime()) / (1000 * 60 * 60)
    })
    
    return nextDoseTime
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

    // If creating active course, validate child selection
    if (newMedicine.createAsActiveCourse && !newMedicine.selectedChildId) {
      alert('Please select a child for the active course.')
      return
    }
    
    console.log('Adding medicine:', newMedicine)
    console.log('Household ID:', householdId)
    
    setLoading(true)
    try {
      // Calculate start date based on reminder time if provided
      let startDate = new Date()
      if (newMedicine.createAsActiveCourse && newMedicine.reminderTime) {
        const [hours, minutes] = newMedicine.reminderTime.split(':')
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        // If the time has passed today, set for tomorrow
        if (startDate < new Date()) {
          startDate.setDate(startDate.getDate() + 1)
        }
      }

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
          childId: newMedicine.createAsActiveCourse ? newMedicine.selectedChildId : null,
          isTemplate: !newMedicine.createAsActiveCourse,
          startDate: newMedicine.createAsActiveCourse ? startDate : null,
          endDate: null,
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
          pharmacyName: '',
          createAsActiveCourse: false,
          selectedChildId: '',
          reminderTime: ''
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
          pharmacyName: '',
          createAsActiveCourse: false,
          selectedChildId: '',
          reminderTime: ''
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
        
        // Clear service worker cache to ensure fresh data
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
        }
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
        
        // Clear service worker cache to ensure fresh data
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
        }
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

  const startCourseFromTemplate = (template: Medicine) => {
    setTemplateToStart(template)
    setSelectedChildForCourse('')
    setShowStartCourseModal(true)
  }

  const confirmStartCourse = async () => {
    if (!templateToStart || !selectedChildForCourse) {
      alert('Please select a child for the medicine course.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/medicine/medicines?householdId=${householdId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Required fields for API validation
          name: templateToStart.name,
          dosage: templateToStart.dosage,
          medicineType: templateToStart.medicineType,
          frequency: templateToStart.frequency,
          // Additional template data
          instructions: templateToStart.notes || '',
          unit: templateToStart.unit || 'mg',
          // Course-specific fields
          templateId: templateToStart.id,
          childId: selectedChildForCourse,
          isTemplate: false
        })
      })
      
      if (response.ok) {
        await loadMedicines()
        const selectedChild = children.find(c => c.id === selectedChildForCourse)
        alert(`Medicine course started successfully for ${selectedChild?.name}! You will now receive reminders.`)
        setShowStartCourseModal(false)
        setTemplateToStart(null)
        setSelectedChildForCourse('')
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

  const getCurrentLocalTime = () => {
    const now = new Date()
    
    // Try a different approach - maybe the issue is with how we're calculating the time
    // Let's try using the browser's built-in time formatting
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    const result = `${year}-${month}-${day}T${hours}:${minutes}`
    
    // Debug logging to help identify timezone issues
    console.log('getCurrentLocalTime debug:', {
      now: now.toString(),
      localTime: now.toLocaleString(),
      toLocaleDateString: now.toLocaleDateString(),
      toLocaleTimeString: now.toLocaleTimeString(),
      hours: now.getHours(),
      minutes: now.getMinutes(),
      timezoneOffset: now.getTimezoneOffset(),
      result: result,
      // Check if there's a timezone issue
      utcHours: now.getUTCHours(),
      utcMinutes: now.getUTCMinutes(),
      // Test what the datetime-local input actually receives
      testInput: (document.querySelector('input[type="datetime-local"]') as HTMLInputElement)?.value,
      // Check browser timezone
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
    
    return result
  }

  // Helper function to convert stored date to local datetime-local format
  const dateToLocalDatetimeString = (dateString: string) => {
    // Parse the date string and create a new Date object
    const date = new Date(dateString)
    
    // The issue is that when we store a local time (e.g., 20:15), it gets stored as UTC in the database
    // When we retrieve it, we need to convert it back to the original local time
    // We do this by adjusting for the timezone offset
    
    // Get the timezone offset in minutes (positive means behind UTC, negative means ahead)
    const timezoneOffset = date.getTimezoneOffset()
    
    // Create a new date adjusted for the timezone offset
    // This gives us the original local time that was entered
    const localDate = new Date(date.getTime() - (timezoneOffset * 60000))
    
    const year = localDate.getUTCFullYear()
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(localDate.getUTCDate()).padStart(2, '0')
    const hours = String(localDate.getUTCHours()).padStart(2, '0')
    const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
    
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

  const getFilteredDoses = () => {
    let filtered = doses

    // Filter by child
    if (doseFilters.childId) {
      filtered = filtered.filter(dose => dose.childId === doseFilters.childId)
    }

    // Filter by medicine
    if (doseFilters.medicineId) {
      filtered = filtered.filter(dose => dose.medicineId === doseFilters.medicineId)
    }

    return filtered.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
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
      id: 'templates', 
      label: 'Medicine Templates', 
      icon: Pill,
      badge: undefined
    },
    { 
      id: 'active-courses', 
      label: 'Active Courses', 
      icon: Activity,
      badge: getAllDueMedicines().length > 0 ? getAllDueMedicines().length : undefined
    },
    { 
      id: 'doses', 
      label: 'Doses', 
      icon: Clock,
      badge: doses.length > 0 ? doses.length : undefined
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
    <>
      <SEO 
        title="Family Medicine Tracking & Health Management"
        description="Track family medications, set reminders, monitor health data, and manage your family's wellness with HouseFlow's comprehensive medicine tracking system."
        keywords="medicine tracking, family health, medication reminders, health management, family wellness, medicine schedule, health tracking"
        url="/medicine"
      />
      <ModernAppShell title="Medicine">
        <div className="min-h-screen bg-cozy-bg">
        {/* Hero Header Section */}
        <div className="relative overflow-hidden bg-cozy-warm border-b border-cozy-gray-200/60">
          <div className="absolute inset-0 bg-gradient-to-br from-cozy-primary/5 via-transparent to-cozy-sage/5"></div>
          <div className="relative px-3 sm:px-6 py-6 sm:py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                {/* Header Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <div className="p-2.5 sm:p-4 bg-gradient-to-br from-cozy-primary/20 to-cozy-primary/10 rounded-2xl border border-cozy-primary/30 shadow-cozy-sm">
                      <Pill className="w-5 h-5 sm:w-8 sm:h-8 text-cozy-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-cozy-text mb-1 sm:mb-2">
                        Medicine Tracking
                      </h1>
                      <p className="text-xs sm:text-base text-cozy-text-muted leading-relaxed">
                        Track and manage your children's medications with care
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs text-cozy-text-muted mb-1">Children</div>
                      <div className="text-base sm:text-xl font-bold text-blue-600">{children.length}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs text-cozy-text-muted mb-1">Templates</div>
                      <div className="text-base sm:text-xl font-bold text-green-600">{medicines.filter(m => m.isTemplate).length}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs text-cozy-text-muted mb-1">Active Courses</div>
                      <div className="text-base sm:text-xl font-bold text-cozy-primary">{medicines.filter(m => !m.isTemplate && m.isActive).length}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-cozy-gray-200/50">
                      <div className="text-xs text-cozy-text-muted mb-1">Due Now</div>
                      <div className={`text-base sm:text-xl font-bold ${getAllDueMedicines().length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {getAllDueMedicines().length}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Panel */}
                <div className="w-full lg:w-80">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-cozy-gray-200/50 shadow-cozy-sm">
                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:space-y-2 lg:space-y-0">
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6">
          <div className="space-y-3 sm:space-y-6">

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-cozy-gray-200/50 shadow-cozy-sm overflow-hidden">
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                variant="pills"
                size="sm"
                className="p-1 sm:p-2"
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
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
                                    {dose.notes && (
                                      <p className="text-xs text-cozy-text-muted mt-1 italic">"{dose.notes}"</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {isToday(new Date(dose.takenAt)) ? 'Today' : 
                                       isTomorrow(new Date(dose.takenAt)) ? 'Tomorrow' : 
                                       format(new Date(dose.takenAt), 'MMM dd')}
                                    </Badge>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingDose(dose)
                                          setNewDose({
                                            childId: dose.childId,
                                            medicineId: dose.medicineId,
                                            dosage: dose.dosage,
                                            notes: dose.notes || '',
                                            takenAt: dateToLocalDatetimeString(dose.takenAt) // Format for datetime-local input
                                          })
                                          setShowDoseModal(true)
                                        }}
                                        className="h-6 w-6 p-0"
                                        title="Edit dose"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteDose(dose.id)}
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Delete dose"
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
                      {doses.length > 4 && (
                        <div className="mt-3 pt-3 border-t border-cozy-gray-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab('doses')}
                            className="w-full text-cozy-text-muted"
                          >
                            View All {doses.length} Doses
                          </Button>
                        </div>
                      )}
            </CardContent>
          </Card>
          
                </div>
              </div>
            </TabPanel>
          
            {/* Analytics Tab */}
            <TabPanel isActive={activeTab === 'analytics'}>
              <ModernMedicineAnalytics 
                doses={doses}
                children={children}
                medicines={medicines}
              />
            </TabPanel>

            {/* Doses Tab */}
            <TabPanel isActive={activeTab === 'doses'}>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      Dose History
                    </CardTitle>
                    <p className="text-sm text-cozy-text-muted">
                      View and manage all recorded medicine doses
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {doses.length === 0 ? (
                      <div className="text-center py-12 text-cozy-text-muted">
                        <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No Doses Recorded</h3>
                        <p className="text-sm mb-4">Start by recording medicine doses from the Medicines tab</p>
                        <Button 
                          onClick={() => setActiveTab('medicines')}
                          variant="outline"
                          className="text-cozy-primary border-cozy-primary hover:bg-cozy-primary hover:text-white"
                        >
                          Go to Medicines
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <select
                            className="px-3 py-2 border border-cozy-gray-300 rounded-md text-sm"
                            value={doseFilters.childId}
                            onChange={(e) => {
                              setDoseFilters({ ...doseFilters, childId: e.target.value })
                            }}
                          >
                            <option value="">All Children</option>
                            {children.map(child => (
                              <option key={child.id} value={child.id}>{child.name}</option>
                            ))}
                          </select>
                          <select
                            className="px-3 py-2 border border-cozy-gray-300 rounded-md text-sm"
                            value={doseFilters.medicineId}
                            onChange={(e) => {
                              setDoseFilters({ ...doseFilters, medicineId: e.target.value })
                            }}
                          >
                            <option value="">All Medicines</option>
                            {medicines.filter(m => !m.isTemplate).map(medicine => (
                              <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
                            ))}
                          </select>
                          {(doseFilters.childId || doseFilters.medicineId) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDoseFilters({ childId: '', medicineId: '' })}
                              className="text-cozy-text-muted"
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>

                        {/* Doses List */}
                        <div className="space-y-3">
                          {getFilteredDoses().length === 0 ? (
                            <div className="text-center py-8 text-cozy-text-muted">
                              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">
                                {(doseFilters.childId || doseFilters.medicineId) 
                                  ? 'No doses match the current filters' 
                                  : 'No doses recorded yet'
                                }
                              </p>
                              {(doseFilters.childId || doseFilters.medicineId) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDoseFilters({ childId: '', medicineId: '' })}
                                  className="mt-3"
                                >
                                  Clear Filters
                                </Button>
                              )}
                            </div>
                          ) : (
                            getFilteredDoses().map(dose => {
                              const medicine = medicines.find(m => m.id === dose.medicineId)
                              const child = children.find(c => c.id === dose.childId)
                              
                              return (
                                <div key={dose.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-cozy-gray-200 rounded-lg hover:bg-cozy-cream transition-colors">
                                  <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                      <h3 className="font-semibold text-cozy-text text-sm sm:text-base">{medicine?.name}</h3>
                                      <Badge variant="outline" className="text-xs w-fit">
                                        {dose.dosage}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-cozy-text-muted">
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {child?.name}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(dose.takenAt), 'MMM dd, yyyy • h:mm a')}
                                      </span>
                                    </div>
                                    {dose.notes && (
                                      <p className="text-xs sm:text-sm text-cozy-text-muted mt-2 italic">"{dose.notes}"</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 sm:ml-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingDose(dose)
                                        setNewDose({
                                          childId: dose.childId,
                                          medicineId: dose.medicineId,
                                          dosage: dose.dosage,
                                          notes: dose.notes || '',
                                          takenAt: dateToLocalDatetimeString(dose.takenAt)
                                        })
                                        setShowDoseModal(true)
                                      }}
                                      className="h-8 w-8 p-0"
                                      title="Edit dose"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteDose(dose.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Delete dose"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>

                        {/* Summary */}
                        <div className="mt-6 p-4 bg-cozy-cream rounded-lg">
                          <h4 className="font-medium text-cozy-text mb-2">
                            Summary {(doseFilters.childId || doseFilters.medicineId) && '(Filtered)'}
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-cozy-text-muted">Showing:</span>
                              <span className="ml-2 font-medium">{getFilteredDoses().length} doses</span>
                            </div>
                            <div>
                              <span className="text-cozy-text-muted">This Week:</span>
                              <span className="ml-2 font-medium">
                                {getFilteredDoses().filter(d => {
                                  const weekAgo = new Date()
                                  weekAgo.setDate(weekAgo.getDate() - 7)
                                  return new Date(d.takenAt) >= weekAgo
                                }).length}
                              </span>
                            </div>
                            <div>
                              <span className="text-cozy-text-muted">Today:</span>
                              <span className="ml-2 font-medium">
                                {getFilteredDoses().filter(d => {
                                  const today = new Date().toISOString().split('T')[0]
                                  return d.takenAt.startsWith(today)
                                }).length}
                              </span>
                            </div>
                            <div>
                              <span className="text-cozy-text-muted">Children:</span>
                              <span className="ml-2 font-medium">
                                {new Set(getFilteredDoses().map(d => d.childId)).size}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                          <div key={child.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-cozy-gray-200 rounded-lg">
                            <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                              <h3 className="font-semibold text-cozy-text text-sm">{child.name}</h3>
                              <p className="text-xs text-cozy-text-muted">
                                {getChildAge(child.dateOfBirth)} • Born {format(new Date(child.dateOfBirth), 'MMM dd, yyyy')}
                              </p>
                              {child.notes && (
                                <p className="text-xs text-cozy-text-muted mt-1 truncate">{child.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2">
                              <Badge variant={child.isActive ? "default" : "secondary"} className="text-xs">
                                {child.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabPanel>

            {/* Medicine Templates Tab */}
            <TabPanel isActive={activeTab === 'templates'}>
              <div className="space-y-4">
                {/* Quick Actions for Templates */}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Pill className="h-4 w-4" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <Button 
                        onClick={() => setShowAddMedicine(true)} 
                        className="h-11 sm:h-12 justify-start bg-cozy-primary hover:bg-cozy-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Medicine Template
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
                      Medicine Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {medicines.filter(m => m.isTemplate).length === 0 ? (
                      <div className="text-center py-8 text-cozy-text-muted">
                        <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No medicine templates created yet</p>
                        <Button 
                          onClick={() => setShowAddMedicine(true)} 
                          className="mt-3 bg-cozy-primary hover:bg-cozy-primary/90"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Template
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {medicines.filter(m => m.isTemplate).map(medicine => {
                          return (
                            <div key={medicine.id} className="p-3 sm:p-4 border border-cozy-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  {/* Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                                    <h4 className="font-semibold text-base sm:text-lg text-cozy-text">{medicine.name}</h4>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        Template
                                      </Badge>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                                  </div>
                                  
                                  {/* Main Info Grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-cozy-text-muted font-medium uppercase tracking-wide">Dosage</span>
                                      <span className="text-sm font-medium text-cozy-text">{medicine.dosage}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs text-cozy-text-muted font-medium uppercase tracking-wide">Frequency</span>
                                      <span className="text-sm font-medium text-cozy-text">{medicine.frequency}</span>
                                    </div>
                                    {medicine.doctorName && (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-cozy-text-muted font-medium uppercase tracking-wide">Doctor</span>
                                        <span className="text-sm font-medium text-cozy-text">{medicine.doctorName}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Notes */}
                                  {medicine.notes && (
                                    <div className="mt-2 p-3 bg-cozy-cream rounded-lg">
                                      <span className="text-xs text-cozy-text-muted font-medium uppercase tracking-wide">Notes</span>
                                      <p className="text-sm text-cozy-text mt-1">{medicine.notes}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-1 sm:ml-3 flex-shrink-0">
                                  {medicine.medicineType === 'one-time' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMedicine(medicine)
                                        setNewDose({
                                          childId: '', // Will be selected in modal for templates
                                          medicineId: medicine.id,
                                          dosage: medicine.dosage,
                                          notes: '',
                                          takenAt: getCurrentLocalTime()
                                        })
                                        setShowDoseModal(true)
                                      }}
                                      className="text-xs px-3 w-full sm:w-auto"
                                    >
                                      Give Now
                                    </Button>
                                  )}
                                  
                                  {medicine.medicineType === 'course' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startCourseFromTemplate(medicine)}
                                      className="text-xs px-3 w-full sm:w-auto"
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
                                          childId: '', // Will be selected in modal for templates
                                          medicineId: medicine.id,
                                          dosage: medicine.dosage,
                                          notes: '',
                                          takenAt: getCurrentLocalTime()
                                        })
                                        setShowDoseModal(true)
                                      }}
                                      className="text-xs px-3 w-full sm:w-auto"
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
                                    pharmacyName: medicine.pharmacyName || '',
                                    createAsActiveCourse: false,
                                    selectedChildId: '',
                                    reminderTime: ''
                                  })
                                  setShowAddMedicine(true)
                                }}
                                className="px-2 w-full sm:w-auto"
                                    title="Edit medicine"
                              >
                                    <Edit className="w-3 h-3" />
                              </Button>
                                  
                                  
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteMedicine(medicine.id)}
                                    className="px-2 w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
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

            {/* Active Courses Tab */}
            <TabPanel isActive={activeTab === 'active-courses'}>
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
                              Click "Record Dose" to mark as given
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
                      <Activity className="h-4 w-4" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <Button 
                        onClick={() => setShowAddMedicine(true)} 
                        className="h-11 sm:h-12 justify-start bg-cozy-primary hover:bg-cozy-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Active Course
                      </Button>
                      <Button
                        onClick={() => setShowDoseModal(true)}
                        variant="outline" 
                        className="h-12 justify-start"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Record Dose
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Courses */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" />
                      Active Treatment Courses
                    </CardTitle>
                    <p className="text-sm text-cozy-text-muted">
                      Current active medicine treatments with live reminders
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {medicines.filter(m => !m.isTemplate).length === 0 ? (
                      <div className="text-center py-8 text-cozy-text-muted">
                        <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No active courses running</p>
                        <p className="text-xs text-cozy-text-muted mt-1">
                          Create templates first, then start courses from them
                        </p>
                        <Button 
                          onClick={() => setActiveTab('templates')} 
                          className="mt-3 bg-cozy-primary hover:bg-cozy-primary/90"
                        >
                          <Pill className="h-4 w-4 mr-2" />
                          Go to Templates
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {medicines.filter(m => !m.isTemplate).map(medicine => {
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
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-cozy-text-muted mb-2">
                                    <div>
                                      <span className="font-medium">Child:</span> {child?.name || 'Unknown'}
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
                                        {medicine.medicineType}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Frequency:</span> {medicine.frequency}
                                    </div>
                                  </div>
                                  
                                  {lastDose && (
                                    <div className="text-xs text-cozy-text-muted">
                                      <span className="font-medium">Last given:</span> {format(new Date(lastDose.takenAt), 'MMM d, h:mm a')}
                                    </div>
                                  )}
                                  
                                  {nextDoseInfo && (
                                    <div className="text-xs text-cozy-text-muted">
                                      <span className="font-medium">Next dose:</span> {nextDoseInfo.nextDoseTime ? format(nextDoseInfo.nextDoseTime, 'MMM d, h:mm a') : 'Not scheduled'}
                                    </div>
                                  )}
                                  
                                  {medicine.notes && (
                                    <div className="mt-2 p-2 bg-cozy-cream rounded text-xs text-cozy-text-muted">
                                      <span className="font-medium">Notes:</span> {medicine.notes}
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
                                          childId: medicine.childId || '', // Pre-fill child from active course
                                          medicineId: medicine.id,
                                          dosage: medicine.dosage,
                                          notes: '',
                                          takenAt: getCurrentLocalTime()
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
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMedicine(medicine)
                                        setNewDose({
                                          childId: medicine.childId || '', // Pre-fill child from active course
                                          medicineId: medicine.id,
                                          dosage: medicine.dosage,
                                          notes: '',
                                          takenAt: getCurrentLocalTime()
                                        })
                                        setShowDoseModal(true)
                                      }}
                                      className="text-xs px-3 bg-blue-500 hover:bg-blue-600"
                                    >
                                      Record Dose
                                    </Button>
                                  )}
                                  
                                  {medicine.medicineType === 'as-needed' && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMedicine(medicine)
                                        setNewDose({
                                          childId: medicine.childId || '', // Pre-fill child from active course
                                          medicineId: medicine.id,
                                          dosage: medicine.dosage,
                                          notes: '',
                                          takenAt: getCurrentLocalTime()
                                        })
                                        setShowDoseModal(true)
                                      }}
                                      className="text-xs px-3 bg-yellow-500 hover:bg-yellow-600"
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
                                        pharmacyName: medicine.pharmacyName || '',
                                        createAsActiveCourse: false,
                                        selectedChildId: '',
                                        reminderTime: ''
                                      })
                                      setShowAddMedicine(true)
                                    }}
                                    className="text-xs px-3"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${medicine.name}?`)) {
                                        deleteMedicine(medicine.id)
                                      }
                                    }}
                                    className="text-xs px-3 text-red-600 hover:text-red-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingMedicine ? 'Edit Medicine Template' : 
                 newMedicine.createAsActiveCourse ? 'Start Active Medicine Course' : 'Add Medicine Template'}
              </CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                {editingMedicine ? 'Update the medicine template' : 
                 newMedicine.createAsActiveCourse ? 'Create and start an active treatment course' : 'Create a reusable medicine template'}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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

              {/* Course Type Selection */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-cozy-text mb-3">Course Type</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="courseType"
                      checked={!newMedicine.createAsActiveCourse}
                      onChange={() => setNewMedicine({ ...newMedicine, createAsActiveCourse: false })}
                      className="w-4 h-4 text-cozy-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-cozy-text">Template (Reusable)</span>
                      <p className="text-xs text-cozy-text-muted">Create a template that can be used for any child</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="courseType"
                      checked={newMedicine.createAsActiveCourse}
                      onChange={() => setNewMedicine({ ...newMedicine, createAsActiveCourse: true })}
                      className="w-4 h-4 text-cozy-primary"
                    />
                    <div>
                      <span className="text-sm font-medium text-cozy-text">Active Course</span>
                      <p className="text-xs text-cozy-text-muted">Start treatment immediately for a specific child</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Active Course Options */}
              {newMedicine.createAsActiveCourse && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-cozy-text">Active Course Settings</h3>
                  
                  {/* Child Selection */}
                  <div>
                    <label className="block text-sm font-medium text-cozy-text mb-1">
                      Child *
                    </label>
                    <select
                      className="w-full p-2 border border-cozy-gray-300 rounded-md"
                      value={newMedicine.selectedChildId}
                      onChange={(e) => setNewMedicine({ ...newMedicine, selectedChildId: e.target.value })}
                    >
                      <option value="">Select child</option>
                      {children.map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reminder Time */}
                  <div>
                    <label className="block text-sm font-medium text-cozy-text mb-1">
                      Daily Reminder Time (Optional)
                    </label>
                    <input
                      type="time"
                      className="w-full p-2 border border-cozy-gray-300 rounded-md"
                      value={newMedicine.reminderTime}
                      onChange={(e) => setNewMedicine({ ...newMedicine, reminderTime: e.target.value })}
                    />
                    <p className="text-xs text-cozy-text-muted mt-1">
                      Set a specific time for daily reminders (e.g., 8:00 AM for colchicine)
                    </p>
                  </div>
                </div>
              )}

              {/* Template Info */}
              {!newMedicine.createAsActiveCourse && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm text-blue-800">
                      This will be saved as a reusable template. You can create treatment courses from it later.
                    </p>
                  </div>
                </div>
              )}

              {/* Active Course Info */}
              {newMedicine.createAsActiveCourse && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-green-800">
                      This will create an active treatment course and start sending reminders immediately.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={editingMedicine ? editMedicine : addMedicine} disabled={loading} className="flex-1">
                  {editingMedicine ? 'Update Template' : 
                   newMedicine.createAsActiveCourse ? 'Start Active Course' : 'Add Template'}
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
                    pharmacyName: '',
                    createAsActiveCourse: false,
                    selectedChildId: '',
                    reminderTime: ''
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingDose ? 'Edit Dose Record' : 'Give Medicine'}</CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                {editingDose ? 'Update the dose record details' : 'Record when a medicine from your templates was given'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show child selection only if not pre-filled from active course */}
              {!newDose.childId && (
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
              )}
              
              {/* Show pre-filled child info when coming from active course */}
              {newDose.childId && selectedMedicine && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Child:</span> {children.find(c => c.id === newDose.childId)?.name}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Show medicine selection only if not pre-filled from active course */}
              {!newDose.medicineId && (
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
              )}
              
              {/* Show pre-filled medicine info when coming from active course */}
              {newDose.medicineId && selectedMedicine && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Medicine:</span> {selectedMedicine.name} ({selectedMedicine.medicineType})
                    </p>
                  </div>
                </div>
              )}
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
                  When was this dose given? *
                </label>
                <input
                  type="datetime-local"
                  className="w-full p-2 border border-cozy-gray-300 rounded-md"
                  value={newDose.takenAt}
                  onChange={(e) => setNewDose({ ...newDose, takenAt: e.target.value })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

      {/* Start Course Modal */}
      {showStartCourseModal && templateToStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Start Medicine Course</CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                Start a treatment course from "{templateToStart.name}" template
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Template Details:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div><span className="font-medium">Medicine:</span> {templateToStart.name}</div>
                  <div><span className="font-medium">Dosage:</span> {templateToStart.dosage}</div>
                  <div><span className="font-medium">Frequency:</span> {templateToStart.frequency}</div>
                </div>
              </div>

              {/* Child Selection */}
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Select Child *
                </label>
                <select
                  className="w-full p-2 border border-cozy-gray-300 rounded-md"
                  value={selectedChildForCourse}
                  onChange={(e) => setSelectedChildForCourse(e.target.value)}
                >
                  <option value="">Choose a child...</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-green-800">
                    This will create an active treatment course and start sending reminders immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={confirmStartCourse} 
                  disabled={loading || !selectedChildForCourse} 
                  className="flex-1"
                >
                  {loading ? 'Starting...' : 'Start Course'}
                </Button>
                <Button 
                  onClick={() => {
                    setShowStartCourseModal(false)
                    setTemplateToStart(null)
                    setSelectedChildForCourse('')
                  }} 
                  variant="outline"
                >
                  Cancel
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
    </>
  )
}

// Server-side authentication check
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      // Don't pass session directly as it may contain non-serializable data
    },
  };
};
