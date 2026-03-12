'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { supabase } from '@/lib/supabaseClient';

interface PlatformStats {
  totalUsers: number;
  students: number;
  registrars: number;
  admins: number;
  pendingVerification: number;
  totalCredentials: number;
  recentCredentials: number;
  recentSignups: number;
}

interface RecentActivity {
  id: string;
  type: 'credential' | 'signup' | 'role_change';
  description: string;
  timestamp: string;
  actor?: string;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, students: 0, registrars: 0, admins: 0,
    pendingVerification: 0, totalCredentials: 0, recentCredentials: 0, recentSignups: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch user counts by role
        const { data: users } = await supabase
          .from('users')
          .select('id, role, status, created_at');

        if (users) {
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          setStats(prev => ({
            ...prev,
            totalUsers: users.length,
            students: users.filter(u => u.role === 'student').length,
            registrars: users.filter(u => u.role === 'registrar').length,
            admins: users.filter(u => u.role === 'super_admin').length,
            pendingVerification: users.filter(u => u.status === 'pending_verification').length,
            recentSignups: users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length,
          }));
        }

        // Fetch credential counts
        const { data: credentials, count: credCount } = await supabase
          .from('credentials')
          .select('id, issued_at', { count: 'exact' });

        if (credentials) {
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          setStats(prev => ({
            ...prev,
            totalCredentials: credCount || credentials.length,
            recentCredentials: credentials.filter(c => new Date(c.issued_at) >= thirtyDaysAgo).length,
          }));
        }

        // Fetch recent audit logs for activity feed
        const { data: logs } = await supabase
          .from('audit_logs')
          .select('id, action_type, description, created_at, actor:users!audit_logs_actor_id_fkey(full_name)')
          .order('created_at', { ascending: false })
          .limit(10);

        if (logs) {
          setRecentActivity(logs.map((log: any) => ({
            id: log.id,
            type: log.action_type === 'CREDENTIAL_ISSUED' ? 'credential' : log.action_type === 'ROLE_CHANGE' ? 'role_change' : 'signup',
            description: log.description,
            timestamp: log.created_at,
            actor: log.actor?.full_name || 'System',
          })));
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'credential':
        return <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center"><svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
      case 'role_change':
        return <div className="w-8 h-8 rounded-full bg-[#06B4C9]/10 flex items-center justify-center"><svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center"><svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg></div>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#06B4C9] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>
          <p className="text-gray-500 dark:text-[#94A3B8] mt-1">Key metrics and recent activity across the platform.</p>
        </div>

        {/* KPI Cards — Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Total Users</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">+{stats.recentSignups} this month</p>
          </div>

          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-100 dark:bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Certificates</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCredentials}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">+{stats.recentCredentials} this month</p>
          </div>

          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Pending</p>
            </div>
            <p className={`text-3xl font-bold ${stats.pendingVerification > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
              {stats.pendingVerification}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">awaiting verification</p>
          </div>

          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-[#06B4C9]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Registrars</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.registrars}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{stats.students} students, {stats.admins} admins</p>
          </div>
        </div>

        {/* User Distribution + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Role Distribution */}
          <div className="lg:col-span-2 bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-5">User Breakdown</h2>
            <div className="space-y-4">
              {[
                { label: 'Students', count: stats.students, color: 'bg-blue-500', pct: stats.totalUsers ? Math.round((stats.students / stats.totalUsers) * 100) : 0 },
                { label: 'Registrars', count: stats.registrars, color: 'bg-[#06B4C9]', pct: stats.totalUsers ? Math.round((stats.registrars / stats.totalUsers) * 100) : 0 },
                { label: 'Admins', count: stats.admins, color: 'bg-amber-500', pct: stats.totalUsers ? Math.round((stats.admins / stats.totalUsers) * 100) : 0 },
                { label: 'Pending', count: stats.pendingVerification, color: 'bg-gray-400', pct: stats.totalUsers ? Math.round((stats.pendingVerification / stats.totalUsers) * 100) : 0 },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700 dark:text-slate-300">{item.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.count} <span className="text-xs text-gray-400 font-normal">({item.pct}%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-[#1E2536] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${item.color}`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="lg:col-span-3 bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-5">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">No recent activity recorded.</p>
            ) : (
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                {recentActivity.map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    {getActivityIcon(item.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-slate-200 leading-snug">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">{item.actor}</span>
                        <span className="text-gray-300 dark:text-[#283042]">·</span>
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">
                          {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                          {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
