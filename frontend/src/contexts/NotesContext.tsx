import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Note, NoteCreate, NoteUpdate } from '../types/note';
import { api } from '../services/api';

interface NotesContextType {
  notes: Note[];
  loading: boolean;
  error: string | null;
  createNote: (note: NoteCreate) => Promise<Note>;
  updateNote: (id: number, note: NoteUpdate) => Promise<Note>;
  deleteNote: (id: number) => Promise<void>;
  getNoteById: (id: number) => Note | undefined;
  refreshNotes: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Note[]>('/api/notes');
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (noteData: NoteCreate): Promise<Note> => {
    const newNote = await api.post<Note>('/api/notes', noteData);
    setNotes(prev => [newNote, ...prev]);
    
    // Poll for AI summary generation
    const pollForSummary = async (noteId: number, attempts = 0) => {
      const maxAttempts = 10; // Maximum 10 attempts (20 seconds)
      const delay = 2000; // Check every 2 seconds
      
      if (attempts >= maxAttempts) {
        return;
      }
      
      try {
        const updatedNote = await api.get<Note>(`/api/notes/${noteId}`);
        if (updatedNote.ai_summary) {
          // AI summary is ready, update the note in state
          setNotes(prev => prev.map(note => 
            note.id === noteId ? updatedNote : note
          ));
          return;
        }
      } catch (error) {
        console.error('Failed to check for AI summary:', error);
      }
      
      // Continue polling
      setTimeout(() => pollForSummary(noteId, attempts + 1), delay);
    };
    
    // Start polling for AI summary after a short delay
    setTimeout(() => pollForSummary(newNote.id), 1000);
    
    return newNote;
  };

  const updateNote = async (id: number, noteData: NoteUpdate): Promise<Note> => {
    const updatedNote = await api.put<Note>(`/api/notes/${id}`, noteData);
    setNotes(prev => prev.map(note => note.id === id ? updatedNote : note));
    
    // If regenerating summary, poll for the updated summary
    if (noteData.regenerate_summary) {
      const pollForSummary = async (noteId: number, attempts = 0) => {
        const maxAttempts = 10;
        const delay = 2000;
        
        if (attempts >= maxAttempts) {
          return;
        }
        
        try {
          const refreshedNote = await api.get<Note>(`/api/notes/${noteId}`);
          if (refreshedNote.ai_summary && refreshedNote.ai_summary !== updatedNote.ai_summary) {
            setNotes(prev => prev.map(note => 
              note.id === noteId ? refreshedNote : note
            ));
            return;
          }
        } catch (error) {
          console.error('Failed to check for regenerated AI summary:', error);
        }
        
        setTimeout(() => pollForSummary(noteId, attempts + 1), delay);
      };
      
      setTimeout(() => pollForSummary(id), 1000);
    }
    
    return updatedNote;
  };

  const deleteNote = async (id: number): Promise<void> => {
    await api.delete(`/api/notes/${id}`);
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const getNoteById = (id: number) => {
    return notes.find(note => note.id === id);
  };

  const refreshNotes = async () => {
    await fetchNotes();
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const contextValue: NotesContextType = {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    refreshNotes,
  };

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
};