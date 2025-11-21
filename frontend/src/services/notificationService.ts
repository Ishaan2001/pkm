const VAPID_PUBLIC_KEY = 'BLlpxAkzak5Y9Bkp6wU_Q3TnXDCSjJB1yC0_sEfgxHYRMrzJhngxZU8vJ3IXNmFx2Ls8h7NaHwpmwbhPZeVXPM0';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class NotificationService {
  private vapidPublicKey = VAPID_PUBLIC_KEY;

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    return await Notification.requestPermission();
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push messaging is not supported');
      return null;
    }

    try {
      // Register custom service worker for push notifications
      await navigator.serviceWorker.register('/push-sw.js');
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription and unsubscribe if it exists
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Unsubscribing from existing push subscription');
        await existingSubscription.unsubscribe();
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      await this.sendSubscriptionToServer(subscription);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subscription: subscription.toJSON()
        }),
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  }

  async getSubscriptionStatus(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  showLocalNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
}

export const notificationService = new NotificationService();