const CACHE_NAME = 'bestie-v1'

// Install — cache the offline shell
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/offline.html']).catch(() => {})
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try { data = event.data.json() } catch { return }

  const isCall = data.title?.includes('📞') || data.link?.startsWith('/call/')

  event.waitUntil(
    self.registration.showNotification(data.title || 'Bestie', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: isCall ? 'incoming-call' : 'bestie-notification',
      renotify: isCall,          // re-buzz even if same tag exists
      requireInteraction: isCall, // keep call notifications visible
      vibrate: isCall ? [200, 100, 200, 100, 200] : [100],
      data: { link: data.link || '/' },
      actions: isCall
        ? [
            { action: 'accept', title: '✅ Accept' },
            { action: 'decline', title: '❌ Decline' },
          ]
        : [],
    })
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const link = event.notification.data?.link || '/'

  // If user clicked "Decline" action on a call notification — do nothing (just close)
  if (event.action === 'decline') return

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(link)
            return client.focus()
          }
        }
        // Otherwise open a new window
        return clients.openWindow(link)
      })
  )
})
