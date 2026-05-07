// Open Job Market — Web Push Service Worker

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Open Job Market', body: event.data.text(), url: '/' }
  }

  const options = {
    body:               data.body || '',
    icon:               '/Logo.png',
    badge:              '/Logo.png',
    tag:                data.tag || 'ojm-notification',
    data:               { url: data.url || '/' },
    requireInteraction: data.requireInteraction === true,
    vibrate:            [200, 100, 200],
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Open Job Market', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  // "Not today" action — just dismiss, no navigation
  if (event.action === 'decline') return

  // "Yes" action — navigate to confirm-availability page
  const url = event.action === 'confirm'
    ? '/confirm-availability'
    : (event.notification.data?.url || '/')

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus()
            if (client.navigate) client.navigate(url)
            return
          }
        }
        if (clients.openWindow) return clients.openWindow(url)
      })
  )
})
