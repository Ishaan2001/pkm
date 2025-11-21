from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import logging
import os
from pydantic import BaseModel
from datetime import timedelta

from . import schemas
from .database import get_db, init_db, Note, PushSubscription as DBPushSubscription, Notebook, User
from .ai_service import summarize_note
from .notification_scheduler import notification_scheduler
from .auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash, 
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Notes PWA API", version="1.0.0")

# Configure CORS for both development and production
allowed_origins = [
    "http://localhost:5173", 
    "http://localhost:5174", 
    "http://127.0.0.1:5173", 
    "http://127.0.0.1:5174",  # Development
]

# Add additional origins from environment variable (for production)
if os.getenv("FRONTEND_ORIGINS"):
    additional_origins = os.getenv("FRONTEND_ORIGINS").split(",")
    allowed_origins.extend([origin.strip() for origin in additional_origins])

# Custom CORS middleware to handle Vercel subdomains
def is_vercel_origin(origin: str) -> bool:
    """Check if origin is a Vercel deployment"""
    return origin.endswith('.vercel.app') and origin.startswith('https://')

# For production, we'll need to add the specific Vercel URL via FRONTEND_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app$"  # Allow all Vercel apps
)

@app.on_event("startup")
async def startup_event():
    init_db()
    notification_scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    notification_scheduler.stop()

async def generate_summary_task(note_id: int, content: str, db: Session):
    """Background task to generate AI summary"""
    try:
        summary = summarize_note(content)
        if summary:
            note = db.query(Note).filter(Note.id == note_id).first()
            if note:
                note.ai_summary = summary
                db.commit()
                logger.info(f"AI summary generated for note {note_id}")
    except Exception as e:
        logger.error(f"Failed to generate summary for note {note_id}: {e}")

@app.get("/")
async def root():
    return {"message": "Notes PWA API is running"}

# Authentication endpoints
@app.post("/api/auth/signup", response_model=schemas.Token)
async def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """User registration"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    logger.info(f"New user registered: {db_user.email}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=schemas.Token)
async def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """User login"""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    logger.info(f"User logged in: {user.email}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user

@app.post("/api/auth/logout")
async def logout():
    """Logout (client-side token removal)"""
    return {"message": "Successfully logged out"}

@app.post("/api/notes", response_model=schemas.Note)
async def create_note(
    note: schemas.NoteCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new note and generate AI summary in background"""
    db_note = Note(content=note.content, user_id=current_user.id)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    # Generate AI summary in background
    background_tasks.add_task(generate_summary_task, db_note.id, note.content, db)
    
    return db_note

@app.get("/api/notes", response_model=List[schemas.Note])
async def get_notes(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all notes for current user"""
    notes = db.query(Note).filter(Note.user_id == current_user.id).offset(skip).limit(limit).all()
    return notes

@app.get("/api/notes/{note_id}", response_model=schemas.Note)
async def get_note(
    note_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific note by ID"""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.put("/api/notes/{note_id}", response_model=schemas.Note)
async def update_note(
    note_id: int, 
    note_update: schemas.NoteUpdate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a note and optionally regenerate AI summary"""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.content = note_update.content
    db.commit()
    db.refresh(note)
    
    # Regenerate AI summary if requested
    if note_update.regenerate_summary:
        background_tasks.add_task(generate_summary_task, note.id, note_update.content, db)
    
    return note

@app.delete("/api/notes/{note_id}")
async def delete_note(
    note_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a note"""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}

class PushSubscription(BaseModel):
    subscription: dict

@app.post("/api/notifications/subscribe")
async def subscribe_to_notifications(
    subscription_data: PushSubscription, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Subscribe to push notifications"""
    try:
        subscription = subscription_data.subscription
        endpoint = subscription.get("endpoint")
        keys = subscription.get("keys", {})
        p256dh = keys.get("p256dh")
        auth = keys.get("auth")
        
        if not all([endpoint, p256dh, auth]):
            raise HTTPException(status_code=400, detail="Invalid subscription data")
        
        # Check if subscription already exists for this user
        existing_sub = db.query(DBPushSubscription).filter(
            DBPushSubscription.endpoint == endpoint,
            DBPushSubscription.user_id == current_user.id
        ).first()
        
        if existing_sub:
            # Update existing subscription
            existing_sub.p256dh_key = p256dh
            existing_sub.auth_key = auth
            existing_sub.is_active = True
            logger.info(f"Updated existing push subscription for user {current_user.email}")
        else:
            # Create new subscription
            db_subscription = DBPushSubscription(
                endpoint=endpoint,
                p256dh_key=p256dh,
                auth_key=auth,
                user_id=current_user.id,
                is_active=True
            )
            db.add(db_subscription)
            logger.info(f"Created new push subscription for user {current_user.email}")
        
        db.commit()
        return {"message": "Successfully subscribed to notifications"}
    except Exception as e:
        logger.error(f"Failed to subscribe to notifications: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to subscribe")

@app.post("/api/notifications/test")
async def test_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Test endpoint to trigger a notification immediately"""
    try:
        from .push_service import push_service
        
        # Find a note with AI summary for the current user
        note = db.query(Note).filter(
            Note.user_id == current_user.id,
            Note.ai_summary.isnot(None)
        ).first()
        
        if not note:
            raise HTTPException(status_code=404, detail="No notes with AI summaries found")
        
        # Send test notification to current user only
        successful_sends, failed_sends = await push_service.send_notification_to_user(
            db=db,
            user_id=current_user.id,
            title="🧪 Test Notification - Knowledge Base",
            body=f"Testing push notifications! Here's a sample AI summary: {note.ai_summary[:100]}...",
            data={
                "noteId": note.id,
                "action": "view_note",
                "url": f"/note/{note.id}"
            }
        )
        
        return {
            "message": "Test notification sent",
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "note_id": note.id
        }
    except Exception as e:
        logger.error(f"Failed to send test notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send test notification: {str(e)}")

# Notebook endpoints
@app.get("/api/notebooks", response_model=List[schemas.Notebook])
async def get_notebooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all notebooks with note counts for current user"""
    from sqlalchemy import func
    notebooks = (
        db.query(
            Notebook,
            func.count(Note.id).label('note_count')
        )
        .filter(Notebook.user_id == current_user.id)
        .outerjoin(Notebook.notes)
        .group_by(Notebook.id)
        .all()
    )
    
    result = []
    for notebook, note_count in notebooks:
        notebook_dict = {
            "id": notebook.id,
            "title": notebook.title,
            "created_at": notebook.created_at,
            "updated_at": notebook.updated_at,
            "note_count": note_count
        }
        result.append(notebook_dict)
    
    return result

@app.post("/api/notebooks", response_model=schemas.Notebook)
async def create_notebook(
    notebook: schemas.NotebookCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new notebook"""
    db_notebook = Notebook(title=notebook.title, user_id=current_user.id)
    db.add(db_notebook)
    db.commit()
    db.refresh(db_notebook)
    
    # Add note_count field
    result = {
        "id": db_notebook.id,
        "title": db_notebook.title,
        "created_at": db_notebook.created_at,
        "updated_at": db_notebook.updated_at,
        "note_count": 0
    }
    return result

@app.get("/api/notebooks/{notebook_id}", response_model=schemas.NotebookWithNotes)
async def get_notebook(
    notebook_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific notebook with its notes"""
    notebook = db.query(Notebook).filter(
        Notebook.id == notebook_id, 
        Notebook.user_id == current_user.id
    ).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook

@app.put("/api/notebooks/{notebook_id}", response_model=schemas.Notebook)
async def update_notebook(
    notebook_id: int, 
    notebook_update: schemas.NotebookUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a notebook title"""
    notebook = db.query(Notebook).filter(
        Notebook.id == notebook_id, 
        Notebook.user_id == current_user.id
    ).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    notebook.title = notebook_update.title
    db.commit()
    db.refresh(notebook)
    
    # Get note count
    from sqlalchemy import func
    note_count = db.query(func.count(Note.id)).join(Notebook.notes).filter(Notebook.id == notebook_id).scalar() or 0
    
    result = {
        "id": notebook.id,
        "title": notebook.title,
        "created_at": notebook.created_at,
        "updated_at": notebook.updated_at,
        "note_count": note_count
    }
    return result

@app.delete("/api/notebooks/{notebook_id}")
async def delete_notebook(
    notebook_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a notebook (notes are not deleted, only the association)"""
    notebook = db.query(Notebook).filter(
        Notebook.id == notebook_id, 
        Notebook.user_id == current_user.id
    ).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    db.delete(notebook)
    db.commit()
    return {"message": "Notebook deleted successfully"}

@app.get("/api/notebooks/{notebook_id}/notes", response_model=List[schemas.Note])
async def get_notebook_notes(
    notebook_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all notes in a specific notebook"""
    notebook = db.query(Notebook).filter(
        Notebook.id == notebook_id, 
        Notebook.user_id == current_user.id
    ).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook.notes

@app.post("/api/notebooks/{notebook_id}/notes/{note_id}")
async def add_note_to_notebook(
    notebook_id: int, 
    note_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a note to a notebook"""
    notebook = db.query(Notebook).filter(
        Notebook.id == notebook_id, 
        Notebook.user_id == current_user.id
    ).first()
    note = db.query(Note).filter(
        Note.id == note_id, 
        Note.user_id == current_user.id
    ).first()
    
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note not in notebook.notes:
        notebook.notes.append(note)
        db.commit()
        return {"message": "Note added to notebook successfully"}
    else:
        return {"message": "Note is already in this notebook"}

@app.delete("/api/notebooks/{notebook_id}/notes/{note_id}")
async def remove_note_from_notebook(
    notebook_id: int, 
    note_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a note from a notebook"""
    notebook = db.query(Notebook).filter(
        Notebook.id == notebook_id, 
        Notebook.user_id == current_user.id
    ).first()
    note = db.query(Note).filter(
        Note.id == note_id, 
        Note.user_id == current_user.id
    ).first()
    
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note in notebook.notes:
        notebook.notes.remove(note)
        db.commit()
        return {"message": "Note removed from notebook successfully"}
    else:
        return {"message": "Note is not in this notebook"}

# Search endpoint
@app.get("/api/search", response_model=schemas.SearchResult)
async def search_notes(
    q: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search notes by content and AI summary"""
    if not q.strip():
        return {"notes": [], "total_count": 0}
    
    search_term = f"%{q.lower()}%"
    notes = db.query(Note).filter(
        Note.user_id == current_user.id,
        (Note.content.ilike(search_term) | Note.ai_summary.ilike(search_term))
    ).all()
    
    return {"notes": notes, "total_count": len(notes)}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}