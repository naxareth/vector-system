'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface StatusDropdownProps {
  value: string;
  onChange: (newStatus: string) => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; darkBg: string; text: string; darkText: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50 border-amber-200',
    darkBg: 'dark:bg-amber-950/40 dark:border-amber-800/50',
    text: 'text-amber-800',
    darkText: 'dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  reviewing: {
    label: 'Reviewing',
    bg: 'bg-blue-50 border-blue-200',
    darkBg: 'dark:bg-blue-950/40 dark:border-blue-800/50',
    text: 'text-blue-800',
    darkText: 'dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  interview: {
    label: 'Interview',
    bg: 'bg-purple-50 border-purple-200',
    darkBg: 'dark:bg-purple-950/40 dark:border-purple-800/50',
    text: 'text-purple-800',
    darkText: 'dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  offered: {
    label: 'Offered',
    bg: 'bg-emerald-50 border-emerald-200',
    darkBg: 'dark:bg-emerald-950/40 dark:border-emerald-800/50',
    text: 'text-emerald-800',
    darkText: 'dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50 border-red-200',
    darkBg: 'dark:bg-red-950/40 dark:border-red-800/50',
    text: 'text-red-800',
    darkText: 'dark:text-red-300',
    dot: 'bg-red-500',
  },
};

export default function StatusDropdown({ value, onChange, disabled }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = STATUS_CONFIG[value] || {
    label: value,
    bg: 'bg-gray-50 border-gray-200',
    darkBg: 'dark:bg-gray-800 dark:border-gray-700',
    text: 'text-gray-800',
    darkText: 'dark:text-gray-200',
    dot: 'bg-gray-400',
  };

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = 5 * 32 + 8; // 5 options ~32px each + padding
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    setMenuPos({
      top: openAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - 144), // 144 = w-36 = 9rem
    });
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) updatePosition();
    setIsOpen((o) => !o);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#06B4C9] disabled:opacity-50 cursor-pointer ${current.bg} ${current.darkBg} ${current.text} ${current.darkText}`}
      >
        <span className={`w-2 h-2 rounded-full ${current.dot}`} />
        <span>{current.label}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-36 bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#283042] rounded-xl shadow-2xl py-1 overflow-hidden animate-fadeIn"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const isSelected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-gray-100 dark:bg-[#1E2536] text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span>{cfg.label}</span>
                  </div>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
