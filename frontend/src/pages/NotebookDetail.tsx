import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '../contexts/NotesContext';
import NoteCard from '../components/NoteCard';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Note } from '../types/note';

interface Notebook {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  notes: Note[];
}

const NotebookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notes: allNotes } = useNotes();
  
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isManaging, setIsManaging] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'create' | 'existing'>('create');
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [selectedNotesToAdd, setSelectedNotesToAdd] = useState<Set<number>>(new Set());
  const [isAddingNotes, setIsAddingNotes] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchNotebook();
    }
  }, [id]);

  useEffect(() => {
    if (notebook && allNotes.length > 0) {
      // Find notes that are NOT in this notebook
      const notebookNoteIds = new Set(notebook.notes.map(note => note.id));
      const available = allNotes.filter(note => !notebookNoteIds.has(note.id));
      setAvailableNotes(available);
    }
  }, [notebook, allNotes]);

  const fetchNotebook = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/notebooks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setNotebook(data);
      } else if (response.status === 404) {
        navigate('/notebooks');
      }
    } catch (error) {
      console.error('Failed to fetch notebook:', error);
      navigate('/notebooks');
    } finally {
      setLoading(false);
    }
  };


  const toggleNoteSelection = (noteId: number) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const selectAllNotes = () => {
    if (!notebook) return;
    const allNoteIds = new Set(notebook.notes.map(note => note.id));
    setSelectedNotes(allNoteIds);
  };

  const clearSelection = () => {
    setSelectedNotes(new Set());
  };

  const removeSelectedNotes = async () => {
    if (!notebook || selectedNotes.size === 0) return;

    try {
      const promises = Array.from(selectedNotes).map(noteId =>
        fetch(`http://localhost:8000/api/notebooks/${notebook.id}/notes/${noteId}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(promises);
      
      // Refresh notebook data
      await fetchNotebook();
      setSelectedNotes(new Set());
      setIsManaging(false);
    } catch (error) {
      console.error('Failed to remove notes from notebook:', error);
    }
  };

  const addNoteToNotebook = async (noteId: number) => {
    if (!notebook) return;

    try {
      await fetch(`http://localhost:8000/api/notebooks/${notebook.id}/notes/${noteId}`, {
        method: 'POST',
      });
      
      // Refresh notebook data
      await fetchNotebook();
    } catch (error) {
      console.error('Failed to add note to notebook:', error);
    }
  };

  const toggleNoteToAdd = (noteId: number) => {
    const newSelected = new Set(selectedNotesToAdd);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotesToAdd(newSelected);
  };

  const selectAllAvailableNotes = () => {
    const allAvailableIds = new Set(availableNotes.map(note => note.id));
    setSelectedNotesToAdd(allAvailableIds);
  };

  const clearSelectedNotes = () => {
    setSelectedNotesToAdd(new Set());
  };

  const addSelectedNotesToNotebook = async () => {
    if (!notebook || selectedNotesToAdd.size === 0) return;

    setIsAddingNotes(true);
    try {
      const promises = Array.from(selectedNotesToAdd).map(noteId =>
        fetch(`http://localhost:8000/api/notebooks/${notebook.id}/notes/${noteId}`, {
          method: 'POST',
        })
      );

      await Promise.all(promises);
      
      // Refresh notebook data
      await fetchNotebook();
      
      // Clear selection but keep modal open
      setSelectedNotesToAdd(new Set());
    } catch (error) {
      console.error('Failed to add notes to notebook:', error);
    } finally {
      setIsAddingNotes(false);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedNotesToAdd(new Set());
    setAddMode('create');
  };

  const handleNoteClick = (note: Note) => {
    if (isManaging) {
      toggleNoteSelection(note.id);
    } else {
      navigate(`/note/${note.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pb-20">
        <div className="bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-800">
          <LoadingSpinner />
          <p className="text-gray-400 mt-4 text-center">Loading notebook...</p>
        </div>
      </div>
    );
  }

  if (!notebook) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/notebooks')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Notebooks</span>
            </button>

            <div className="flex items-center gap-3">
              {!isManaging && (
                <button
                  onClick={() => setIsManaging(true)}
                  className="btn-secondary text-sm"
                >
                  Modify
                </button>
              )}
              
              {isManaging && (
                <button
                  onClick={() => {
                    setIsManaging(false);
                    setSelectedNotes(new Set());
                  }}
                  className="btn-secondary text-sm"
                >
                  Done
                </button>
              )}

              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Note
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="flex items-center justify-between flex-1">
              <h1 className="text-xl font-semibold text-white">{notebook.title}</h1>
              <div className="text-sm text-gray-400">
                {notebook.notes.length} {notebook.notes.length === 1 ? 'note' : 'notes'}
              </div>
            </div>
          </div>

          {isManaging && notebook.notes.length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800">
              <button
                onClick={selectAllNotes}
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                Clear
              </button>
              <div className="flex-1" />
              <span className="text-sm text-gray-400">
                {selectedNotes.size} selected
              </span>
              {selectedNotes.size > 0 && (
                <button
                  onClick={removeSelectedNotes}
                  className="btn-secondary text-sm text-red-400 hover:text-red-300"
                >
                  Remove from Notebook
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {notebook.notes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No notes in this notebook</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Add your first note to "{notebook.title}" to get started organizing your knowledge.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add First Note
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notebook.notes.map((note) => (
              <div key={note.id} className="relative">
                {isManaging && (
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedNotes.has(note.id)}
                      onChange={() => toggleNoteSelection(note.id)}
                      className="w-5 h-5 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                    />
                  </div>
                )}
                <div 
                  onClick={() => handleNoteClick(note)}
                  className={`cursor-pointer ${isManaging ? 'pl-8' : ''}`}
                >
                  <NoteCard note={note} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Add Note to "{notebook.title}"</h3>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setAddMode('create')}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                  addMode === 'create' 
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <div className="font-medium">Create New Note</div>
                  <div className="text-sm opacity-75">Write a new note for this notebook</div>
                </div>
              </button>

              <button
                onClick={() => setAddMode('existing')}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                  addMode === 'existing' 
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="font-medium">Add Existing Note</div>
                  <div className="text-sm opacity-75">Select from your existing notes</div>
                </div>
              </button>
            </div>

            {addMode === 'existing' && (
              <div className="space-y-4">
                {availableNotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>All your notes are already in this notebook!</p>
                  </div>
                ) : (
                  <>
                    {/* Selection controls */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={selectAllAvailableNotes}
                          className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          onClick={clearSelectedNotes}
                          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="text-sm text-gray-400">
                        {selectedNotesToAdd.size} of {availableNotes.length} selected
                      </div>
                    </div>

                    {/* Notes list with checkboxes */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableNotes.map((note) => (
                        <label
                          key={note.id}
                          className="flex items-start gap-3 p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNotesToAdd.has(note.id)}
                            onChange={() => toggleNoteToAdd(note.id)}
                            className="w-5 h-5 mt-1 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white line-clamp-2 mb-2">{note.content}</p>
                            {note.ai_summary && (
                              <p className="text-gray-400 text-sm line-clamp-1">{note.ai_summary}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeAddModal}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              {addMode === 'create' && (
                <button
                  onClick={() => {
                    closeAddModal();
                    // Navigate to create note (will implement this later)
                    navigate('/note/new');
                  }}
                  className="btn-primary flex-1"
                >
                  Create Note
                </button>
              )}
              {addMode === 'existing' && availableNotes.length > 0 && (
                <button
                  onClick={addSelectedNotesToNotebook}
                  disabled={selectedNotesToAdd.size === 0 || isAddingNotes}
                  className="btn-primary flex-1 justify-center"
                >
                  {isAddingNotes ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Adding...</span>
                    </div>
                  ) : (
                    `Add Selected (${selectedNotesToAdd.size})`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebookDetail;