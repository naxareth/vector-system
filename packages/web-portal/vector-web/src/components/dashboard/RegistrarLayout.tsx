'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import SessionTimeout from '../shared/SessionTimeout';
import RegistrarTour from '../shared/RegistrarTour';

interface RegistrarLayoutProps {
  children: React.ReactNode;
}

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
}

/* ── Page title map ─────────────────────────────────────────────────────── */
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/registrar/dashboard': { title: 'Issue Certificate', subtitle: 'Create and sign new blockchain credentials' },
  '/registrar/students':  { title: 'Issued Records', subtitle: 'View and track all certificates you\'ve issued' },
  '/registrar/help':      { title: 'Help & Support', subtitle: 'Guides, FAQs, and contact information' },
};

function RegistrarShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dateStr, setDateStr] = useState('');

  const pathname = usePathname();
  const router = useRouter();

  let theme: 'light' | 'dark' = 'light';
  let toggleTheme = () => {};
  try {
    const ctx = useTheme();
    theme = ctx.theme;
    toggleTheme = ctx.toggleTheme;
  } catch {}

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace('/login'); return; }

        const { data: profile } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role !== 'registrar' && profile?.role !== 'super_admin') {
          router.replace('/student/dashboard');
          return;
        }

        setUser({
          full_name: profile?.full_name || 'Registrar Admin',
          email: session.user.email || 'admin@vector.edu',
          role: profile.role,
        });
      } catch (error) {
        console.error('Error loading registrar profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
    setDateStr(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  }, [router]);

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setIsLogoutDialogOpen(false);
    router.push('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'R';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const navigation = [
    {
      name: 'Issue Certificate',
      href: '/registrar/dashboard',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Issued Records',
      href: '/registrar/students',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      name: 'Help & Support',
      href: '/registrar/help',
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const pageInfo = PAGE_TITLES[pathname] ?? { title: 'Registrar Portal', subtitle: '' };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0F19]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#06B4C9] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-[#94A3B8] text-sm font-medium">Loading Registrar Portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] flex">
      <SessionTimeout />
      <RegistrarTour />

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        id="reg-tour-nav"
        className={`
          fixed top-0 left-0 z-40 h-screen w-64
          bg-white dark:bg-[#0E1220] border-r border-gray-200 dark:border-[#1E2536]
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200 dark:border-[#1E2536]">
            <Link href="/registrar/dashboard" className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Image src="/logo/VectorLogo.png" alt="Vector Logo" width={32} height={32} className="rounded-lg flex-shrink-0" style={{ width: 'auto', height: 'auto' }} />
                <span className="text-xl font-bold text-[#011018] dark:text-white whitespace-nowrap overflow-hidden transition-opacity duration-200">VECTOR</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium relative transition-all ${
                    isActive
                      ? 'text-[#06B4C9] bg-[#06B4C9]/10 dark:bg-[#06B4C9]/10'
                      : 'text-gray-600 dark:text-[#94A3B8] hover:bg-gray-100/60 dark:hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-gray-900 dark:bg-[#06B4C9] rounded-r-full" />
                  )}
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-[#1E2536]">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-lg justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 bg-[#06B4C9] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs">
                  {getInitials(user?.full_name || '')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-[#64748B] truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsLogoutDialogOpen(true)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors flex-shrink-0"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-64">

        {/* ══ TOP BAR ══════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 bg-white dark:bg-[#0E1220] border-b border-gray-200 dark:border-[#1E2536]">
          <div id="reg-tour-welcome" className="absolute top-0 left-0 w-full h-20 pointer-events-none" />

          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-16">

            {/* LEFT — hamburger (mobile) + page title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-[#94A3B8] transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2 mr-2">
                <div className="w-7 h-7 bg-gray-900 dark:bg-[#06B4C9]/15 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-[#06B4C9] font-bold text-sm">V</span>
                </div>
              </div>


            </div>

            {/* RIGHT — actions cluster */}
            <div className="flex items-center gap-1.5">

              {/* Date — hidden on small */}
              <div className="hidden md:flex items-center gap-1.5 mr-2">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span className="text-xs text-gray-500 dark:text-slate-500 whitespace-nowrap">{dateStr}</span>
              </div>

              <div className="h-5 w-px bg-gray-200 dark:bg-[#1E2536] hidden md:block mx-1" />

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-lg text-gray-500 dark:text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                {theme === 'dark' ? (
                  <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>

            </div>
          </div>
        </header>
        {/* ══ END TOP BAR ══════════════════════════════════════════════ */}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutDialogOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131825] rounded-xl max-w-sm w-full p-6 border border-gray-200 dark:border-[#1E2536]">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sign out?</h3>
                <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-0.5">You'll be returned to the login page.</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setIsLogoutDialogOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#283042] text-sm font-medium text-gray-700 dark:text-[#CBD5E1] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegistrarLayout({ children }: RegistrarLayoutProps) {
  return (
    <ThemeProvider>
      <RegistrarShell>{children}</RegistrarShell>
    </ThemeProvider>
  );
}