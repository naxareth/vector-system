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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Pending Verifications</h1>
          <p className="text-gray-500">Review and authorize new account requests. All actions are logged.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <span className="font-semibold text-gray-700">Queue ({pendingUsers.length})</span>
             <button onClick={fetchPending} className="text-sm text-purple-600 hover:text-purple-800 font-medium">Refresh List</button>
          </div>

          {loading ? (
             <div className="p-8 text-center text-gray-500">Loading requests...</div>
          ) : pendingUsers.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center">
               <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               </div>
               <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
               <p className="text-gray-500">No pending verification requests.</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 font-semibold">User Details</th>
                    <th className="px-6 py-3 font-semibold">Requested At</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                            {user.full_name ? user.full_name[0] : '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || 'Unknown Name'}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              {user.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()} <br/>
                        <span className="text-xs text-gray-400">{new Date(user.created_at).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {processingId === user.id ? (
                            <span className="text-sm text-gray-500 animate-pulse">Processing...</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleVerification(user.id, 'registrar')}
                                className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 hover:shadow-md transition-all"
                              >
                                Approve Registrar
                              </button>
                              <button
                                onClick={() => handleVerification(user.id, 'student')}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
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