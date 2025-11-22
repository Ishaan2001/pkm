/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// Enhanced logging for service worker
const log = (message: string, data?: any) => {
  console.log(`[ServiceWorker] ${message}`, data || '');
};

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)
log('Service worker precaching configured');

// clean old assets
cleanupOutdatedCaches()

let allowlist: undefined | RegExp[]
if (import.meta.env.DEV)
  allowlist = [/^\/$/]

// to allow work offline
registerRoute(new NavigationRoute(
  createHandlerBoundToURL('/'),
  { allowlist }
))

self.skipWaiting()
clientsClaim()

// Service worker lifecycle logging
self.addEventListener('install', (_event) => {
  log('Service worker installing', { timestamp: new Date().toISOString() });
});

self.addEventListener('activate', (_event) => {
  log('Service worker activated', { timestamp: new Date().toISOString() });
});

self.addEventListener('message', (event) => {
  log('Service worker message received', event.data);
  
  // Handle debugging requests
  if (event.data && event.data.type === 'GET_SW_STATE') {
    event.ports[0].postMessage({
      swVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      ready: true
    });
  }
});

// Enhanced push notification handling
self.addEventListener('push', (event: any) => {
  log('Push event received', { hasData: !!event.data, timestamp: new Date().toISOString() });
  
  if (event.data) {
    try {
      const payload = event.data.json();
      log('Push data received', payload);
      
      // Extract title separately as it's not part of options
      const notificationTitle = payload.title || 'Knowledge Base';
      
      const options: NotificationOptions = {
        body: payload.body || 'New notification',
        icon: payload.icon || '/icon-192.svg',
        badge: payload.badge || '/icon-192.svg',
        tag: 'knowledge-base-notification',
        data: payload.data || {},
        requireInteraction: false,
        silent: false
      };

      log('Showing notification', { title: notificationTitle, options });
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, options)
          .then(() => {
            log('Notification shown successfully');
          })
          .catch((error: Error) => {
            log('Error showing notification', error);
          })
      );
    } catch (error) {
      log('Error parsing push data', error);
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
    log('Push event received but no data');
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

// Enhanced notification click handling
self.addEventListener('notificationclick', (event: any) => {
  log('Notification click received', {
    action: event.action,
    tag: event.notification.tag,
    data: event.notification.data
  });
  
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
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any) => {
        // Check if there's an existing window we can focus
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            (client as any).focus?.();
            (client as any).navigate?.(targetUrl);
            return;
          }
        }
        // If no existing window, open a new one
        return self.clients.openWindow(targetUrl);
      })
    );
  }
});