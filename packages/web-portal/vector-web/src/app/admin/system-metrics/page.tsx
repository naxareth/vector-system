'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';

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

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/system-logs');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');
      
      setLogs(data.logs);
      setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-500">Live network traffic and endpoint health metrics.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Requests</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.total}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Error Rate (4xx & 5xx)</h3>
            <p className={`text-3xl font-bold mt-2 ${parseFloat(metrics.errorRate) > 5 ? 'text-red-600' : 'text-gray-900'}`}>
              {metrics.errorRate}%
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg Latency</h3>
            <p className={`text-3xl font-bold mt-2 ${metrics.avgDuration > 1000 ? 'text-orange-600' : 'text-gray-900'}`}>
              {metrics.avgDuration} <span className="text-lg font-medium text-gray-500">ms</span>
            </p>
          </div>
        </div>

        {/* Traffic Log Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">Traffic Log</h2>
            <button onClick={fetchLogs} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white sticky top-0 border-b border-gray-200 z-10">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-900">Timestamp</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Method</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Path</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-700">{log.method}</td>
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
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No traffic logs found. Try browsing the app first!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}