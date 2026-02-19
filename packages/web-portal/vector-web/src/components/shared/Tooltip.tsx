import React, { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="group relative flex items-center">
      {children}
      
      {/* Tooltip Bubble */}
      <div className={`
        absolute ${positionClasses[position]} 
        z-50 w-max max-w-xs px-3 py-1.5 
        text-xs font-medium text-white bg-gray-900 
        rounded-lg shadow-xl opacity-0 
        group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
      `}>
        {content}
        {/* Little Arrow */}
        <div className={`
          absolute w-2 h-2 bg-gray-900 rotate-45
          ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
          ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
        `}></div>
      </div>
    </div>
  );
}