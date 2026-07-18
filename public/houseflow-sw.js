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
