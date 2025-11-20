import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import FloatingActionButton from '../components/FloatingActionButton';

interface Notebook {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  note_count?: number;
}

const Notebooks: React.FC = () => {
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Dropdown and editing state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [editingNotebookId, setEditingNotebookId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingNotebook, setDeletingNotebook] = useState<Notebook | null>(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };

    if (openDropdownId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openDropdownId]);

  const fetchNotebooks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notebooks');
      if (response.ok) {
        const data = await response.json();
        setNotebooks(data);
      }
    } catch (error) {
      console.error('Failed to fetch notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNotebook = async () => {
    if (!newNotebookTitle.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('http://localhost:8000/api/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newNotebookTitle.trim() }),
      });

      if (response.ok) {
        const newNotebook = await response.json();
        setNotebooks([...notebooks, newNotebook]);
        setNewNotebookTitle('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create notebook:', error);
    } finally {
      setCreating(false);
    }
  };

  const startRename = (notebook: Notebook) => {
    setEditingNotebookId(notebook.id);
    setEditingTitle(notebook.title);
    setOpenDropdownId(null);
  };

  const cancelRename = () => {
    setEditingNotebookId(null);
    setEditingTitle('');
  };

  const saveRename = async (notebookId: number) => {
    if (!editingTitle.trim()) return;

    try {
      const response = await fetch(`http://localhost:8000/api/notebooks/${notebookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });

      if (response.ok) {
        const updatedNotebook = await response.json();
        setNotebooks(notebooks.map(nb => nb.id === notebookId ? updatedNotebook : nb));
        setEditingNotebookId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('Failed to rename notebook:', error);
    }
  };

  const confirmDelete = (notebook: Notebook) => {
    setDeletingNotebook(notebook);
    setShowDeleteModal(true);
    setOpenDropdownId(null);
  };

  const deleteNotebook = async () => {
    if (!deletingNotebook) return;

    try {
      const response = await fetch(`http://localhost:8000/api/notebooks/${deletingNotebook.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotebooks(notebooks.filter(nb => nb.id !== deletingNotebook.id));
        setShowDeleteModal(false);
        setDeletingNotebook(null);
      }
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pb-20">
        <div className="bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-800">
          <LoadingSpinner />
          <p className="text-gray-400 mt-4 text-center">Loading notebooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Notebooks</h1>
            <div className="ml-auto text-sm text-gray-400">
              {notebooks.length} {notebooks.length === 1 ? 'notebook' : 'notebooks'}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {notebooks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No notebooks yet</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Create your first notebook to organize your notes by topic, project, or theme.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Notebook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all duration-200 hover:shadow-lg group relative"
              >
                {/* Three dots menu */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === notebook.id ? null : notebook.id);
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  {openDropdownId === notebook.id && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(notebook);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(notebook);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Card content - clickable area */}
                <div 
                  onClick={() => editingNotebookId !== notebook.id && navigate(`/notebooks/${notebook.id}`)}
                  className="flex flex-col h-full cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-4 pr-8">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Title - editable when in edit mode */}
                  {editingNotebookId === notebook.id ? (
                    <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="input-field text-lg font-semibold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveRename(notebook.id);
                          } else if (e.key === 'Escape') {
                            cancelRename();
                          }
                        }}
                        onBlur={() => saveRename(notebook.id)}
                      />
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-orange-200 transition-colors pr-8">
                      {notebook.title}
                    </h3>
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{notebook.note_count || 0} notes</span>
                      <span>{formatDate(notebook.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={() => setShowCreateModal(true)} />

      {/* Create Notebook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Create Notebook</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notebook Title
                </label>
                <input
                  type="text"
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  className="input-field"
                  placeholder="Enter notebook title..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createNotebook();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={createNotebook}
                  disabled={creating || !newNotebookTitle.trim()}
                  className="btn-primary flex-1 justify-center"
                >
                  {creating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Notebook?</h3>
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete "{deletingNotebook.title}"?
              </p>
              <p className="text-gray-400 text-sm mb-6">
                The notes inside will not be deleted, only the notebook organization.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingNotebook(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteNotebook}
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

export default Notebooks;