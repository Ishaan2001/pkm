import React, { useState, useEffect } from 'react';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || `${API_BASE_URL}';

const NotificationSetup: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if notification prompt should be shown
    const shouldShowPrompt = async () => {
      // Check for force reset parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('resetNotifications') === 'true') {
        localStorage.removeItem('notification-prompt-dismissed');
        localStorage.removeItem('notifications-enabled');
        console.log('Notification state reset via URL parameter');
      }
      
      // Don't show if user has already dismissed notifications
      const dismissed = localStorage.getItem('notification-prompt-dismissed');
      if (dismissed) {
        return false;
      }
      
      // Don't show if notifications are denied
      if ('Notification' in window && Notification.permission === 'denied') {
        return false;
      }
      
      // Check if we have an active push subscription
      const enabled = localStorage.getItem('notifications-enabled');
      if (enabled && 'serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            // We have a working subscription, don't show prompt
            return false;
          } else {
            // No subscription found, clear the enabled flag and show prompt
            localStorage.removeItem('notifications-enabled');
          }
        } catch (error) {
          // Error checking subscription, clear the enabled flag
          localStorage.removeItem('notifications-enabled');
        }
      }
      
      return true;
    };

    let timeoutId: NodeJS.Timeout | null = null;
    
    shouldShowPrompt().then(shouldShow => {
      if (shouldShow) {
        timeoutId = setTimeout(() => {
          setShowPrompt(true);
          setTimeout(() => setIsVisible(true), 100);
        }, 2000);
      }
    });
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleEnableNotifications = async () => {
    try {
      // Step 1: Request notification permission
      if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
      }

      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Notification permission denied');
        return;
      }

      // Step 2: Show immediate test notification
      new Notification('📝 Knowledge Base', {
        body: 'Notifications enabled! You\'ll receive daily reminders at 7 PM with AI summaries.',
        icon: '/icon-192.svg'
      });

      // Step 3: Register service worker and wait for it to be ready
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          // Register the service worker
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          // Wait for the service worker to be ready
          await navigator.serviceWorker.ready;
          
          // Check for existing subscription and unsubscribe if it exists
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            console.log('Unsubscribing from existing push subscription');
            await existingSubscription.unsubscribe();
          }
          
          // Now subscribe to push notifications with new VAPID key
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BLlpxAkzak5Y9Bkp6wU_Q3TnXDCSjJB1yC0_sEfgxHYRMrzJhngxZU8vJ3IXNmFx2Ls8h7NaHwpmwbhPZeVXPM0')
          });
          
          // Send subscription to backend
          const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              subscription: subscription.toJSON() 
            })
          });
          
          if (response.ok) {
            console.log('Push notifications successfully set up');
            localStorage.setItem('notifications-enabled', 'true');
          } else {
            throw new Error('Failed to register subscription with server');
          }
        } catch (error) {
          console.error('Push subscription failed:', error);
          alert('Failed to set up push notifications. You\'ll still get basic browser notifications.');
          // Still continue - basic notifications work even without push
        }
      }
      
      // Mark as enabled even if push subscription failed
      localStorage.setItem('notifications-enabled', 'true');
    } catch (error) {
      console.error('Notification setup failed:', error);
    }
    
    handleDismiss();
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-prompt-dismissed', 'true');
    setIsVisible(false);
    setTimeout(() => setShowPrompt(false), 300);
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className={`fixed top-6 left-6 right-6 z-50 mx-auto max-w-sm transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
    }`}>
      <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 1v6m6.364-1.636l-4.242 4.242M21 12h-6M4 12H3m3.343-5.657l-4.243-4.243M12 21v-6" />
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Enable Smart Reminders</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Get daily notifications with AI summaries of your notes to boost memory retention and never forget important insights.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleEnableNotifications}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
              >
                Enable Now
              </button>
              <button
                onClick={handleDismiss}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
              >
                Later
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSetup;