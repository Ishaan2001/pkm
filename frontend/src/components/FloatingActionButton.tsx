import React from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-20 right-8 z-50 group">
      {/* Ripple effect background */}
      <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20 scale-125" />
      <div className="absolute inset-0 bg-orange-500 rounded-full animate-pulse opacity-30" />
      
      <button
        onClick={onClick}
        className="relative w-16 h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center group-hover:rotate-90"
        aria-label="Create new note"
      >
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-sm" />
        
        <svg 
          className="w-7 h-7 relative z-10 transition-transform duration-300 group-hover:scale-110" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900/90 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap backdrop-blur-sm">
        Create Note
        <div className="absolute top-full right-4 w-2 h-2 bg-gray-900/90 transform rotate-45" />
      </div>
    </div>
  );
};

export default FloatingActionButton;