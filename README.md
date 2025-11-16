# Knowledge Base PWA

A simple note-taking Progressive Web App with AI-powered summaries and push notifications. Built with React + TypeScript frontend and FastAPI + Python backend.

## ✨ Features

### 📝 Note Management
- Create notes with a floating action button
- View notes in a clean card layout with AI summaries
- Edit notes with content update and AI summary regeneration
- Delete notes with confirmation modal
- Real-time AI summary polling (checks every 2 seconds for 20 seconds)

### 🤖 AI Integration
- **Google Gemini API** integration for automatic note summarization
- **Smart prompting** designed for 40-word concise summaries optimized for notifications
- **Fallback models**: gemini-2.5-flash → gemini-2.5-pro → gemini-2.0-flash
- **Background processing** - summaries generate asynchronously
- **Retry logic** with exponential backoff for API reliability

### 🔔 Push Notifications
- **Daily reminders at 7:00 PM India time** (1:30 PM UTC)
- **Browser push notifications** using Web Push Protocol with VAPID authentication
- **Service worker** registration for push subscription management
- **Round-robin note selection** for daily reminders
- **Subscription persistence** in SQLite database
- **Test endpoint** for immediate notification testing

### 🎨 UI/UX
- **Dark theme** with black background and orange (#F97316) accent colors
- **Custom CSS classes** for consistent styling (note-card, btn-primary, etc.)
- **Loading states** with orange spinners during AI summary generation
- **Responsive design** with mobile-friendly floating action button
- **Time formatting** with "just now", "5m ago", "2h ago" relative timestamps

## 🏗️ Architecture

### Frontend (`/frontend/`)
- **React 19** with TypeScript and Vite
- **React Router v7** for client-side routing (`/`, `/note/:id`)
- **React Context** for state management (NotesContext)
- **Tailwind CSS 3.4.0** for styling with custom component classes
- **Service Worker** for push notification registration
- **Manual API calls** - no external HTTP library used

### Backend (`/backend/`)
- **FastAPI** with Python 3.13
- **SQLAlchemy ORM** with SQLite database (`notes.db`)
- **APScheduler** for daily notification cron jobs
- **pywebpush** for actual browser push notifications
- **Google Generative AI** for note summarization
- **CORS enabled** for localhost:5173/5174 frontend integration

## 🚀 Getting Started

### Prerequisites
- Python 3.13+
- Node.js 18+
- Google Gemini API Key

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_google_gemini_api_key" > .env

python main.py
```
Backend runs on: http://127.0.0.1:8000

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:5174

## 🗄️ Database Schema

**Notes Table:**
- `id` (Primary Key)
- `content` (TEXT)
- `ai_summary` (TEXT, nullable)
- `created_at`, `updated_at` (UTC timestamps)

**Push Subscriptions Table:**
- `id` (Primary Key)
- `endpoint` (TEXT, unique)
- `p256dh_key`, `auth_key` (TEXT)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (UTC timestamps)

## 🔌 API Endpoints

### Notes
- `GET /api/notes` - List all notes
- `POST /api/notes` - Create note (triggers background AI summary)
- `GET /api/notes/{id}` - Get specific note
- `PUT /api/notes/{id}` - Update note with optional `regenerate_summary`
- `DELETE /api/notes/{id}` - Delete note

### Notifications
- `POST /api/notifications/subscribe` - Register push subscription
- `POST /api/notifications/test` - Send test notification

### Health
- `GET /` - API status
- `GET /health` - Health check

## 🔔 Notification System

### How It Works
1. **User enables notifications** → Browser requests permission
2. **Service worker registers** → Creates push subscription with VAPID keys
3. **Subscription sent to backend** → Stored in database
4. **Daily scheduler runs** → Selects random note with AI summary
5. **Push notification sent** → Using pywebpush to browser via FCM

### Schedule
- **Daily at 7:00 PM India time** (13:30 UTC)
- **Round-robin note selection** from notes with AI summaries
- **Automatic cleanup** of expired/invalid subscriptions

### Testing
```bash
# Test notifications manually
curl -X POST http://localhost:8000/api/notifications/test
```

## 🛠️ Technical Implementation

### Frontend State Management
- **NotesContext** provides CRUD operations
- **Polling mechanism** for AI summary updates
- **Local storage** for notification preferences
- **Error boundaries** for API failures

### Backend Processing
- **Background tasks** for AI summary generation using FastAPI BackgroundTasks
- **Database session management** with SQLAlchemy dependency injection
- **Async scheduling** with APScheduler for notifications
- **VAPID authentication** for secure push notifications

### AI Summary Generation
- **Optimized prompt** for concise 40-word summaries
- **Model fallback chain** ensures high availability
- **Retry logic** with exponential backoff
- **Background processing** doesn't block note creation

## 📦 Dependencies

### Frontend
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0", 
  "react-router-dom": "^7.9.6",
  "tailwindcss": "^3.4.0",
  "typescript": "~5.9.3",
  "vite": "^7.2.2"
}
```

### Backend
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.0
google-generativeai>=0.3.0
pydantic>=2.8.0
apscheduler>=3.10.0
pywebpush>=1.14.0
ecdsa  # For VAPID key generation
```

## 🎨 Styling System

### Custom CSS Classes (in `index.css`)
- `.note-card` - Note card styling with hover effects
- `.btn-primary` - Orange buttons (#F97316)
- `.btn-secondary` - Gray buttons
- `.input-field` - Form inputs with orange focus
- `.floating-add-button` - Fixed position add button

### Color Scheme
- **Background**: Black (#000000)
- **Cards**: Gray-900 (#111827) 
- **Borders**: Gray-800 (#1F2937)
- **Accent**: Orange-500 (#F97316)
- **Text**: White/Gray

## 🚀 Deployment Notes

### Production Checklist
- [ ] Update VAPID email in `push_service.py`
- [ ] Configure production CORS origins
- [ ] Set up environment variables for Gemini API
- [ ] Use PostgreSQL instead of SQLite for production
- [ ] Set up proper logging and monitoring
- [ ] Configure HTTPS for PWA requirements

### Environment Variables
```bash
# Backend (.env)
GEMINI_API_KEY=your_google_gemini_api_key
```

## 🔧 Development Commands

```bash
# Backend
cd backend && source venv/bin/activate && python main.py

# Frontend  
cd frontend && npm run dev

# Type checking
cd frontend && npm run build

# Linting
cd frontend && npm run lint
```

## 🐛 Known Limitations

- **SQLite database** - not suitable for production scale
- **In-memory scheduling** - notification state lost on restart
- **Single timezone** - hardcoded for India time
- **No user authentication** - single-user application
- **Local storage only** - no cloud sync
- **Basic error handling** - limited retry mechanisms

---

**A clean, functional note-taking app with AI-powered insights and daily reminders.**