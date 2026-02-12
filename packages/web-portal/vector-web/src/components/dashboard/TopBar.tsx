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
}

export default function TopBar() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  const [showWallet, setShowWallet] = useState(false);
  const [walletAddress] = useState("0x71C...9A21"); 

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

  const capitalizeWords = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  let theme: 'light' | 'dark' = 'light';
  let toggleTheme = () => {};
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    toggleTheme = themeContext.toggleTheme;
  } catch (error) {}

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
          full_name: profile?.full_name ? capitalizeWords(profile.full_name) : (session.user.email?.split('@')[0] || 'User'),
          role: profile?.role || 'student',
          email: session.user.email
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

  const handleOpenNotifications = async () => {
    const wasOpen = isNotificationsOpen;
    setIsNotificationsOpen(!wasOpen);

    if (!wasOpen && user && notifications.some(n => !n.is_read)) {
      const updated = notifications.map(n => ({ ...n, is_read: true }));
      setNotifications(updated);

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
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

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setIsLogoutDialogOpen(false);
    router.push('/login');
  };

  const handleViewProfile = () => {
    setIsProfileMenuOpen(false);
    router.push('/student/profile');
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
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
            
            {/* Wallet Section with Tour ID */}
            <div id="tour-wallet" className="hidden md:flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1 pr-4">
              <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 mr-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-bold text-gray-700">Polygon Amoy</span>
              </div>

              <Tooltip content={showWallet ? "Hide Wallet Address" : "Show Wallet Address"}>
                <button 
                  onClick={() => setShowWallet(!showWallet)}
                  className="flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     {showWallet ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                     ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                     )}
                     {!showWallet && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                  </svg>
                  {showWallet ? walletAddress : "•••• •••• •••• 9A21"}
                </button>
              </Tooltip>
            </div>

            {/* Notification Section with Tour ID */}
            <div id="tour-notifications" className="relative" ref={notificationsRef}>
              <Tooltip content="Notifications">
                <button onClick={handleOpenNotifications} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-purple-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
              </Tooltip>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-96 overflow-y-auto z-50 animate-fade-in-up">
                  <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && <span className="text-xs text-purple-600 font-medium">{unreadCount} New</span>}
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-purple-50/50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-1 flex-shrink-0">
                              {notification.type === 'success' && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                              {notification.type === 'warning' && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                              {notification.type === 'info' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                              {!notification.is_read && <div className="w-2 h-2 bg-purple-600 rounded-full absolute" />} 
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            
            <div className="relative" ref={profileMenuRef}>
              <Tooltip content="Manage Profile" position="bottom">
                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
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

      {isLogoutDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in-up">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to log out?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsLogoutDialogOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={confirmLogout} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}