import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        glass-card
        p-5 sm:p-6
        rounded-2xl
        bg-white/90
        backdrop-blur-md
        border border-apricot-200
        hover:border-apricot-400
        hover:shadow-xl hover:shadow-apricot-500/10
        transition-all duration-200
        ${className}
      `}
    >
      {children}
    </div>
  );
}
