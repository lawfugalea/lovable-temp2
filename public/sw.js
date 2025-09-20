// Service Worker for PWA with iOS update support
const CACHE_NAME = `houseflow-cache-${new Date().toISOString().split('T')[0]}`;

// Notification tracking to prevent spam
const notificationHistory = new Map();
const NOTIFICATION_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown between same notifications

// Function to check if notification should be shown (anti-spam)
function shouldShowNotification(notificationKey) {
  const now = Date.now();
  const lastShown = notificationHistory.get(notificationKey);
  
  // Clean up old entries (older than 2 hours) to prevent memory leaks
  if (notificationHistory.size > 100) {
    for (const [key, timestamp] of notificationHistory.entries()) {
      if (now - timestamp > 2 * 60 * 60 * 1000) { // 2 hours
        notificationHistory.delete(key);
      }
    }
  }
  
  if (!lastShown) {
    notificationHistory.set(notificationKey, now);
    return true;
  }
  
  if (now - lastShown > NOTIFICATION_COOLDOWN) {
    notificationHistory.set(notificationKey, now);
    return true;
  }
  
  return false;
}

// Function to create a unique notification key
function createNotificationKey(type, medicineIds) {
  return `${type}-${medicineIds.sort().join(',')}`;
}

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('houseflow-cache-') && cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Handle manifest.json with version checking
  if (event.request.url.includes('/manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          responseClone.json().then((manifest) => {
            const manifestVersion = manifest.version || new Date().toISOString();
            
            // Check for manifest updates and notify clients
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: 'MANIFEST_UPDATED',
                  version: manifestVersion
                });
              });
            });
          });
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle API requests - always fetch from network for fresh data
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // For successful API responses, cache them but with short TTL
          if (response.status === 200 && response.headers.get('Cache-Control') !== 'no-store') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache only if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((fetchResponse) => {
          // Cache successful responses
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
  );
});

// Message handling for updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache invalidation requests
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('houseflow-cache-')) {
            console.log('Clearing cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notify clients that cache has been cleared
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'CACHE_CLEARED'
          });
        });
      });
    });
  }
  
  // Handle notification scheduling requests
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, icon, tag, delay } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: icon || '/logo.png',
        tag: tag || 'medicine-reminder',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200]
      });
    }, delay || 0);
  }
});

// Background sync for medicine notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'medicine-check') {
    event.waitUntil(checkMedicineReminders());
  }
});

// Periodic background sync for medicine reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'medicine-reminders') {
    event.waitUntil(checkMedicineReminders());
  }
});

// Function to check medicine reminders in the background
async function checkMedicineReminders() {
  try {
    // Get the stored household ID from IndexedDB or cache
    const householdId = await getStoredHouseholdId();
    if (!householdId) {
      console.log('No household ID found for background medicine check');
      return;
    }

    // Fetch medicine notifications from the API
    const response = await fetch(`/api/medicine/notifications?householdId=${householdId}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      console.log('Failed to fetch medicine notifications in background');
      return;
    }

    const data = await response.json();
    
    // Show notifications for medicines due in 15 minutes (with anti-spam)
    if (data.dueIn15Minutes && data.dueIn15Minutes.length > 0) {
      const medicineIds = data.dueIn15Minutes.map(m => m.id);
      const notificationKey = createNotificationKey('due-15min', medicineIds);
      
      if (shouldShowNotification(notificationKey)) {
        const medicineNames = data.dueIn15Minutes.map(m => `${m.name} (${m.child?.name || 'Unknown'})`).join(', ');
        
        await self.registration.showNotification('💊 Medicine Reminder', {
          body: `${data.dueIn15Minutes.length} medicine(s) due in 15 minutes: ${medicineNames}`,
          icon: '/logo.png',
          tag: 'medicine-reminder-15min',
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200],
          actions: [
            {
              action: 'open-app',
              title: 'Open App',
              icon: '/logo.png'
            }
          ]
        });
      }
    }

  } catch (error) {
    console.error('Error checking medicine reminders in background:', error);
  }
}

// Helper function to get stored household ID
async function getStoredHouseholdId() {
  try {
    // Try to get from cache first
    const cache = await caches.open('houseflow-settings');
    const response = await cache.match('/api/household/active');
    if (response) {
      const data = await response.json();
      return data.householdId;
    }
  } catch (error) {
    console.log('Could not get household ID from cache:', error);
  }
  return null;
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open-app') {
    // Open the app when notification is clicked
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          // Focus existing window
          return clients[0].focus();
        } else {
          // Open new window
          return self.clients.openWindow('/');
        }
      })
    );
  } else {
    // Default action - open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        } else {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

console.log('Service Worker loaded successfully');