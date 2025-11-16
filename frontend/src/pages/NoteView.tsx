import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '../contexts/NotesContext';
import type { Note } from '../types/note';
import LoadingSpinner from '../components/LoadingSpinner';

const NoteView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNoteById, updateNote, deleteNote } = useNotes();
  
  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [regenerateSummary, setRegenerateSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      const foundNote = getNoteById(parseInt(id));
      if (foundNote) {
        setNote(foundNote);
        setEditContent(foundNote.content);
      } else {
        navigate('/');
      }
    }
  }, [id, getNoteById, navigate]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!note) return;
    
    setSaving(true);
    try {
      const updatedNote = await updateNote(note.id, {
        content: editContent,
        regenerate_summary: regenerateSummary
      });
      setNote(updatedNote);
      setIsEditing(false);
      setRegenerateSummary(false);
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(note?.content || '');
    setIsEditing(false);
    setRegenerateSummary(false);
  };

  const handleDelete = async () => {
    if (!note) return;
    
    try {
      await deleteNote(note.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const formatDate = (dateString: string) => {
    // Handle various timestamp formats from backend
    let date: Date;
    
    // If it's already an ISO string with Z, use it directly
    if (dateString.includes('Z')) {
      date = new Date(dateString);
    } 
    // If it's a timestamp without timezone info, assume it's UTC (from our backend)
    else if (!dateString.includes('+') && !dateString.includes('-', 10)) {
      date = new Date(dateString + 'Z');
    }
    // Otherwise, parse as is
    else {
      date = new Date(dateString);
    }
    
    return date.toLocaleDateString(undefined, { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!note) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-800">
          <LoadingSpinner />
          <p className="text-gray-400 mt-4 text-center">Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Knowledge Base</span>
            </button>
              
            <div className="flex items-center gap-3">
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="btn-primary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* AI Summary */}
        {note.ai_summary && (
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-200 mb-2">AI Summary</h3>
                <p className="text-orange-100 leading-relaxed">
                  {note.ai_summary}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Note Content */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {isEditing ? (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Edit Note</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input-field h-80 resize-none"
                    placeholder="Write your note here..."
                    autoFocus
                  />
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                    {editContent.length} characters
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regenerateSummary}
                      onChange={(e) => setRegenerateSummary(e.target.checked)}
                      className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-white font-medium">Regenerate AI summary</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1 justify-center"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Note Content</h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="whitespace-pre-wrap text-gray-100 leading-relaxed">
                  {note.content}
                </p>
              </div>
            </div>
          )}
          </div>

        {/* Metadata */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-gray-400 text-sm font-medium mb-1">Created</div>
              <div className="text-white text-sm font-semibold">{formatDate(note.created_at)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm font-medium mb-1">Last Modified</div>
              <div className="text-white text-sm font-semibold">{formatDate(note.updated_at)}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Note?</h3>
              <p className="text-gray-300 mb-6">This action cannot be undone. Your note and its AI summary will be permanently deleted.</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteView;