'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import Pagination from '@/components/shared/Pagination';

interface SystemLog {
  id: string;
  method: string;
  path: string;
  status: number;
  ip_address: string;
  duration: number;
  created_at: string;
}

interface Metrics {
  total: number;
  errorRate: string;
  avgDuration: number;
}

export default function SystemMetricsDashboard() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, errorRate: '0', avgDuration: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trafficPage, setTrafficPage] = useState(1);
  const TRAFFIC_PER_PAGE = 20;

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/system-logs');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');

      setLogs(data.logs);
      setMetrics(data.metrics);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
    // Auto-refresh every 30 seconds to monitor live traffic
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: number) => {
    if (status >= 500) return 'bg-red-100 text-red-800 border-red-200';
    if (status >= 400) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (status >= 300) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0B0F19]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B4C9]"></div></div>;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Monitoring</h1>
          <p className="text-gray-500 dark:text-[#94A3B8]">Live network traffic and endpoint health metrics.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#131825] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536]">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wider">Recent Requests</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics.total}</p>
          </div>
          <div className="bg-white dark:bg-[#131825] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536]">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wider">Error Rate (4xx & 5xx)</h3>
            <p className={`text-3xl font-bold mt-2 ${parseFloat(metrics.errorRate) > 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {metrics.errorRate}%
            </p>
          </div>
          <div className="bg-white dark:bg-[#131825] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536]">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wider">Avg Latency</h3>
            <p className={`text-3xl font-bold mt-2 ${metrics.avgDuration > 1000 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
              {metrics.avgDuration} <span className="text-lg font-medium text-gray-500 dark:text-[#94A3B8]">ms</span>
            </p>
          </div>
        </div>

        {/* Traffic Log Table */}
        <div className="bg-white dark:bg-[#131825] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1E2536] flex justify-between items-center bg-gray-50 dark:bg-[#0E1220]">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Traffic Log</h2>
            <button onClick={fetchLogs} className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/70 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-[#94A3B8]">
              <thead className="bg-white dark:bg-[#131825] sticky top-0 border-b border-gray-200 dark:border-[#1E2536] z-10">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#E2E8F0]">Timestamp</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#E2E8F0]">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#E2E8F0]">Method</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#E2E8F0]">Path</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#E2E8F0]">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                {logs.slice((trafficPage - 1) * TRAFFIC_PER_PAGE, trafficPage * TRAFFIC_PER_PAGE).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#1E2536]">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-[#64748B] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-700 dark:text-[#E2E8F0]">{log.method}</td>
                    <td className="px-6 py-3 font-mono text-xs max-w-xs truncate" title={log.path}>
                      {log.path}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`${(log.duration || 0) > 1000 ? 'text-red-500 font-bold' : ''}`}>
                        {log.duration} ms
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-[#94A3B8]">No traffic logs found. Try browsing the app first!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {logs.length > 0 && (
            <div className="px-6 py-2 border-t border-gray-100 dark:border-[#1E2536]">
              <Pagination currentPage={trafficPage} totalItems={logs.length} itemsPerPage={TRAFFIC_PER_PAGE} onPageChange={setTrafficPage} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}