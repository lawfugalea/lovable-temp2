// Service Worker for HouseFlow PWA
const CACHE_NAME = 'houseflow-v1.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/_next/static/css/',
  '/_next/static/js/',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache install failed:', error);
      })
  );
});

// Push event - handle background push notifications (iOS 16.4+)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.body || 'Medicine reminder',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.tag || 'medicine-reminder',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: true, // Keep notification visible until user interacts
      silent: false,
      vibrate: [200, 100, 200], // Vibration pattern for mobile
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'HouseFlow Medicine Reminder', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync for medicine reminders
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'medicine-reminder-sync') {
    event.waitUntil(
      // This will be called when the app regains network connectivity
      // We can use this to check for missed medicine reminders
      checkMissedReminders()
    );
  }
});

// Function to check for missed reminders
async function checkMissedReminders() {
  try {
    // This would make an API call to check for overdue medicines
    // and potentially show notifications for missed doses
    console.log('Checking for missed medicine reminders...');
    
    // We could implement a more sophisticated reminder system here
    // that checks the last sync time and shows notifications for
    // medicines that were due while the app was offline
  } catch (error) {
    console.error('Failed to check missed reminders:', error);
  }
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // Clone the request because it's a stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
