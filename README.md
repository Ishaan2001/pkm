# Knowledge Base PWA

A comprehensive note-taking Progressive Web App with AI-powered summaries, notebooks organization, and push notifications. Built with React + TypeScript frontend and FastAPI + Python backend.

## ✨ Current Features

### 📝 Note Management
- **Create notes** with floating action button (+)
- **View notes** in card layout with AI summary highlights
- **Individual note pages** with full content view at `/note/:id`
- **Edit notes** with content updates and optional AI summary regeneration
- **Delete notes** with confirmation modal
- **Real-time timestamps** with "just now", "5m ago", "2h ago" formatting

### 📚 Notebooks Organization
- **Create notebooks** to organize notes by topic, project, or theme
- **Many-to-many relationships** - notes can belong to multiple notebooks
- **Notebook management** with rename, delete, and note count displays
- **Add notes to notebooks** with single-click or multi-select batch operations
- **Remove notes from notebooks** with batch selection capabilities
- **Inline editing** with Enter/Escape keyboard shortcuts

### 🔍 Search Functionality
- **Real-time search** across both note content and AI summaries
- **Keyword highlighting** in search results
- **Debounced search** (300ms delay) for optimal performance
- **Case-insensitive matching** for comprehensive results

### 🧭 Navigation System
- **Bottom navigation** with three main sections:
  - **Notebooks** (left) - Organize and manage note collections
  - **Search** (center) - Find notes quickly with keyword search
  - **All Notes** (right) - View all notes in chronological order

### 🤖 AI Integration
- **Google Gemini API** integration for automatic note summarization
- **40-word optimized prompts** for mobile notification compatibility
- **Multi-model fallback**: gemini-2.5-flash → gemini-2.5-pro → gemini-2.0-flash
- **Background processing** - AI summaries generate without blocking note creation
- **Smart polling** checks for AI summary completion every 2 seconds for 20 seconds
- **Retry logic** with exponential backoff for API reliability

### 🔔 Push Notification System
- **Daily reminders** scheduled for 7:00 PM India time (13:30 UTC)
- **Browser push notifications** using Web Push Protocol with VAPID keys
- **Service worker** handles push events and notification display
- **Round-robin note selection** ensures variety in daily reminders
- **Test endpoint** for immediate notification testing
- **Subscription management** with automatic cleanup of invalid subscriptions

### 🎨 Dark Theme UI
- **Black background** (#000000) with orange accent colors (#F97316)
- **Responsive design** optimized for mobile and desktop
- **Custom Tailwind classes**: note-card, btn-primary, btn-secondary, input-field
- **Loading states** with animated spinners during AI processing
- **Floating action button** with hover effects and tooltip

### 📱 PWA Capabilities
- **Installable app** with manifest configuration
- **Service worker** for offline functionality and push notifications
- **App icons** (192x192, 512x512 SVG format)
- **Standalone display** mode for native app experience
- **Enhanced notification permissions** when installed as PWA

## 🏗️ Technical Architecture

### Frontend (`/frontend/`)
- **React 19.2.0** with TypeScript and Vite 7.2.2
- **React Router DOM 7.9.6** for client-side routing with bottom navigation
- **React Context API** for global state management (NotesContext)
- **Tailwind CSS 3.4.0** for styling with custom component classes
- **Manual fetch API** calls - no external HTTP libraries
- **Service worker** registration for push notifications

### Backend (`/backend/`)
- **FastAPI** with Python 3.13 and Uvicorn server
- **SQLAlchemy 2.0+** ORM with SQLite database
- **APScheduler 3.10+** for cron-based daily notification scheduling
- **pywebpush 1.14+** for actual browser push notification delivery
- **google-generativeai 0.3+** for AI summarization
- **CORS enabled** for localhost:5173/5174 development

## 🗄️ Database Schema

### Notes Table
```sql
CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    content TEXT NOT NULL,
    ai_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Notebooks Table
```sql
CREATE TABLE notebooks (
    id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Note-Notebook Junction Table (Many-to-Many)
```sql
CREATE TABLE note_notebooks (
    note_id INTEGER,
    notebook_id INTEGER,
    PRIMARY KEY (note_id, notebook_id),
    FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
    FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE
);
```

### Push Subscriptions Table
```sql
CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Setup & Development

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

# Create environment file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start backend server
python main.py
```
**Backend runs on**: http://127.0.0.1:8000

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
**Frontend runs on**: http://localhost:5173

## 🔌 API Endpoints

### Notes API
- `GET /api/notes` - List all notes with AI summaries
- `POST /api/notes` - Create note (triggers background AI summarization)
- `GET /api/notes/{id}` - Get individual note details
- `PUT /api/notes/{id}` - Update note content with optional summary regeneration
- `DELETE /api/notes/{id}` - Delete note permanently

### Notebooks API
- `GET /api/notebooks` - List all notebooks with note counts
- `POST /api/notebooks` - Create new notebook
- `GET /api/notebooks/{id}` - Get notebook with associated notes
- `PUT /api/notebooks/{id}` - Update notebook title
- `DELETE /api/notebooks/{id}` - Delete notebook (preserves notes)
- `POST /api/notebooks/{notebook_id}/notes/{note_id}` - Add note to notebook
- `DELETE /api/notebooks/{notebook_id}/notes/{note_id}` - Remove note from notebook

### Search API
- `GET /api/search?q={query}` - Search notes by content and AI summaries

### Notifications API
- `POST /api/notifications/subscribe` - Register browser for push notifications
- `POST /api/notifications/test` - Send immediate test notification

### Health/Status
- `GET /` - API status message
- `GET /health` - Health check endpoint

## 🔔 Notification System Details

### How It Works
1. **User enables notifications** → Browser requests permission via service worker
2. **VAPID subscription created** → Stored in push_subscriptions table
3. **Daily scheduler runs** → APScheduler triggers at 13:30 UTC (7 PM India)
4. **Random note selected** → From notes with ai_summary (round-robin)
5. **Push notification sent** → Via Google FCM using pywebpush

### Testing Notifications
```bash
# Test immediate notification
curl -X POST http://localhost:8000/api/notifications/test

# Expected response
{"message":"Test notification sent","successful_sends":1,"failed_sends":0,"note_id":1}
```

### VAPID Configuration
- **Private Key**: Configured in `backend/app/push_service.py`
- **Public Key**: Embedded in frontend notification setup
- **Claims**: Set to `mailto:your-email@example.com` for VAPID compliance

## 🎨 Styling System

### Custom CSS Classes (defined in `src/index.css`)
```css
.note-card          /* Gray card with hover effects */
.btn-primary        /* Orange buttons */
.btn-secondary      /* Gray buttons */
.input-field        /* Form inputs with orange focus */
.floating-add-button /* Fixed position + button */
```

### Color Scheme
- **Background**: Black (#000000)
- **Cards**: Gray-900 (#111827)
- **Borders**: Gray-800 (#1F2937)
- **Primary**: Orange-500 (#F97316)
- **Text**: White/Gray spectrum

## 📦 Key Dependencies

### Frontend
```json
{
  "react": "^19.2.0",
  "react-router-dom": "^7.9.6",
  "tailwindcss": "^3.4.0",
  "vite": "^7.2.2",
  "vite-plugin-pwa": "^1.1.0"
}
```

### Backend
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.0
google-generativeai>=0.3.0
apscheduler>=3.10.0
pywebpush>=1.14.0
python-dotenv>=1.0.0
```

## 🔧 Development Commands

```bash
# Backend
source venv/bin/activate && python main.py

# Frontend
npm run dev

# Build & Check
npm run build
npm run lint
```

## 📊 Current Status

**✅ Fully Functional Features:**
- **Notes Management**: Create, edit, delete, view with AI summaries
- **Notebooks Organization**: Many-to-many relationships with batch operations
- **Search System**: Real-time keyword search with highlighting
- **Bottom Navigation**: Three-tab navigation system
- **Multi-select Operations**: Batch add/remove notes from notebooks
- **Push Notifications**: Daily reminders at 7 PM India time
- **PWA Functionality**: Installable with service worker
- **Dark Theme UI**: Complete orange-accent design system

**Database**: Notes, notebooks, and push subscriptions fully operational  
**Backend**: FastAPI with SQLAlchemy ORM and APScheduler  
**Frontend**: React 19 with TypeScript and Tailwind CSS  
**AI Integration**: Google Gemini API for note summarization  

## 🔍 Known Behavior

### Notification Display
- **Chrome browser tabs**: Notifications show when tab is active
- **PWA installed app**: Enhanced notification privileges
- **Background notifications**: Work when app is closed (PWA mode)
- **Test notifications**: Available via API endpoint

### AI Processing
- **Async generation**: Summaries generate in background after note creation
- **Polling updates**: Frontend checks every 2 seconds for summary completion
- **Fallback chain**: Multiple Gemini models ensure high availability

## 🎯 Key Features Summary

### 📱 User Experience
- **Three-tab bottom navigation** for seamless organization
- **Floating action buttons** with consistent design patterns
- **Multi-select operations** with checkboxes and batch actions
- **Inline editing** with keyboard shortcuts (Enter/Escape)
- **Real-time search** with 300ms debounced input

### 🔧 Technical Highlights
- **Many-to-many database relationships** for flexible note organization
- **Background AI processing** with polling and retry logic
- **Service worker** for push notifications and PWA functionality
- **Responsive design** optimized for mobile and desktop
- **Modern React patterns** with Context API and TypeScript

### 🚀 Production Ready
- **Complete CRUD operations** for notes and notebooks
- **Robust error handling** with user feedback
- **Dark theme optimization** with accessibility considerations
- **API documentation** with comprehensive endpoint coverage
- **Database schema** designed for scalability

---

**A comprehensive knowledge management PWA with AI-powered insights, flexible organization, and smart notifications.**