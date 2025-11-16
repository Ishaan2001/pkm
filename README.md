# Knowledge Base PWA

A modern note-taking Progressive Web App with AI-powered summaries and daily push notifications. Built with React, FastAPI, and Google Gemini AI.

## ✨ Features

### 📝 Note Management
- **Create, edit, and delete notes** with a clean, dark-themed interface
- **Real-time note editing** with character counters and autosave
- **Note browsing** with search and filtering capabilities

### 🤖 AI Integration
- **AI-powered summaries** using Google Gemini for every note
- **Smart polling system** that waits for AI processing completion
- **Regenerate summaries** option when editing notes
- **Optimized prompts** for concise, actionable insights

### 🔔 Push Notifications
- **Daily reminders at 7 PM India time** with AI summaries
- **Real browser push notifications** using Web Push Protocol
- **Smart subscription management** with automatic cleanup
- **Round-robin note selection** ensures variety in reminders
- **Click-to-navigate** directly to specific notes

### 📱 Progressive Web App
- **Installable** as a native app on mobile and desktop
- **Service worker** for offline functionality and push notifications
- **App manifest** with proper icons and theming
- **Responsive design** that works on all devices

### 🎨 Modern UI/UX
- **Dark theme** with orange accent colors (#F97316)
- **Clean design language** with consistent spacing and typography
- **Smooth animations** and transitions throughout
- **Orange-themed loading indicators** and progress states

## 🏗️ Architecture

### Frontend (`/frontend/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS v3.4.0 with custom dark theme
- **State Management**: React Context API for notes and app state
- **Routing**: React Router v7 for navigation
- **PWA**: Service worker for push notifications and caching

### Backend (`/backend/`)
- **Framework**: FastAPI with Python 3.13
- **Database**: SQLAlchemy ORM with SQLite
- **AI Service**: Google Gemini API (2.5-flash, 2.5-pro, 2.0-flash models)
- **Scheduler**: APScheduler for daily notification reminders
- **Push Notifications**: pywebpush with VAPID authentication
- **CORS**: Configured for frontend integration

## 🚀 Getting Started

### Prerequisites
- **Python 3.13+**
- **Node.js 18+**
- **Google Gemini API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pkm_pwa
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start Backend Server**
   ```bash
   cd backend
   source venv/bin/activate
   python main.py
   ```
   Backend runs on: http://127.0.0.1:8000

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on: http://localhost:5174

### Building for Production

```bash
cd frontend
npm run build
npm run typecheck
npm run lint
```

## 📊 Database Schema

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

## 🔌 API Endpoints

### Notes
- `GET /api/notes` - List all notes
- `POST /api/notes` - Create new note (triggers AI summary)
- `GET /api/notes/{id}` - Get specific note
- `PUT /api/notes/{id}` - Update note with optional AI regeneration
- `DELETE /api/notes/{id}` - Delete note

### Notifications
- `POST /api/notifications/subscribe` - Register for push notifications
- `POST /api/notifications/test` - Send test notification

### Health
- `GET /health` - Health check endpoint

## 🔔 Notification System

### Daily Schedule
- **Time**: 7:00 PM India Standard Time (13:30 UTC)
- **Frequency**: Once per day
- **Content**: AI-generated note summaries
- **Selection**: Round-robin through all notes with summaries

### Testing
- **Manual Test**: `curl -X POST http://localhost:8000/api/notifications/test`
- **Browser Setup**: Enable notifications when prompted on first visit
- **Debugging**: Check browser dev tools → Application → Service Workers

## 🛠️ Technology Stack

### Frontend Dependencies
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.9.6",
  "tailwindcss": "^3.4.0",
  "vite-plugin-pwa": "^1.1.0",
  "typescript": "~5.9.3"
}
```

### Backend Dependencies
```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.0
google-generativeai>=0.3.0
pydantic>=2.8.0
apscheduler>=3.10.0
pywebpush>=1.14.0
ecdsa
```

## 🎨 Design System

### Colors
- **Primary Background**: `#000000` (Black)
- **Secondary Background**: `#111827` (Gray-900)
- **Accent**: `#F97316` (Orange-500)
- **Text**: `#FFFFFF` (White)
- **Muted Text**: `#9CA3AF` (Gray-400)

### Components
- **Cards**: Gray-900 background with gray-800 borders
- **Buttons**: Orange primary, gray secondary
- **Forms**: Dark inputs with orange focus states
- **Icons**: Consistent sizing and orange accents

## 📝 Development Notes

### Code Quality
- **TypeScript** for type safety throughout frontend
- **ESLint** configuration for code consistency
- **Tailwind CSS** for utility-first styling
- **Error boundaries** and proper error handling

### Performance
- **Lazy loading** for components and routes
- **Optimized AI polling** with exponential backoff
- **Service worker caching** for offline functionality
- **Database indexing** on frequently queried fields

### Security
- **CORS** properly configured for cross-origin requests
- **VAPID authentication** for secure push notifications
- **Input validation** with Pydantic schemas
- **Error sanitization** to prevent information leakage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini** for AI-powered note summarization
- **Tailwind CSS** for the utility-first CSS framework
- **FastAPI** for the modern Python web framework
- **React** for the component-based frontend architecture

---

**Built with ❤️ for better knowledge management and memory retention**