self.addEventListener('install', () => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
    if (!event.data) return

    let data
    try {
        data = event.data.json()
    } catch {
        data = { title: 'Notificação', body: event.data.text() }
    }

    const options = {
        body: data.body || '',
        icon: '/icon',
        badge: '/icon',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/admin/dashboard',
        },
        actions: data.actions || [],
        tag: data.tag || 'reservation-notification',
        renotify: true,
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Sistema de Reservas', options)
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const url = event.notification.data?.url || '/admin/dashboard'

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // If a window is already open, focus it
            for (const client of clients) {
                if (client.url.includes('/admin') && 'focus' in client) {
                    return client.focus()
                }
            }
            // Otherwise open a new window
            return self.clients.openWindow(url)
        })
    )
})
