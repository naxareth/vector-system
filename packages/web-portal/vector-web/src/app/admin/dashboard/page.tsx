'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import Pagination from '@/components/shared/Pagination';
import { supabase } from '@/lib/supabaseClient';

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  status: string;
  role: string;
  created_at: string;
}

const ROLES = ['student', 'registrar', 'super_admin'] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  registrar: 'Issuer',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  registrar: 'bg-[#06B4C9]/10 text-[#06B4C9]',
  super_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  pending_verification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
};

interface ConfirmModalState {
  isOpen: boolean;
  action: 'suspend' | 'restore' | 'delete' | 'role-change' | null;
  userId: string | null;
  userName: string | null;
  newRole?: string;
  message: string;
}

export default function AdminDashboard() {
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [dirPage, setDirPage] = useState(1);
  const [modal, setModal] = useState<ConfirmModalState>({
    isOpen: false,
    action: null,
    userId: null,
    userName: null,
    message: '',
  });
  const ROWS_PER_PAGE = 8;

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setAllUsers(data);
    
    // Fetch platform stats
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const directoryUsers = allUsers.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const paginatedDir = directoryUsers.slice((dirPage - 1) * ROWS_PER_PAGE, dirPage * ROWS_PER_PAGE);

  // Reset pages on filter/search changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDirPage(1); }, [searchQuery, filterRole]);

  const handleRoleChange = (userId: string, newRole: string, userName: string) => {
    const currentUser = allUsers.find((u) => u.id === userId);
    if (currentUser?.role === newRole) return;

    setModal({
      isOpen: true,
      action: 'role-change',
      userId,
      userName,
      newRole,
      message: `Change ${userName}'s role to ${ROLE_LABELS[newRole as Role] || newRole}? This change will take effect immediately and will be recorded in the activity log.`,
    });
  };

  const handleRoleChangeConfirm = async () => {
    const { userId, newRole } = modal;
    if (!userId || !newRole) return;

    setProcessingId(userId);
    setModal({ isOpen: false, action: null, userId: null, userName: null, message: '' });
    try {
      // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Role update failed');
      }

      await fetchUsers();
    } catch (error: unknown) {
      console.error(error);
      alert(`Failed to update role: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchiveUser = (userId: string, userName: string, currentStatus: string) => {
    const isSuspended = currentStatus === 'suspended';
    const actionType = isSuspended ? 'restore' : 'suspend';
    const message = `${isSuspended ? 'Restore' : 'Suspend'} ${userName}? ${isSuspended ? 'They will regain access.' : 'They will lose access until restored.'}`;

    setModal({
      isOpen: true,
      action: actionType as 'suspend' | 'restore',
      userId,
      userName,
      message,
    });
  };

  const handleArchiveUserConfirm = async () => {
    const { userId, action } = modal;
    if (!userId || (action !== 'suspend' && action !== 'restore')) return;

    setProcessingId(userId);
    setModal({ isOpen: false, action: null, userId: null, userName: null, message: '' });
    try {
      // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      const res = await fetch('/api/admin/manage-users', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({ targetUserId: userId, action }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Failed to ${action}`);
      await fetchUsers();
    } catch (error: unknown) {
      alert(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setModal({
      isOpen: true,
      action: 'delete',
      userId,
      userName,
      message: `Permanently delete ${userName} and all their credentials? This CANNOT be undone. All certificates, skills, and notifications will be deleted.`,
    });
  };

  const handleDeleteUserConfirm = async () => {
    const { userId } = modal;
    if (!userId) return;

    setProcessingId(userId);
    setModal({ isOpen: false, action: null, userId: null, userName: null, message: '' });
    try {
      // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      const res = await fetch('/api/admin/manage-users', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      await fetchUsers();
    } catch (error: unknown) {
      alert(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessingId(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQuickApprove = async (userId: string, newRole: 'registrar' | 'student') => {
    if (!confirm(`Approve this user as a ${ROLE_LABELS[newRole as Role] || newRole}? They will receive access immediately.`)) return;

    setProcessingId(userId);
    try {
      // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });

      if (!res.ok) throw new Error('Verification failed');
      await fetchUsers();
    } catch (error) {
      console.error(error);
      alert('Failed to update user role.');
    } finally {
      setProcessingId(null);
    }
  };

  // Calculate stats
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.status === 'active').length;
  const inactiveUsers = allUsers.filter(u => u.status !== 'active').length;
  const registrars = allUsers.filter(u => u.role === 'registrar').length;
  const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-[#94A3B8] mt-1">Platform overview and user management.</p>
        </div>

        {/* Platform Statistics */}
        {stats && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Platform Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-purple-100 dark:bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Employers</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.employers || 0}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Registered Companies</p>
              </div>

              <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-[#06B4C9]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Active Jobs</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeJobs || 0}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Open Postings</p>
              </div>

              <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-green-100 dark:bg-green-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Applications</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalApplications || 0}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Total Submissions</p>
              </div>

              <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Creds Reviewed</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.credentialsReviewed || 0}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Processed Files</p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards for Users */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Total Users</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">+3 this week</p>
          </div>

          {/* Active Users */}
          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-100 dark:bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Active</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeUsers}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{activePercentage}% of total</p>
          </div>

          {/* Inactive Users */}
          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Inactive</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{inactiveUsers}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Users not active</p>
          </div>

          {/* Registrars */}
          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-[#06B4C9]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Credential Issuers</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{registrars}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Issuers Accounts</p>
          </div>
        </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1E2536] bg-gray-50 dark:bg-[#0E1220] flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg bg-white dark:bg-[#131825] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#06B4C9] outline-none"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg bg-white dark:bg-[#131825] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#06B4C9] outline-none"
              >
                <option value="all" className="bg-white dark:bg-[#131825] text-gray-900 dark:text-white">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-white dark:bg-[#131825] text-gray-900 dark:text-white">{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <button onClick={fetchUsers} className="px-4 py-2 text-sm text-[#06B4C9] hover:text-[#06B4C9]/70 font-medium border border-gray-300 dark:border-[#283042] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1E2536]">
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-[#94A3B8]">Loading users...</div>
            ) : directoryUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-[#64748B]">No users match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#0E1220] text-gray-500 dark:text-[#64748B] text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 font-semibold">User</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Current Role</th>
                      <th className="px-6 py-3 font-semibold">Joined</th>
                      <th className="px-6 py-3 font-semibold">Change Role</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                    {paginatedDir.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#1E2536] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#06B4C9]/10 text-[#06B4C9] rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {user.full_name ? user.full_name[0] : '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{user.full_name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500 dark:text-[#94A3B8] truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : ROLE_COLORS[user.status] || 'bg-gray-100 text-gray-600'
                            }`}>
                            {user.status === 'active' ? '● Active' : user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[user.role as Role] || user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#94A3B8] whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {processingId === user.id ? (
                            <span className="text-sm text-gray-500 animate-pulse">Saving...</span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value, user.full_name)}
                              className="px-2 py-1.5 border border-gray-300 dark:border-[#283042] rounded-lg bg-white dark:bg-[#131825] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#06B4C9] outline-none cursor-pointer"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r} className="bg-white dark:bg-[#131825] text-gray-900 dark:text-white">
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {processingId === user.id ? (
                            <span className="text-sm text-gray-500 animate-pulse">...</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleArchiveUser(user.id, user.full_name, user.status)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                  user.status === 'suspended'
                                    ? 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400 dark:hover:bg-green-500/10'
                                    : 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10'
                                }`}
                              >
                                {user.status === 'suspended' ? 'Restore' : 'Suspend'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.full_name)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          <div className="px-6 py-2 border-t border-gray-100 dark:border-[#1E2536] bg-gray-50 dark:bg-[#0E1220] flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-[#64748B]">
              Showing {directoryUsers.length} of {allUsers.length} users
            </p>
            <Pagination currentPage={dirPage} totalItems={directoryUsers.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setDirPage} />
          </div>
        </div>

        {/* Confirmation Modal */}
        {modal.isOpen && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] max-w-sm w-full shadow-lg">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1E2536]">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {modal.action === 'role-change' && 'Change User Role'}
                  {modal.action === 'suspend' && 'Suspend User'}
                  {modal.action === 'restore' && 'Restore User'}
                  {modal.action === 'delete' && 'Delete User'}
                </h3>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-sm text-gray-700 dark:text-slate-300">{modal.message}</p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1E2536] flex items-center justify-end gap-3">
                <button
                  onClick={() => setModal({ isOpen: false, action: null, userId: null, userName: null, message: '' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-[#283042] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1E2536] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (modal.action === 'role-change') handleRoleChangeConfirm();
                    else if (modal.action === 'suspend' || modal.action === 'restore') handleArchiveUserConfirm();
                    else if (modal.action === 'delete') handleDeleteUserConfirm();
                  }}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    modal.action === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                      : 'bg-[#06B4C9] hover:bg-[#04A0B5] dark:bg-[#06B4C9] dark:hover:bg-[#04A0B5]'
                  }`}
                >
                  {modal.action === 'delete' ? 'Delete' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}