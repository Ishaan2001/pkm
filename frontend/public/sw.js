// Service Worker for push notifications
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Add error handling for debugging
self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});

// Log when service worker is ready
console.log('Service Worker script loaded');

// Test notification function - can be called from browser console
self.testNotification = () => {
  console.log('Testing basic notification...');
  return self.registration.showNotification('Test Notification', {
    body: 'This is a test notification from the service worker',
    icon: '/icon-192.svg',
    tag: 'test-notification'
  }).then(() => {
    console.log('Test notification shown successfully');
  }).catch(error => {
    console.error('Test notification failed:', error);
  });
};

// Handle push events
self.addEventListener('push', event => {
  console.log('Push event received', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push data received:', payload);
      
      // Extract title separately as it's not part of options
      const notificationTitle = payload.title || 'Knowledge Base';
      
      const options = {
        body: payload.body || 'New notification',
        icon: payload.icon || '/icon-192.svg',
        badge: payload.badge || '/icon-192.svg',
        tag: 'knowledge-base-notification',
        data: payload.data || {},
        requireInteraction: false, // Changed to false for better visibility
        silent: false,
        vibrate: [200, 100, 200]
      };

      console.log('Showing notification with title:', notificationTitle);
      console.log('Notification options:', options);
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, options)
          .then(() => {
            console.log('Notification shown successfully');
          })
          .catch(error => {
            console.error('Error showing notification:', error);
          })
      );
    } catch (error) {
      console.error('Error parsing push data:', error);
      // Show fallback notification
      event.waitUntil(
        self.registration.showNotification('Knowledge Base', {
          body: 'New notification (parsing error)',
          icon: '/icon-192.svg',
          tag: 'knowledge-base-notification'
        })
      );
    }
  } else {
    console.log('Push event received but no data');
    // Show a default notification if no data is provided
    event.waitUntil(
      self.registration.showNotification('Knowledge Base', {
        body: 'You have a new notification',
        icon: '/icon-192.svg',
        tag: 'knowledge-base-notification'
      })
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