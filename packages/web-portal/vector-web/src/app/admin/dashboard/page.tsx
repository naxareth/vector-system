'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { supabase } from '@/lib/supabaseClient';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  status: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'pending_verification')
      .order('created_at', { ascending: false });

    if (data) setPendingUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerification = async (userId: string, newRole: 'registrar' | 'student') => {
    if (!confirm(`Are you sure you want to promote this user to ${newRole.toUpperCase()}? This action will be audited.`)) return;

    setProcessingId(userId);

    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });

      if (!res.ok) throw new Error('Verification failed');

      await fetchPending();
      alert(`User successfully verified as ${newRole}`);

    } catch (error) {
      console.error(error);
      alert('Failed to update user role.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Pending Verifications</h1>
          <p className="text-gray-500 dark:text-[#94A3B8]">Review and authorize new account requests. All actions are logged.</p>
        </div>

        <div className="bg-white dark:bg-[#131825] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1E2536] bg-gray-50 dark:bg-[#0E1220] flex justify-between items-center">
            <span className="font-semibold text-gray-700 dark:text-[#E2E8F0]">Queue ({pendingUsers.length})</span>
            <button onClick={fetchPending} className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/70 font-medium">Refresh List</button>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#0E1220] text-gray-500 dark:text-[#64748B] text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 font-semibold">User Details</th>
                    <th className="px-6 py-3 font-semibold">Requested At</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#1E2536] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#06B4C9]/10 text-[#06B4C9] rounded-full flex items-center justify-center font-bold">
                            {user.full_name ? user.full_name[0] : '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.full_name || 'Unknown Name'}</p>
                            <p className="text-sm text-gray-500 dark:text-[#94A3B8]">{user.email}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              {user.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#94A3B8]">
                        {new Date(user.created_at).toLocaleDateString()} <br />
                        <span className="text-xs text-gray-400 dark:text-[#64748B]">{new Date(user.created_at).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {processingId === user.id ? (
                            <span className="text-sm text-gray-500 animate-pulse">Processing...</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleVerification(user.id, 'registrar')}
                                className="px-3 py-1.5 bg-[#06B4C9] text-white text-sm font-medium rounded-lg hover:bg-[#06B4C9]/80 hover:shadow-md transition-all"
                              >
                                Approve Registrar
                              </button>
                              <button
                                onClick={() => handleVerification(user.id, 'student')}
                                className="px-3 py-1.5 bg-white dark:bg-[#1E2536] border border-gray-300 dark:border-[#283042] text-gray-700 dark:text-[#E2E8F0] text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#283042] transition-all"
                              >
                                Approve Student
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}