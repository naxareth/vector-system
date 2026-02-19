'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { supabase } from '@/lib/supabaseClient';

interface AuditLogEntry {
  id: string;
  created_at: string;
  action_type: string;
  description: string;
  actor: { full_name: string; email: string } | null;
  target: { full_name: string; email: string } | null;
  metadata: any;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:users!audit_logs_actor_id_fkey(full_name, email),
        target:users!audit_logs_target_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setLogs(data as any);
    if (error) console.error("Error fetching logs:", error);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ROLE_CHANGE': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'USER_VERIFIED': return 'bg-green-100 text-green-700 border-green-200';
      case 'ACCOUNT_SUSPENDED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">System Audit Ledger</h1>
            <p className="text-gray-500">Immutable record of all administrative actions.</p>
          </div>
          <button onClick={fetchLogs} className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all text-purple-600 font-medium">
            Refresh Logs
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
             <div className="p-12 text-center text-gray-500">Loading audit trail...</div>
          ) : logs.length === 0 ? (
             <div className="p-12 text-center text-gray-400">No audit records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4 font-semibold">Timestamp</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                    <th className="px-6 py-4 font-semibold">Administrator (Actor)</th>
                    <th className="px-6 py-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        <span className="font-mono text-xs">{new Date(log.created_at).toISOString().split('T')[0]}</span>
                        <br/>
                        <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                             {log.actor?.full_name ? log.actor.full_name[0] : 'S'}
                           </div>
                           <span className="text-sm font-medium text-gray-900">{log.actor?.full_name || 'System'}</span>
                         </div>
                         <span className="text-xs text-gray-400 ml-8">{log.actor?.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-800">{log.description}</p>
                        {log.target && (
                           <p className="text-xs text-gray-500 mt-1">
                             Target: <span className="font-medium">{log.target.email}</span>
                           </p>
                        )}
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