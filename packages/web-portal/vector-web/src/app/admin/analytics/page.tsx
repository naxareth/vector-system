'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { supabase } from '@/lib/supabaseClient';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PlatformStats {
  totalUsers: number;
  students: number;
  registrars: number;
  admins: number;
  activeUsers: number;
  inactiveUsers: number;
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
    activeUsers: 0, inactiveUsers: 0,
    totalCredentials: 0, recentCredentials: 0, recentSignups: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'students' | 'issuers'>('all');

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch user counts by role
        const { data: users } = await supabase
          .from('users')
          .select('id, role, status, created_at');

        if (users) {
          setStats(prev => ({
            ...prev,
            totalUsers: users.length,
            students: users.filter(u => u.role === 'student').length,
            registrars: users.filter(u => u.role === 'registrar').length,
            admins: users.filter(u => u.role === 'super_admin').length,
            activeUsers: users.filter(u => u.status === 'active').length,
            inactiveUsers: users.filter(u => u.status !== 'active').length,
            recentSignups: users.filter(u => new Date(u.created_at) >= threeDaysAgo).length,
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
          setRecentActivity(logs.map((log: { id: string; action_type: string; description: string; created_at: string; actor?: { full_name: string } | null }) => ({
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

  const normalizeStatus = (user: { status: string, created_at: string }) => {
    if (user.status === 'active' && new Date(user.created_at) >= threeDaysAgo) {
      return 'active';
    }
    return 'inactive';
  };

  const pieData = [
    { name: 'Active', value: stats.activeUsers },
    { name: 'Inactive', value: stats.inactiveUsers },
  ];
  const pieColors = ['#34D399', '#A1A1AA'];

  const filteredPieData = (() => {
    if (statusFilter === 'students') {
      return [
        { name: 'Active', value: stats.students },
        { name: 'Inactive', value: stats.inactiveUsers - stats.students },
      ];
    } else if (statusFilter === 'issuers') {
      return [
        { name: 'Active', value: stats.registrars },
        { name: 'Inactive', value: stats.inactiveUsers - stats.registrars },
      ];
    }
    return pieData;
  })();

  // Example user growth data (replace with real aggregation)
  const userGrowthData = [
    { period: 'Day', students: 5, issuers: 2 },
    { period: 'Month', students: 15, issuers: 5 },
    { period: 'Year', students: 23, issuers: 7 },
  ];

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
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Active Users</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Active status</p>
          </div>

          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Inactive Users</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inactiveUsers}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Inactive status</p>
          </div>

          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-[#06B4C9]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Credential Issuers</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.registrars}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Issuer accounts</p>
          </div>
        </div>

        {/* Pie Chart: Active vs Inactive */}
        <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-6 mt-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">User Status Distribution</h2>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | 'students' | 'issuers')}
              className="px-3 py-1 border border-gray-300 dark:border-[#283042] rounded-lg bg-white dark:bg-[#131825] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#06B4C9] outline-none"
            >
              <option value="all" className="bg-white dark:bg-[#131825] text-gray-900 dark:text-white">All Users</option>
              <option value="students" className="bg-white dark:bg-[#131825] text-gray-900 dark:text-white">Students</option>
              <option value="issuers" className="bg-white dark:bg-[#131825] text-gray-900 dark:text-white">Credential Issuers</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={filteredPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {filteredPieData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={pieColors[idx]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Line Chart: User Growth */}
        <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-6 mt-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-5">User Growth (Students vs Issuers)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={userGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="students" stroke="#3B82F6" name="Students" />
              <Line type="monotone" dataKey="issuers" stroke="#06B4C9" name="Credential Issuers" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}
