'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface HelpTipProps {
  /** The help text shown inside the tooltip bubble. */
  text: string;
  /** Override with custom JSX inside the bubble (takes priority over `text`). */
  children?: ReactNode;
  /** Size of the circled "?" icon in pixels. Default 16. */
  size?: number;
  /** Tooltip preferred position. Automatically flips if clipped. */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Contextual help icon — a small circled "?" that shows a tooltip on hover/tap.
 *
 * Usage:
 *   <label>Market Score <HelpTip text="How well your skills match current job demand." /></label>
 */
export default function HelpTip({
  text,
  children,
  size = 16,
  position = 'bottom',
}: HelpTipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside click (mobile)
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setVisible(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible]);

  const posMap: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowMap: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-[1px] border-t-white dark:border-t-[#283042] border-x-transparent border-b-transparent border-4',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-b-white dark:border-b-[#283042] border-x-transparent border-t-transparent border-4',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-[1px] border-l-white dark:border-l-[#283042] border-y-transparent border-r-transparent border-4',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-[1px] border-r-white dark:border-r-[#283042] border-y-transparent border-l-transparent border-4',
  };

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center ml-1 align-middle"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setVisible((v) => !v);
      }}
    >
      {/* Circled "?" icon */}
      <span
        className="inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-[#3B4968] text-gray-400 dark:text-[#64748B] hover:text-gray-600 dark:hover:text-[#94A3B8] hover:border-gray-400 dark:hover:border-[#64748B] cursor-help transition-colors select-none"
        style={{ width: size, height: size, fontSize: size * 0.6 }}
        role="img"
        aria-label="Help"
      >
        ?
      </span>

      {/* Tooltip bubble */}
      {visible && (
        <span
          className={`absolute z-[60] ${posMap[position]} w-max max-w-[280px] px-3.5 py-2.5 text-xs leading-relaxed font-medium rounded-lg shadow-xl pointer-events-none animate-fade-in bg-white text-gray-700 border border-gray-200 dark:bg-[#283042] dark:text-gray-100 dark:border-[#3B4968]`}
        >
          {children || text}
          {/* Arrow */}
          <span className={`absolute ${arrowMap[position]}`} />
        </span>
      )}
    </span>
  );
}
