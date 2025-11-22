import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Import debugging utilities
import { logNotificationState } from '../utils/notificationDebug';

// Enhanced logging helper
const log = (message: string, data?: unknown) => {
  console.log(`[NotificationSetup] ${message}`, data || '');
};

// Service worker registration with timeout and retry
const waitForServiceWorker = async (timeoutMs: number = 10000): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }
  
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Service worker timeout')), timeoutMs);
  });
  
  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      timeoutPromise
    ]);
    log('Service worker ready', registration);
    return registration as ServiceWorkerRegistration;
  } catch (error) {
    log('Service worker failed to become ready', error);
    return null;
  }
};

// Enhanced subscription state checking
const getActualSubscriptionState = async (): Promise<{ hasSubscription: boolean; subscription: PushSubscription | null }> => {
  try {
    const registration = await waitForServiceWorker(5000);
    if (!registration || !('PushManager' in window)) {
      return { hasSubscription: false, subscription: null };
    }
    
    const subscription = await registration.pushManager.getSubscription();
    log('Current subscription state', { hasSubscription: !!subscription, endpoint: subscription?.endpoint?.substring(0, 50) + '...' });
    return { hasSubscription: !!subscription, subscription };
  } catch (error) {
    log('Error checking subscription state', error);
    return { hasSubscription: false, subscription: null };
  }
};

const NotificationSetup: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Enhanced prompt visibility logic with auth awareness
    const shouldShowPrompt = async () => {
      log('Checking if notification prompt should be shown');
      await logNotificationState('Prompt Check');
      
      // Check for force reset parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('resetNotifications') === 'true') {
        localStorage.removeItem('notification-prompt-dismissed');
        localStorage.removeItem('notifications-enabled');
        log('Notification state reset via URL parameter');
      }
      
      // Don't show if user is not authenticated
      if (!isAuthenticated) {
        log('User not authenticated, not showing prompt');
        return false;
      }
      
      // Don't show if user has already dismissed notifications
      const dismissed = localStorage.getItem('notification-prompt-dismissed');
      if (dismissed) {
        log('User previously dismissed notifications');
        return false;
      }
      
      // Don't show if notifications are denied
      if ('Notification' in window && Notification.permission === 'denied') {
        log('Browser notifications denied');
        return false;
      }
      
      // Check actual subscription state vs local storage
      const { hasSubscription } = await getActualSubscriptionState();
      const localEnabled = localStorage.getItem('notifications-enabled');
      
      if (hasSubscription) {
        log('Active subscription found, not showing prompt');
        // Sync local storage with actual state
        if (!localEnabled) {
          localStorage.setItem('notifications-enabled', 'true');
          log('Synced local storage with active subscription');
        }
        return false;
      } else {
        // No subscription, clear local storage if it claims otherwise
        if (localEnabled) {
          localStorage.removeItem('notifications-enabled');
          log('Cleared stale local storage state');
        }
        log('No active subscription, showing prompt');
        return true;
      }
    };

    let timeoutId: number | null = null;
    
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
  }, [isAuthenticated]);

  // Reset all notification state (for debugging)
  const resetNotificationState = async () => {
    log('Resetting all notification state');
    
    // Clear local storage
    localStorage.removeItem('notifications-enabled');
    localStorage.removeItem('notification-prompt-dismissed');
    
    // Unsubscribe from push notifications
    try {
      const { hasSubscription, subscription } = await getActualSubscriptionState();
      if (hasSubscription && subscription) {
        await subscription.unsubscribe();
        log('Unsubscribed from push notifications');
      }
    } catch (error) {
      log('Error unsubscribing', error);
    }
    
    // Reset UI state
    setShowPrompt(false);
    setIsVisible(false);
    setIsProcessing(false);
    
    log('Notification state reset complete');
  };
  
  // Add global debug helper
  useEffect(() => {
    (window as unknown as { resetNotifications: () => Promise<void> }).resetNotifications = resetNotificationState;
    log('Debug helper added: resetNotifications()');
  }, []);

  const handleEnableNotifications = async () => {
    if (isProcessing) {
      log('Setup already in progress, ignoring click');
      return;
    }
    
    setIsProcessing(true);
    log('Starting notification setup process');
    await logNotificationState('Setup Start');
    
    try {
      // Step 1: Check authentication
      if (!isAuthenticated) {
        alert('Please log in to enable notifications');
        log('Setup failed: user not authenticated');
        return;
      }
      
      // Step 2: Request notification permission
      if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        log('Setup failed: notifications not supported');
        return;
      }

      log('Requesting notification permission');
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Notification permission denied');
        log('Setup failed: permission denied');
        return;
      }
      
      log('Notification permission granted');

      // Step 3: Show immediate test notification
      new Notification('📝 Knowledge Base', {
        body: 'Notifications enabled! You\'ll receive daily reminders at 7 PM with AI summaries.',
        icon: '/icon-192.svg'
      });
      log('Test notification shown');

      // Step 4: Set up push notifications
      if ('PushManager' in window) {
        try {
          log('Setting up push notifications');
          
          // Wait for service worker with enhanced error handling
          const registration = await waitForServiceWorker(15000);
          if (!registration) {
            throw new Error('Service worker failed to become ready');
          }
          
          // Check current subscription state
          const { hasSubscription, subscription: existingSubscription } = await getActualSubscriptionState();
          
          let subscription = existingSubscription;
          
          if (!hasSubscription) {
            log('Creating new push subscription');
            // Create new subscription
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array('BLlpxAkzak5Y9Bkp6wU_Q3TnXDCSjJB1yC0_sEfgxHYRMrzJhngxZU8vJ3IXNmFx2Ls8h7NaHwpmwbhPZeVXPM0')
            });
            log('New subscription created');
          } else {
            log('Using existing valid subscription');
          }
          
          if (!subscription) {
            throw new Error('Failed to create or retrieve subscription');
          }
          
          // Send subscription to backend with retry logic
          await sendSubscriptionToBackend(subscription);
          
          log('Push notifications successfully set up');
          localStorage.setItem('notifications-enabled', 'true');
          
        } catch (error) {
          log('Push subscription failed', error);
          alert(`Failed to set up push notifications: ${error instanceof Error ? error.message : 'Unknown error'}. You'll still get basic browser notifications.`);
          // Continue - basic notifications work even without push
        }
      } else {
        log('Push notifications not supported, using basic notifications only');
      }
      
      // Mark as enabled for basic notifications
      localStorage.setItem('notifications-enabled', 'true');
      log('Notification setup completed successfully');
      
    } catch (error) {
      log('Notification setup failed', error);
      alert(`Failed to set up notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      handleDismiss();
    }
  };
  
  // Enhanced backend communication with retry logic
  const sendSubscriptionToBackend = async (subscription: PushSubscription, maxRetries: number = 3) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log(`Sending subscription to backend (attempt ${attempt}/${maxRetries})`);
        
        const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            subscription: subscription.toJSON() 
          })
        });
        
        if (response.ok) {
          log('Subscription successfully sent to backend');
          return;
        } else {
          const errorText = await response.text();
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        
      } catch (error) {
        log(`Backend request failed (attempt ${attempt}/${maxRetries})`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to register with server after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-prompt-dismissed', 'true');
    setIsVisible(false);
    setTimeout(() => setShowPrompt(false), 300);
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
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
                disabled={isProcessing || !isAuthenticated}
                className={`font-medium px-4 py-2 rounded-lg transition-colors duration-200 text-sm ${
                  isProcessing || !isAuthenticated 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {isProcessing ? 'Setting up...' : 'Enable Now'}
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