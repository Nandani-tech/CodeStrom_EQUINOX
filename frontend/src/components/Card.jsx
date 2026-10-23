import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        glass-card
        p-5 sm:p-6
        rounded-2xl
        bg-white/5
        backdrop-blur-md
        border border-white/10
        hover:border-warm-amber-400/30
        hover:shadow-lg hover:shadow-warm-amber-500/5
        transition-all duration-200
        ${className}
      `}
    >
      {children}
    </div>
  );
}
