'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
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
  registrar: 'Registrar',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  registrar: 'bg-[#06B4C9]/10 text-[#06B4C9]',
  super_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  pending_verification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
};

export default function AdminDashboard() {
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'directory'>('pending');

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setAllUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const pendingUsers = allUsers.filter((u) => u.status === 'pending_verification');
  const directoryUsers = allUsers.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: string, userName: string) => {
    const currentUser = allUsers.find((u) => u.id === userId);
    if (currentUser?.role === newRole) return;

    if (!confirm(`Change ${userName}'s role to ${ROLE_LABELS[newRole as Role] || newRole}? This action will be audited.`)) return;

    setProcessingId(userId);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Role update failed');
      }

      await fetchUsers();
    } catch (error: any) {
      console.error(error);
      alert(`Failed to update role: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickApprove = async (userId: string, newRole: 'registrar' | 'student') => {
    if (!confirm(`Approve this user as ${newRole.toUpperCase()}? This action will be audited.`)) return;

    setProcessingId(userId);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">User Management</h1>
          <p className="text-gray-500 dark:text-[#94A3B8]">Approve pending accounts and manage user roles. All changes are audited.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 dark:bg-[#1E2536] p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'pending'
                ? 'bg-white dark:bg-[#131825] shadow-sm text-[#06B4C9]'
                : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'
              }`}
          >
            Pending
            {pendingUsers.length > 0 && (
              <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'directory'
                ? 'bg-white dark:bg-[#131825] shadow-sm text-[#06B4C9]'
                : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'
              }`}
          >
            All Users ({allUsers.length})
          </button>
        </div>

        {/* ── Pending Tab ── */}
        {activeTab === 'pending' && (
          <div className="bg-white dark:bg-[#131825] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1E2536] bg-gray-50 dark:bg-[#0E1220] flex justify-between items-center">
              <span className="font-semibold text-gray-700 dark:text-[#E2E8F0]">Verification Queue ({pendingUsers.length})</span>
              <button onClick={fetchUsers} className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/70 font-medium">Refresh</button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-[#94A3B8]">Loading requests...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-50 dark:bg-emerald-500/10 text-green-500 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
                <p className="text-gray-500 dark:text-[#94A3B8]">No pending verification requests.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-[#1E2536] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-[#06B4C9]/10 text-[#06B4C9] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {user.full_name ? user.full_name[0] : '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{user.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500 dark:text-[#94A3B8] truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {processingId === user.id ? (
                        <span className="text-sm text-gray-500 animate-pulse">Processing...</span>
                      ) : (
                        <>
                          <button onClick={() => handleQuickApprove(user.id, 'registrar')} className="px-3 py-1.5 bg-[#06B4C9] text-white text-sm font-medium rounded-lg hover:bg-[#06B4C9]/80 transition-all">
                            Approve Registrar
                          </button>
                          <button onClick={() => handleQuickApprove(user.id, 'student')} className="px-3 py-1.5 bg-white dark:bg-[#1E2536] border border-gray-300 dark:border-[#283042] text-gray-700 dark:text-[#E2E8F0] text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#283042] transition-all">
                            Approve Student
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Directory Tab ── */}
        {activeTab === 'directory' && (
          <div className="bg-white dark:bg-[#131825] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] overflow-hidden">
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
                className="px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg bg-white dark:bg-[#131825] text-gray-700 dark:text-[#E2E8F0] text-sm focus:ring-2 focus:ring-[#06B4C9] outline-none"
              >
                <option value="all">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
                <option value="pending_verification">Pending</option>
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
                      <th className="px-6 py-3 font-semibold text-right">Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                    {directoryUsers.map((user) => (
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
                        <td className="px-6 py-4 text-right">
                          {processingId === user.id ? (
                            <span className="text-sm text-gray-500 animate-pulse">Saving...</span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value, user.full_name)}
                              className="px-2 py-1.5 border border-gray-300 dark:border-[#283042] rounded-lg bg-white dark:bg-[#1E2536] text-gray-700 dark:text-[#E2E8F0] text-sm focus:ring-2 focus:ring-[#06B4C9] outline-none cursor-pointer"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 py-3 border-t border-gray-100 dark:border-[#1E2536] bg-gray-50 dark:bg-[#0E1220]">
              <p className="text-xs text-gray-400 dark:text-[#64748B]">
                Showing {directoryUsers.length} of {allUsers.length} users • Role changes are recorded in the audit log
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}