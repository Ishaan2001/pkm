// Enhanced notification debugging utilities

interface NotificationDebugInfo {
  timestamp: string;
  browser: string;
  capabilities: {
    notifications: boolean;
    serviceWorker: boolean;
    pushManager: boolean;
  };
  permissions: {
    notification: NotificationPermission | 'not-supported';
  };
  localStorage: {
    enabled: string | null;
    dismissed: string | null;
  };
  serviceWorker: {
    ready: boolean;
    registration?: ServiceWorkerRegistration;
    subscription?: PushSubscription | null;
  };
}

export const getNotificationDebugInfo = async (): Promise<NotificationDebugInfo> => {
  const info: NotificationDebugInfo = {
    timestamp: new Date().toISOString(),
    browser: navigator.userAgent,
    capabilities: {
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window
    },
    permissions: {
      notification: 'Notification' in window ? Notification.permission : 'not-supported'
    },
    localStorage: {
      enabled: localStorage.getItem('notifications-enabled'),
      dismissed: localStorage.getItem('notification-prompt-dismissed')
    },
    serviceWorker: {
      ready: false
    }
  };

  // Check service worker status
  if (info.capabilities.serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      info.serviceWorker.ready = true;
      info.serviceWorker.registration = registration;
      
      if (info.capabilities.pushManager) {
        const subscription = await registration.pushManager.getSubscription();
        info.serviceWorker.subscription = subscription;
      }
    } catch (error) {
      console.error('[NotificationDebug] Service worker check failed:', error);
    }
  }

  return info;
};

export const logNotificationState = async (context?: string) => {
  const info = await getNotificationDebugInfo();
  console.group(`[NotificationDebug] ${context || 'Current State'} - ${info.timestamp}`);
  console.log('Capabilities:', info.capabilities);
  console.log('Permissions:', info.permissions);
  console.log('Local Storage:', info.localStorage);
  console.log('Service Worker:', {
    ready: info.serviceWorker.ready,
    hasSubscription: !!info.serviceWorker.subscription,
    endpoint: info.serviceWorker.subscription?.endpoint?.substring(0, 50) + '...' || 'None'
  });
  console.groupEnd();
  return info;
};

export const testNotificationFlow = async () => {
  console.log('[NotificationDebug] Starting notification flow test...');
  
  const startState = await logNotificationState('Test Start');
  
  // Test basic notification
  if (startState.capabilities.notifications && startState.permissions.notification === 'granted') {
    console.log('[NotificationDebug] Testing basic notification...');
    try {
      new Notification('🧪 Test Notification', {
        body: 'Testing notification functionality',
        icon: '/icon-192.svg',
        tag: 'debug-test'
      });
      console.log('[NotificationDebug] ✅ Basic notification works');
    } catch (error) {
      console.error('[NotificationDebug] ❌ Basic notification failed:', error);
    }
  }
  
  // Test service worker communication
  if (startState.serviceWorker.ready) {
    console.log('[NotificationDebug] Testing service worker communication...');
    try {
      const messageChannel = new MessageChannel();
      
      const responsePromise = new Promise<unknown>((resolve) => {
        messageChannel.port1.onmessage = (event) => resolve(event.data);
        setTimeout(() => resolve({ error: 'timeout' }), 5000);
      });
      
      navigator.serviceWorker.controller?.postMessage({
        type: 'GET_SW_STATE'
      }, [messageChannel.port2]);
      
      const swResponse = await responsePromise;
      console.log('[NotificationDebug] Service worker response:', swResponse);
    } catch (error) {
      console.error('[NotificationDebug] Service worker communication failed:', error);
    }
  }
  
  await logNotificationState('Test End');
  console.log('[NotificationDebug] Test completed');
};

// Add global debug functions
declare global {
  interface Window {
    debugNotifications: typeof logNotificationState;
    testNotificationFlow: typeof testNotificationFlow;
  }
}

window.debugNotifications = logNotificationState;
window.testNotificationFlow = testNotificationFlow;

console.log('[NotificationDebug] Debug utilities loaded. Use debugNotifications() or testNotificationFlow() in console.');