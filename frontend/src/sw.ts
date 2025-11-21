/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

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

// Push notification handling
self.addEventListener('push', (event: any) => {
  console.log('Push event received', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push data received:', payload);
      
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

      console.log('Showing notification with title:', notificationTitle);
      console.log('Notification options:', options);
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, options)
          .then(() => {
            console.log('Notification shown successfully');
          })
          .catch((error: Error) => {
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
self.addEventListener('notificationclick', (event: any) => {
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