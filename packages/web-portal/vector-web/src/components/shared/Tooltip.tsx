import React, { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  return (
    <div className="group relative flex items-center">
      {children}
      
      {/* Tooltip Bubble */}
      <div className={`
        absolute ${positionClasses[position]} 
        z-50 w-max max-w-xs px-3 py-1.5 
        text-xs font-medium text-white bg-gray-900 
        rounded-lg opacity-0 
        group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
      `}>
        {content}
      </div>
    </div>
  );
}