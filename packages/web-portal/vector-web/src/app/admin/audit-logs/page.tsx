'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import Pagination from '@/components/shared/Pagination';
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
  const [logPage, setLogPage] = useState(1);
  const LOGS_PER_PAGE = 15;

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
      case 'ROLE_CHANGE': return 'bg-[#06B4C9]/10 text-[#06B4C9] border-[#06B4C9]/20 dark:bg-[#06B4C9]/10 dark:text-[#06B4C9]';
      case 'USER_VERIFIED': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
      case 'ACCOUNT_SUSPENDED': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20';
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">System Audit Ledger</h1>
            <p className="text-gray-500 dark:text-[#94A3B8]">Immutable record of all administrative actions.</p>
          </div>
          <button onClick={fetchLogs} className="px-4 py-2 text-sm bg-white dark:bg-[#1E2536] border border-gray-300 dark:border-[#283042] rounded-lg hover:bg-gray-50 dark:hover:bg-[#283042] shadow-sm transition-all text-[#06B4C9] font-medium">
            Refresh Logs
          </button>
        </div>

        <div className="bg-white dark:bg-[#131825] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-[#94A3B8]">Loading audit trail...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-[#64748B]">No audit records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#0E1220] text-gray-500 dark:text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-[#1E2536]">
                    <th className="px-6 py-4 font-semibold">Timestamp</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                    <th className="px-6 py-4 font-semibold">Administrator</th>
                    <th className="px-6 py-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                  {logs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#94A3B8] whitespace-nowrap">
                        <span className="font-mono text-xs">{new Date(log.created_at).toISOString().split('T')[0]}</span>
                        <br />
                        <span className="text-xs text-gray-400 dark:text-[#64748B]">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#06B4C9]/10 text-[#06B4C9] rounded-full flex items-center justify-center text-xs font-bold">
                            {log.actor?.full_name ? log.actor.full_name[0] : 'S'}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{log.actor?.full_name || 'System'}</span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-[#64748B] ml-8">{log.actor?.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-800 dark:text-[#E2E8F0]">{log.description}</p>
                        {log.target && (
                          <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-1">
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
          {logs.length > 0 && (
            <div className="px-6 py-2 border-t border-gray-100 dark:border-[#1E2536]">
              <Pagination currentPage={logPage} totalItems={logs.length} itemsPerPage={LOGS_PER_PAGE} onPageChange={setLogPage} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}