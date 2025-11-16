import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .database import SessionLocal, Note
from .push_service import push_service

logger = logging.getLogger(__name__)

class NotificationScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.current_note_index = 0
        
    def start(self):
        """Start the notification scheduler"""
        # Schedule daily notifications at 7 PM India time (1:30 PM UTC)
        # India is UTC+5:30, so 7 PM India = 1:30 PM UTC
        self.scheduler.add_job(
            func=self.send_daily_notification,
            trigger=CronTrigger(hour=13, minute=30),  # 1:30 PM UTC = 7:00 PM India
            id='daily_notification',
            replace_existing=True
        )
        
        # For testing, also schedule every 2 minutes (uncomment for demo)
        # self.scheduler.add_job(
        #     func=self.send_daily_notification,
        #     trigger=CronTrigger(minute='*/2'),  # Every 2 minutes
        #     id='test_notification',
        #     replace_existing=True
        # )
        
        self.scheduler.start()
        logger.info("Notification scheduler started - daily notifications at 7:00 PM India time (1:30 PM UTC)")
    
    async def send_daily_notification(self):
        """Send daily notification with round-robin note selection"""
        db = SessionLocal()
        try:
            notes = db.query(Note).filter(Note.ai_summary.isnot(None)).all()
            
            if not notes:
                logger.info("No notes with AI summaries found for notification")
                return
            
            # Round-robin selection
            selected_note = notes[self.current_note_index % len(notes)]
            self.current_note_index += 1
            
            logger.info(f"Sending daily reminder notification:")
            logger.info(f"Note ID: {selected_note.id}")
            logger.info(f"AI Summary: {selected_note.ai_summary}")
            
            # Send actual push notification using the push service
            await push_service.send_notification_to_all(
                db=db,
                title="📝 Daily Knowledge Reminder",
                body=selected_note.ai_summary,
                data={
                    "noteId": selected_note.id,
                    "action": "view_note",
                    "url": f"/note/{selected_note.id}"
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending daily notification: {e}")
        finally:
            db.close()
    
    def stop(self):
        """Stop the notification scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Notification scheduler stopped")

# Global scheduler instance
notification_scheduler = NotificationScheduler()