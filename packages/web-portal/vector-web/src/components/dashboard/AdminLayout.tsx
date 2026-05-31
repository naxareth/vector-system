'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import SessionTimeout from '../shared/SessionTimeout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ThemeProvider>
      <AdminShell>{children}</AdminShell>
    </ThemeProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const pathname = usePathname();
  const router = useRouter();

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

        if (profile?.role !== 'super_admin') {
          router.replace('/login');
          return;
        }

        setUser({
          full_name: profile?.full_name || 'Super Administrator',
          email: session.user.email || 'admin@vector.edu',
          role: profile?.role || 'super_admin'
        });
      } catch (error) {
        console.error("Error loading admin profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setIsLogoutDialogOpen(false);
    router.push('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'SA';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0F19]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#06B4C9] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-[#94A3B8] text-sm font-medium">Loading Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] flex">
        <SessionTimeout />

        {/* Sidebar — always dark for admin authority feel */}
        <aside className={`fixed top-0 left-0 z-40 h-screen w-64 bg-[#0E1220] border-r border-[#1E2536] text-white transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-[#1E2536]">
              <Link href="/admin/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#06B4C9] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-white">VECTOR</span>
                  <p className="text-xs text-[#64748B]">Super Admin</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              <Link
                href="/admin/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${pathname === '/admin/dashboard' ? 'text-white bg-[#06B4C9]' : 'text-[#94A3B8] hover:text-white hover:bg-[#1E2536]'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Verify Users
              </Link>
              <Link
                href="/admin/analytics"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${pathname === '/admin/analytics' ? 'text-white bg-[#06B4C9]' : 'text-[#94A3B8] hover:text-white hover:bg-[#1E2536]'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Analytics
              </Link>
              <Link
                href="/admin/audit-logs"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${pathname === '/admin/audit-logs' ? 'text-white bg-[#06B4C9]' : 'text-[#94A3B8] hover:text-white hover:bg-[#1E2536]'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Audit Logs
              </Link>
              <Link
                href="/admin/system-metrics"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${pathname === '/admin/system-metrics' ? 'text-white bg-[#06B4C9]' : 'text-[#94A3B8] hover:text-white hover:bg-[#1E2536]'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                System Metrics
              </Link>
            </nav>

            <div className="p-4 border-t border-[#1E2536]">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#1E2536] rounded-lg justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 bg-[#06B4C9] rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs">
                    {getInitials(user?.full_name || '')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                    <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
                  </div>
                </div>
                <button onClick={() => setIsLogoutDialogOpen(true)} className="p-1.5 text-[#64748B] hover:text-white hover:bg-red-600 rounded-md transition-colors flex-shrink-0" title="Logout">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-64">
          <header className="sticky top-0 z-30 bg-white dark:bg-[#131825] border-b border-gray-200 dark:border-[#1E2536] px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E2536] text-gray-600 dark:text-[#94A3B8]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="lg:hidden flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">VECTOR Admin</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {/* Date */}
                <div className="hidden md:flex items-center gap-1.5 mr-1">
                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span className="text-xs text-gray-500 dark:text-slate-500 whitespace-nowrap">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="h-5 w-px bg-gray-200 dark:bg-[#1E2536] hidden md:block mx-1" />

                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#06B4C9]/10 rounded-full border border-[#06B4C9]/20">
                  <div className="w-2 h-2 rounded-full bg-[#06B4C9] animate-pulse"></div>
                  <span className="text-xs font-semibold text-[#06B4C9] uppercase tracking-wide">System Secure</span>
                </div>

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-lg text-gray-500 dark:text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  {theme === 'dark' ? (
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>

        {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        {isLogoutDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#131825] rounded-xl max-w-md w-full p-6 shadow-xl border border-transparent dark:border-[#1E2536]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-600 dark:text-[#94A3B8] mb-6">Are you sure you want to end your administrative session?</p>
              <div className="flex gap-3">
                <button onClick={() => setIsLogoutDialogOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#283042] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1E2536] text-gray-700 dark:text-[#E2E8F0]">Cancel</button>
                <button onClick={confirmLogout} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Logout</button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}