import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotesProvider } from './contexts/NotesContext';
import Home from './pages/Home';
import NoteView from './pages/NoteView';
import Notebooks from './pages/Notebooks';
import NotebookDetail from './pages/NotebookDetail';
import Search from './pages/Search';
import BottomNavigation from './components/BottomNavigation';

function App() {
  return (
    <NotesProvider>
      <Router>
        <div className="min-h-screen bg-black">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/note/:id" element={<NoteView />} />
            <Route path="/notebooks" element={<Notebooks />} />
            <Route path="/notebooks/:id" element={<NotebookDetail />} />
            <Route path="/search" element={<Search />} />
          </Routes>
          <BottomNavigation />
        </div>
      </Router>
    </NotesProvider>
  )
}

export default App
