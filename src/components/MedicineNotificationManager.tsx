import React, { useEffect } from 'react'
import { useHouseholdId } from '@/lib/useHouseholdId'
import { 
  subscribeToPushNotifications, 
  sendMedicineReminderNotification, 
  MedicineNotificationHelpers,
  registerBackgroundSync,
  isSubscribedToPushNotifications,
  isPushNotificationSupported,
  isVapidConfigured
} from '@/lib/pushNotifications'

interface Medicine {
  id: string
  name: string
  dosage: string
  frequency: string
  child: {
    id: string
    name: string
  }
}

interface MedicineNotifications {
  dueIn15Minutes: Medicine[]
}

export default function MedicineNotificationManager() {
  const { householdId, loading: householdLoading } = useHouseholdId()

  useEffect(() => {
    if (!householdId || householdLoading) return
    
    // Ensure householdId is a string
    const householdIdStr = typeof householdId === 'string' ? householdId : String(householdId)
    if (!householdIdStr || householdIdStr === 'undefined' || householdIdStr === 'null') return

    // Check if notifications are supported
    if (!isPushNotificationSupported()) {
      console.log('Notifications not supported in this browser')
      return
    }

    // Initialize push notifications
    const initializePushNotifications = async () => {
      try {
        // Register for background sync for offline medicine reminders
        await registerBackgroundSync()
        
        // Only try to subscribe to push notifications if VAPID is configured
        if (isVapidConfigured()) {
          const isSubscribed = await isSubscribedToPushNotifications()
          if (!isSubscribed) {
            await subscribeToPushNotifications()
          }
        } else {
          console.log('VAPID keys not configured, using fallback notifications')
        }
      } catch (error) {
        console.error('Failed to initialize push notifications:', error)
      }
    }

    // Initialize notifications
    initializePushNotifications()

    const checkMedicineReminders = async () => {
      try {
        const response = await fetch(`/api/medicine/notifications?householdId=${encodeURIComponent(householdIdStr)}`)
        if (response.ok) {
          const data: MedicineNotifications = await response.json()
          
          // Show notifications for medicines due in 15 minutes
          if (data.dueIn15Minutes && data.dueIn15Minutes.length > 0) {
            for (const medicine of data.dueIn15Minutes) {
              const payload = MedicineNotificationHelpers.createMedicineReminderPayload({
                name: medicine.name,
                childName: medicine.child.name,
                dosage: medicine.dosage,
                isOverdue: false
              })
              
              await sendMedicineReminderNotification(payload)
            }
          }
        }
      } catch (error) {
        console.error('Failed to check medicine reminders:', error)
      }
    }

    // Check immediately
    checkMedicineReminders()

    // Set up interval to check every 2 minutes
    const interval = setInterval(checkMedicineReminders, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [householdId, householdLoading])

  // This component doesn't render anything - it just manages background notifications
  return null
}
