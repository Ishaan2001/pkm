// Service Worker for push notifications
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle push events
self.addEventListener('push', event => {
  console.log('Push event received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Note'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Knowledge Base', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification click received', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const noteId = notificationData.noteId;
  
  let targetUrl = '/';
  if (noteId) {
    targetUrl = `/note/${noteId}`;
  } else if (notificationData.url) {
    targetUrl = notificationData.url;
  }

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Check if there's an existing window we can focus
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // If no existing window, open a new one
        return clients.openWindow(targetUrl);
      })
    );
  }
});