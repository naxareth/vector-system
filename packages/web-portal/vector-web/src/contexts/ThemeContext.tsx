'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // If we're on pages that should never show dark mode, force light for this page
    const excludedPaths = ['/', '/login', '/register'];
    const path = window.location.pathname;
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (excludedPaths.includes(path)) {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      return;
    }

    // Check localStorage for saved theme preference
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    // If the current page is in the excluded list, do not apply dark class here
    const excludedPaths = ['/', '/login', '/register'];
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (excludedPaths.includes(path)) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values instead of throwing during SSR
    if (typeof window === 'undefined') {
      return { theme: 'light' as Theme, toggleTheme: () => {} };
    }
    // During client-side hot-reload or unexpected render order the provider
    // might not be mounted yet. Return a safe default instead of throwing
    // so components can render until the real provider is available.
    // Log a warning once to aid debugging.
    if (process.env.NODE_ENV !== 'production') {
       
      console.warn('useTheme called without a ThemeProvider — falling back to light theme');
    }
    return { theme: 'light' as Theme, toggleTheme: () => {} };
  }
  return context;
}
