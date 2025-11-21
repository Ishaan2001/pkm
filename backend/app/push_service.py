import json
import logging
import os
from typing import List, Optional
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session
from .database import PushSubscription

logger = logging.getLogger(__name__)

# VAPID keys - use environment variables in production, fallback to defaults for development
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "CJxrXYFUOEzkYCKEqD6DLapI9Qwmu-1NA7L36u8caLQ")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "BLlpxAkzak5Y9Bkp6wU_Q3TnXDCSjJB1yC0_sEfgxHYRMrzJhngxZU8vJ3IXNmFx2Ls8h7NaHwpmwbhPZeVXPM0")
VAPID_CLAIMS = {
    "sub": os.getenv("VAPID_EMAIL", "mailto:your-email@example.com")
}

class PushNotificationService:
    def __init__(self):
        self.vapid_private_key = VAPID_PRIVATE_KEY
        self.vapid_public_key = VAPID_PUBLIC_KEY
        self.vapid_claims = VAPID_CLAIMS

    async def send_notification_to_all(self, db: Session, title: str, body: str, data: Optional[dict] = None):
        """Send push notification to all active subscriptions"""
        active_subscriptions = db.query(PushSubscription).filter(
            PushSubscription.is_active == True
        ).all()
        
        if not active_subscriptions:
            logger.info("No active push subscriptions found")
            return 0, 0
        
        successful_sends = 0
        failed_sends = 0
        inactive_subscriptions = []
        
        for subscription in active_subscriptions:
            try:
                success = await self._send_to_subscription(subscription, title, body, data)
                if success:
                    successful_sends += 1
                else:
                    failed_sends += 1
                    inactive_subscriptions.append(subscription.id)
            except Exception as e:
                logger.error(f"Error sending to subscription {subscription.id}: {e}")
                failed_sends += 1
                inactive_subscriptions.append(subscription.id)
        
        # Mark failed subscriptions as inactive
        if inactive_subscriptions:
            db.query(PushSubscription).filter(
                PushSubscription.id.in_(inactive_subscriptions)
            ).update({"is_active": False})
            db.commit()
            logger.info(f"Marked {len(inactive_subscriptions)} subscriptions as inactive")
        
        logger.info(f"Push notification sent: {successful_sends} successful, {failed_sends} failed")
        return successful_sends, failed_sends

    async def send_notification_to_user(self, db: Session, user_id: int, title: str, body: str, data: Optional[dict] = None):
        """Send push notification to all active subscriptions for a specific user"""
        active_subscriptions = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active == True
        ).all()
        
        if not active_subscriptions:
            logger.info(f"No active push subscriptions found for user {user_id}")
            return 0, 0
        
        successful_sends = 0
        failed_sends = 0
        inactive_subscriptions = []
        
        for subscription in active_subscriptions:
            try:
                success = await self._send_to_subscription(subscription, title, body, data)
                if success:
                    successful_sends += 1
                else:
                    failed_sends += 1
                    inactive_subscriptions.append(subscription.id)
            except Exception as e:
                logger.error(f"Error sending to subscription {subscription.id}: {e}")
                failed_sends += 1
                inactive_subscriptions.append(subscription.id)
        
        # Mark failed subscriptions as inactive
        if inactive_subscriptions:
            db.query(PushSubscription).filter(
                PushSubscription.id.in_(inactive_subscriptions)
            ).update({"is_active": False})
            db.commit()
            logger.info(f"Marked {len(inactive_subscriptions)} subscriptions as inactive")
        
        logger.info(f"Push notification sent to user {user_id}: {successful_sends} successful, {failed_sends} failed")
        return successful_sends, failed_sends

    async def _send_to_subscription(self, subscription: PushSubscription, title: str, body: str, data: Optional[dict] = None) -> bool:
        """Send push notification to a specific subscription"""
        try:
            # Prepare the subscription info for pywebpush
            subscription_info = {
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh_key,
                    "auth": subscription.auth_key
                }
            }
            
            # Prepare the payload
            payload = {
                "title": title,
                "body": body,
                "icon": "/icon-192.svg",
                "badge": "/icon-192.svg",
                "data": data or {}
            }
            
            # Send the notification
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims
            )
            
            logger.info(f"Successfully sent push notification to endpoint: {subscription.endpoint[:50]}...")
            return True
            
        except WebPushException as e:
            logger.error(f"WebPush error for subscription {subscription.id}: {e}")
            if e.response and e.response.status_code in [400, 404, 410, 413]:
                # These status codes indicate the subscription is no longer valid
                return False
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending push notification: {e}")
            raise

# Global instance
push_service = PushNotificationService()