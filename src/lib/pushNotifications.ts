// Push notification utilities for iOS 16.4+ PWA support
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscriptionData | null> {
  if (!isPushNotificationSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });

    // Convert subscription to our format
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };

    console.log('Push subscription successful:', subscriptionData);
    return subscriptionData;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Push subscription removed');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

// Check if user is subscribed to push notifications
export async function isSubscribedToPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Failed to check push subscription:', error);
    return false;
  }
}

// Send medicine reminder notification
export async function sendMedicineReminderNotification(payload: NotificationPayload): Promise<void> {
  if (!isPushNotificationSupported()) {
    console.log('Push notifications not supported');
    return;
  }

  // Check if notification permission is granted
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted, requesting permission...');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return;
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
      tag: payload.tag || 'medicine-reminder',
      data: payload.data || {},
      actions: payload.actions || [],
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Register for background sync (for offline medicine reminders)
export async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.log('Background sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // Type assertion for background sync API
    const syncManager = (registration as any).sync;
    if (syncManager) {
      await syncManager.register('medicine-reminder-sync');
      console.log('Background sync registered for medicine reminders');
    } else {
      console.log('Background sync manager not available');
    }
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}

// Utility function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Medicine-specific notification helpers
export const MedicineNotificationHelpers = {
  // Create a medicine reminder notification payload
  createMedicineReminderPayload: (medicine: {
    name: string;
    childName: string;
    dosage: string;
    isOverdue?: boolean;
  }): NotificationPayload => ({
    title: medicine.isOverdue ? '⚠️ Overdue Medicine' : '💊 Medicine Reminder',
    body: `${medicine.childName} needs ${medicine.name} (${medicine.dosage})`,
    tag: `medicine-${medicine.name.toLowerCase().replace(/\s+/g, '-')}`,
    data: {
      type: 'medicine-reminder',
      medicineName: medicine.name,
      childName: medicine.childName,
      dosage: medicine.dosage,
      isOverdue: medicine.isOverdue || false,
      timestamp: new Date().toISOString()
    },
    actions: [
      {
        action: 'mark-taken',
        title: 'Mark as Taken',
        icon: '/logo.png'
      },
      {
        action: 'snooze',
        title: 'Snooze 10 min',
        icon: '/logo.png'
      }
    ]
  }),

  // Create a missed medicine notification payload
  createMissedMedicinePayload: (medicines: Array<{
    name: string;
    childName: string;
    dosage: string;
    missedTime: string;
  }>): NotificationPayload => ({
    title: '⚠️ Missed Medicine',
    body: `${medicines.length} medicine(s) were missed: ${medicines.map(m => m.name).join(', ')}`,
    tag: 'missed-medicines',
    data: {
      type: 'missed-medicines',
      medicines: medicines,
      timestamp: new Date().toISOString()
    },
    actions: [
      {
        action: 'view-missed',
        title: 'View Details',
        icon: '/logo.png'
      }
    ]
  })
};
