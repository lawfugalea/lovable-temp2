/* Clankeep service worker: push delivery + offline shopping.
 *
 * Bump CACHE_VERSION whenever the caching rules below change; the activate
 * handler deletes every cache that does not match, so a stale strategy cannot
 * outlive a deploy.
 */
var CACHE_VERSION = 'v1'
var SHELL_CACHE = 'clankeep-shell-' + CACHE_VERSION
var DATA_CACHE = 'clankeep-data-' + CACHE_VERSION

/* Only the shopping list is cached for offline reading. It is the one screen
 * people genuinely use without signal — standing in a supermarket, often in a
 * basement with no reception. Medicine doses and bank balances are deliberately
 * excluded: a stale figure there is worse than an honest "you are offline". */
var OFFLINE_READABLE = [
  '/api/shopping/lists',
  '/api/shopping/items',
  '/api/shopping/category-order',
]

self.addEventListener('install', function (event) {
  /* The shell is cached lazily on first navigation rather than precached here:
   * Next.js emits hashed asset names per build, so a hardcoded precache list
   * would go stale on every deploy. */
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name !== SHELL_CACHE && name !== DATA_CACHE) return caches.delete(name)
        return undefined
      }))
    }).then(function () {
      return self.clients.claim()
    })
  )
})

function isOfflineReadable(url) {
  for (var i = 0; i < OFFLINE_READABLE.length; i += 1) {
    if (url.pathname.indexOf(OFFLINE_READABLE[i]) !== -1) return true
  }
  return false
}

/* Network first, falling back to the last good copy. Never the other way round:
 * a shopping list served from cache while online would hide a housemate's
 * edits, which is the exact problem the live sync exists to solve. */
function networkFirst(request, cacheName) {
  return fetch(request).then(function (response) {
    if (response && response.status === 200) {
      var copy = response.clone()
      caches.open(cacheName).then(function (cache) { cache.put(request, copy) })
    }
    return response
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      if (cached) return cached
      throw new Error('offline and nothing cached')
    })
  })
}

self.addEventListener('fetch', function (event) {
  var request = event.request

  /* Writes must never be replayed from a cache. The page keeps its own outbox
   * for those so it can show pending state and resolve conflicts in the UI. */
  if (request.method !== 'GET') return

  var url
  try { url = new URL(request.url) } catch (_) { return }
  if (url.origin !== self.location.origin) return

  /* Immutable hashed build output: safe to serve from cache indefinitely. */
  if (url.pathname.indexOf('/_next/static/') !== -1) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        return cached || fetch(request).then(function (response) {
          if (response && response.status === 200) {
            var copy = response.clone()
            caches.open(SHELL_CACHE).then(function (cache) { cache.put(request, copy) })
          }
          return response
        })
      })
    )
    return
  }

  if (url.pathname.indexOf('/api/') !== -1) {
    if (isOfflineReadable(url)) event.respondWith(networkFirst(request, DATA_CACHE))
    return
  }

  /* Page navigations: fall back to whatever copy we have, so launching the
   * installed app with no signal opens the list instead of the browser's
   * error page. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone()
          caches.open(SHELL_CACHE).then(function (cache) { cache.put(request, copy) })
        }
        return response
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached
          return caches.match('./shopping').then(function (shopping) {
            return shopping || Response.error()
          })
        })
      })
    )
  }
})

/* Signing out must not leave a readable copy of a household's shopping list on
 * the device — phones get handed around. The page posts this on sign-out. */
self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'clankeep-clear-cache') return
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) { return caches.delete(name) }))
    })
  )
})

self.addEventListener('push', function (event) {
  var payload = {}
  try { payload = event.data ? event.data.json() : {} } catch (_) {}
  event.waitUntil(self.registration.showNotification(payload.title || 'Clankeep', {
    body: payload.body || 'Medicine reminder due',
    icon: 'logo.png',
    badge: 'logo.png',
    tag: payload.tag || 'houseflow-medicine-reminder',
    data: { url: payload.url || './medicine' }
  }))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var target = event.notification.data && event.notification.data.url ? event.notification.data.url : './medicine'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
    for (var i = 0; i < windows.length; i += 1) {
      if ('focus' in windows[i]) {
        windows[i].navigate(target)
        return windows[i].focus()
      }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined
  }))
})
