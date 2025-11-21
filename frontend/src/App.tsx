import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotesProvider } from './contexts/NotesContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import NoteView from './pages/NoteView';
import Notebooks from './pages/Notebooks';
import NotebookDetail from './pages/NotebookDetail';
import Search from './pages/Search';
import BottomNavigation from './components/BottomNavigation';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-black">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <NotesProvider>
                  <Home />
                  <BottomNavigation />
                </NotesProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/note/:id" element={
              <ProtectedRoute>
                <NotesProvider>
                  <NoteView />
                  <BottomNavigation />
                </NotesProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/notebooks" element={
              <ProtectedRoute>
                <NotesProvider>
                  <Notebooks />
                  <BottomNavigation />
                </NotesProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/notebooks/:id" element={
              <ProtectedRoute>
                <NotesProvider>
                  <NotebookDetail />
                  <BottomNavigation />
                </NotesProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/search" element={
              <ProtectedRoute>
                <NotesProvider>
                  <Search />
                  <BottomNavigation />
                </NotesProvider>
              </ProtectedRoute>
            } />
            
            {/* Redirect any unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
