'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isCollapsed?: boolean;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  let theme: 'light' | 'dark' = 'light';
  let toggleTheme = () => {};
  
  try {
    const themeContext = useTheme();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    theme = themeContext.theme;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toggleTheme = themeContext.toggleTheme;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {}

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Determine if sidebar should be expanded (not collapsed OR hovered)
  const isExpanded = !isCollapsed || isHovered;

  const navigationSections = [
    {
      label: 'MENU',
      items: [
        {
          name: 'Dashboard',
          href: '/student/dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          name: 'Verified Skills',
          href: '/student/skills',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Career Co-Pilot',
          href: '/student/coach',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
        },
        {
          name: 'Credentials',
          href: '/student/credentials',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'PROFILE',
      items: [
        {
          name: 'Resume',
          href: '/student/cvr',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Explore Courses',
          href: '/student/explore-courses',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          name: 'Help & Support',
          href: '/student/help',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#131825] rounded-lg shadow-md border border-gray-200 dark:border-[#1E2536]"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar with Tour ID */}
      <div 
        id="tour-sidebar" 
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 h-screen bg-[#FFFFFF] dark:bg-[#0E1220] border-r border-gray-200 dark:border-[#1E2536] flex flex-col z-40 transition-all duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-[#1E2536]">
          <div className="flex items-center gap-2">
            <Image src="/logo/VectorLogo.png" alt="Vector Logo" width={32} height={32} className="rounded-lg flex-shrink-0" style={{ width: 'auto', height: 'auto' }} />
            {isExpanded && (
              <span className="text-xl font-bold text-[#011018] dark:text-white whitespace-nowrap overflow-hidden transition-opacity duration-200">
                VECTOR
              </span>
            )}
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {navigationSections.map((section) => (
            <div key={section.label} className="space-y-1">
              {/* Section Label */}
              {isExpanded && (
                <h3 className="px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  {section.label}
                </h3>
              )}

              {/* Section Items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // ✅ Fix: only compute isActive after mount so server and client
                  // render identical HTML on first pass (all links render as inactive).
                  // After mount, the correct active link highlights instantly.
                  const isActive = mounted && pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 transition-all relative rounded-lg ${
                        isActive
                          ? 'text-[#06B4C9] dark:bg-[#06B4C9]/10'
                          : 'text-gray-900 dark:text-[#94A3B8] hover:bg-gray-100/60 dark:hover:bg-white/5'
                      }`}
                      title={!isExpanded ? item.name : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-[#011018] dark:bg-[#06B4C9] rounded-r-full" />
                      )}
                      <span className="flex-shrink-0">
                        {item.icon}
                      </span>
                      {isExpanded && (
                        <span className="font-medium whitespace-nowrap overflow-hidden">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}