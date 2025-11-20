import React from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types/note';

interface NoteCardProps {
  note: Note;
  searchQuery?: string;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, searchQuery }) => {
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
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const highlightText = (text: string, query?: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-orange-500/30 text-orange-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };


  return (
    <Link to={`/note/${note.id}`} className="block">
      <div className="note-card p-4 space-y-3">
        
        {/* AI Summary Section */}
        {note.ai_summary ? (
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-orange-200 font-medium leading-relaxed">
                  {highlightText(truncateContent(note.ai_summary, 100), searchQuery)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-600 rounded-md flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
              </div>
              <p className="text-sm text-gray-400 font-medium italic">
                Generating AI summary...
              </p>
            </div>
          </div>
        )}
        
        {/* Note Content */}
        <div>
          <p className="text-gray-100 text-base leading-relaxed line-clamp-3">
            {highlightText(truncateContent(note.content, note.ai_summary ? 120 : 160), searchQuery)}
          </p>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <span className="text-sm text-gray-400">
            {formatDate(note.updated_at)}
          </span>
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
};

export default NoteCard;