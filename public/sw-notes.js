// Service Worker for Notes PWA functionality
const CACHE_NAME = 'houseflow-notes-v1';
const API_CACHE_NAME = 'houseflow-notes-api-v1';

// Cache strategies
const CACHE_FIRST_URLS = [
  '/notes',
  '/api/notes',
];

const NETWORK_FIRST_URLS = [
  '/api/notes/',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Notes SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/notes',
        '/manifest.json',
        '/logo.png',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Notes SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Notes SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/notes')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle page requests
  if (url.pathname.startsWith('/notes')) {
    event.respondWith(handlePageRequest(request));
    return;
  }
});

// API request handler with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Notes SW: Network failed, trying cache:', url.pathname);
    
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for specific endpoints
    if (url.pathname === '/api/notes' && request.method === 'GET') {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Page request handler with cache-first strategy
async function handlePageRequest(request) {
  const url = new URL(request.url);
  
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fall back to network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline page
    if (url.pathname.startsWith('/notes/')) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offline - Houseflow Notes</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                margin: 0; padding: 2rem; 
                background: linear-gradient(135deg, #fef3c7, #fed7aa);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container { 
                text-align: center; 
                background: white;
                padding: 3rem;
                border-radius: 2rem;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                max-width: 400px;
              }
              h1 { color: #ea580c; margin-bottom: 1rem; }
              p { color: #6b7280; margin-bottom: 2rem; }
              button {
                background: #ea580c;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 1rem;
                font-weight: 500;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📝 Offline</h1>
              <p>You're currently offline. Your notes will sync when you're back online.</p>
              <button onclick="window.location.reload()">Try Again</button>
            </div>
          </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Background sync for offline note creation/updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'notes-sync') {
    event.waitUntil(syncOfflineNotes());
  }
});

// Sync offline notes when back online
async function syncOfflineNotes() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.method === 'POST' || request.method === 'PUT') {
        try {
          await fetch(request);
          await cache.delete(request);
        } catch (error) {
          console.log('Notes SW: Failed to sync request:', request.url);
        }
      }
    }
  } catch (error) {
    console.log('Notes SW: Sync failed:', error);
  }
}

// Message handling for manual cache operations
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_NOTES') {
    event.waitUntil(cacheNotesData(event.data.notes));
  }
});

async function cacheNotesData(notes) {
  const cache = await caches.open(API_CACHE_NAME);
  const response = new Response(JSON.stringify(notes), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put('/api/notes', response);
}
