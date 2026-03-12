'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Tooltip from '../shared/Tooltip';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  link_url: string | null;
}

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // ✅ Fix: render date only after mount so server and client agree on the
  // initial HTML. On the server this stays null (renders nothing), on the
  // client it populates after the first paint — no hydration mismatch.
  const [currentDate, setCurrentDate] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Keep userId in a ref so Realtime callback can always access the latest value
  // without needing to be re-registered every time user state changes.
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  const getPageTitle = (path: string) => {
    if (path.includes('/dashboard')) return 'Student Dashboard';
    if (path.includes('/skills')) return 'Skill Verification';
    if (path.includes('/cvr')) return 'CVR Record';
    if (path.includes('/coach')) return 'AI Career Coach';
    if (path.includes('/profile')) return 'My Profile';
    if (path.includes('/help')) return 'Help & Support';
    return 'Dashboard';
  };

  const capitalizeWords = (text: string) =>
    text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  let theme: 'light' | 'dark' = 'light';
  let toggleTheme = () => {};
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    toggleTheme = themeContext.toggleTheme;
  } catch {}

  // ---------------------------------------------------------------------------
  // fetchNotifications — wrapped in useCallback so it can be safely used
  // inside both the initial useEffect and the polling interval without
  // causing stale closure issues.
  // ---------------------------------------------------------------------------
  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setNotifications(data);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted || !session) return;

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      const userData: UserProfile = {
        id: session.user.id,
        full_name: profile?.full_name
          ? capitalizeWords(profile.full_name)
          : (session.user.email?.split('@')[0] || 'User'),
        role: profile?.role || 'student',
        email: session.user.email,
      };

      setUser(userData);
      userIdRef.current = session.user.id;

      // Initial fetch on mount
      fetchNotifications(session.user.id);

      // -----------------------------------------------------------------
      // Supabase Realtime subscription
      // -----------------------------------------------------------------
      try {
        channel = supabase
          .channel(`notifications:${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${session.user.id}`,
            },
            (payload: any) => {
              if (!isMounted) return;
              setNotifications(prev => {
                const newNotif = payload.new as NotificationItem;
                if (prev.some(n => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev].slice(0, 10);
              });
            }
          )
          .subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('Supabase Realtime subscription status:', status);
            }
          });
      } catch (err) {
        console.error('Failed to subscribe to Realtime channel:', err);
      }

      // -----------------------------------------------------------------
      // Polling fallback — every 30 seconds
      // -----------------------------------------------------------------
      pollInterval = setInterval(() => {
        if (isMounted && userIdRef.current) {
          fetchNotifications(userIdRef.current);
        }
      }, 30_000);
    };

    getUser();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchNotifications]);

  // ---------------------------------------------------------------------------
  // handleNotificationClick
  //
  // Marks the individual notification as read then redirects to link_url
  // if one exists (e.g. /verify/[credential-id]).
  // ---------------------------------------------------------------------------
  const handleNotificationClick = async (notification: NotificationItem) => {
    // Mark as read locally immediately for snappy UI
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    );

    // Persist to DB (non-blocking)
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }

    // Redirect if the notification has a link
    if (notification.link_url) {
      setIsNotificationsOpen(false);
      router.push(notification.link_url);
    }
  };

  // ---------------------------------------------------------------------------
  // handleOpenNotifications
  //
  // When the bell is opened, mark ALL unread notifications as read in the DB
  // and update local state so the badge clears immediately.
  // ---------------------------------------------------------------------------
  const handleOpenNotifications = async () => {
    const opening = !isNotificationsOpen;
    setIsNotificationsOpen(opening);

    if (opening && userIdRef.current) {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      // Optimistic local update — badge disappears instantly
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
      );

      // Persist all as read in one DB call
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  };

  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { setIsProfileMenuOpen(false); setIsLogoutDialogOpen(true); };
  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setIsLogoutDialogOpen(false);
    router.push('/login');
  };
  const handleViewProfile = () => { setIsProfileMenuOpen(false); router.push('/student/profile'); };
  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : 'U';

  // Notification type → color dot
  const typeDot: Record<string, string> = {
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    alert:   'bg-red-500',
    info:    'bg-blue-500',
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white dark:bg-[#0E1220] border-b border-gray-200 dark:border-[#1E2536] px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">

          {/* Left Section: Hamburger Menu + Search */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            {/* Hamburger Menu Icon */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-[#94A3B8]"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search here..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:!bg-[#151C2A] border border-gray-200 dark:!border-[#283042] rounded-lg text-sm text-gray-900 dark:!text-[#E2E8F0] placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:bg-white dark:focus:!bg-[#192030] transition-colors"
              />
            </div>
          </div>

          {/* Right Section: Icons */}
          <div className="flex items-center gap-2">

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-[#94A3B8]"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Notification Bell */}
            <div id="tour-notifications" className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(prev => !prev)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#131825] rounded-xl shadow-lg border border-gray-200 dark:border-[#1E2536] overflow-hidden z-50 animate-fade-in-up">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1E2536] flex justify-between items-center bg-gray-50 dark:bg-[#0E1220]">
                    <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-[#06B4C9]/10 text-[#06B4C9] font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount} New
                      </span>
                    )}
                  </div>

                  {/* Notification list */}
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                            !notification.is_read ? 'bg-[#06B4C9]/5' : ''
                          } ${notification.link_url ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {/* Type dot + unread indicator */}
                          <div className="flex-shrink-0 mt-1.5 relative">
                            <div className={`w-2 h-2 rounded-full ${typeDot[notification.type] ?? 'bg-gray-400'}`} />
                            {!notification.is_read && (
                              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#06B4C9] rounded-full" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <p className="text-xs text-gray-400">{timeAgo(notification.created_at)}</p>
                              {notification.link_url && (
                                <span className="text-xs text-[#06B4C9] font-medium">· View →</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-sm text-gray-400">No notifications yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative" ref={profileMenuRef}>
              <Tooltip content="Profile">
                <button
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 dark:bg-[#1E2536] rounded-full flex items-center justify-center">
                    <span className="text-gray-700 dark:text-[#94A3B8] font-semibold text-sm">
                      {user ? getInitials(user.full_name) : '...'}
                    </span>
                  </div>
                </button>
              </Tooltip>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#131825] rounded-lg shadow-lg border border-gray-200 dark:border-[#1E2536] py-2 z-50 animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1E2536]">
                    <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'Loading...'}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role || 'student'}</p>
                  </div>
                  <button onClick={handleViewProfile} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 0 0-7-7z" /></svg>
                    View Profile
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Logout Dialog */}
      {isLogoutDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131825] rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in-up">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to log out?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsLogoutDialogOpen(false)} className="flex-1 !text-gray-900 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={confirmLogout} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}