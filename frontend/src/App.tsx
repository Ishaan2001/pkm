import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotesProvider } from './contexts/NotesContext';
import Home from './pages/Home';
import NoteView from './pages/NoteView';

function App() {
  return (
    <NotesProvider>
      <Router>
        <div className="min-h-screen bg-primary-bg">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/note/:id" element={<NoteView />} />
          </Routes>
        </div>
      </Router>
    </NotesProvider>
  )
}

export default App
