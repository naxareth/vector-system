'use client';
import { useState, useRef, useEffect } from 'react';
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

export default function TopBar() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const router = useRouter();
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const getPageTitle = (path: string) => {
    if (path.includes('/dashboard')) return 'Student Dashboard';
    if (path.includes('/skills')) return 'Skill Verification';
    if (path.includes('/cvr')) return 'CVR Record';
    if (path.includes('/coach')) return 'AI Career Coach';
    if (path.includes('/profile')) return 'My Profile';
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

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        const userData = {
          id: session.user.id,
          full_name: profile?.full_name
            ? capitalizeWords(profile.full_name)
            : (session.user.email?.split('@')[0] || 'User'),
          role: profile?.role || 'student',
          email: session.user.email,
        };

        setUser(userData);
        fetchNotifications(userData.id);
      }
    };
    getUser();
  }, []);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setNotifications(data);
  };

  // ---------------------------------------------------------------------------
  // handleNotificationClick
  //
  // Previously: opening the dropdown marked ALL notifications as read at once.
  // Now: each notification is marked read individually on click, then the
  // user is redirected to link_url if one exists (e.g. /verify/[credential-id]).
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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-gray-900">{getPageTitle(pathname)}</h1>
            <p className="text-sm text-gray-500 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">

            {/* Notification Bell */}
            <div id="tour-notifications" className="relative" ref={notificationsRef}>
              <Tooltip content="Notifications">
                <button
                  onClick={() => setIsNotificationsOpen(prev => !prev)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-purple-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </Tooltip>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 animate-fade-in-up">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
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
                            !notification.is_read ? 'bg-purple-50/60' : ''
                          } ${notification.link_url ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {/* Type dot + unread indicator */}
                          <div className="flex-shrink-0 mt-1.5 relative">
                            <div className={`w-2 h-2 rounded-full ${typeDot[notification.type] ?? 'bg-gray-400'}`} />
                            {!notification.is_read && (
                              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-600 rounded-full" />
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
                                <span className="text-xs text-purple-500 font-medium">· View →</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-sm text-gray-400">No notifications yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block" />

            {/* Profile Menu */}
            <div className="relative" ref={profileMenuRef}>
              <Tooltip content="Manage Profile" position="bottom">
                <button
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                  className="flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                    <span className="text-purple-700 font-bold text-sm">
                      {user ? getInitials(user.full_name) : '...'}
                    </span>
                  </div>
                </button>
              </Tooltip>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'Loading...'}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role || 'student'}</p>
                  </div>
                  <button onClick={handleViewProfile} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in-up">
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