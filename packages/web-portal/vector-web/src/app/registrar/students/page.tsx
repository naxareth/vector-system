'use client';
import { useState, useEffect } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import Pagination from '@/components/shared/Pagination';
import HelpTip from '@/components/shared/HelpTip';
// ❌ REMOVED: import { decryptData } from '@/lib/encryption'; (Security Fix)

interface CredentialLog {
  id: string;
  skill_name: string;
  issued_at: string;
  transaction_hash: string;
  certificate_number?: string;
  private_notes?: string;      // Now comes decrypted from API
  user: {
    full_name: string;
    wallet_address: string;
  } | null;
}

export default function ManageCredentials() {
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<CredentialLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      // 🚀 CHANGED: Fetch from Secure API instead of direct Supabase
      const res = await fetch('/api/registrar/credentials');

      if (!res.ok) {
        throw new Error('Failed to fetch credentials');
      }

      const data = await res.json();
      setCredentials(data);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCredentials = credentials.filter(cred => {
    const term = searchQuery.toLowerCase();
    const name = cred.user?.full_name?.toLowerCase() || 'unknown';
    const wallet = cred.user?.wallet_address?.toLowerCase() || '';
    const skill = cred.skill_name.toLowerCase();
    const cert = cred.certificate_number?.toLowerCase() || '';
    return name.includes(term) || wallet.includes(term) || skill.includes(term) || cert.includes(term);
  });

  const ROWS_PER_PAGE = 10;
  const [credPage, setCredPage] = useState(1);
  const paginatedCreds = filteredCredentials.slice((credPage - 1) * ROWS_PER_PAGE, credPage * ROWS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => { setCredPage(1); }, [searchQuery]);

  return (
    <RegistrarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Issued Records <HelpTip text="This is a complete audit log of every certificate you have issued. You can search by student name, certificate type, or serial number. Each record includes a 'View Proof' link that opens the public blockchain transaction — anyone can use it to verify the certificate is authentic." /></h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-[#94A3B8]">
            A secure list of certificates and records issued to students.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-[#0E1220] rounded-xl shadow-sm border border-gray-200 dark:border-[#1E2536] p-6 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
              <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-[#283042] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B4C9] text-gray-900 dark:text-white bg-white dark:bg-[#131825]"
              placeholder="Search by name, certificate, or ID..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#0E1220] rounded-xl shadow-sm border border-gray-200 dark:border-[#1E2536] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#131825] border-b border-gray-200 dark:border-[#1E2536]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-[#94A3B8] uppercase">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-[#94A3B8] uppercase">Certificate</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-[#94A3B8] uppercase">Cert No.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-[#94A3B8] uppercase">Notes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-[#94A3B8] uppercase">Proof <HelpTip size={13} text="Each certificate is recorded on the blockchain. 'View Proof' opens the public transaction record on Polygonscan — a third-party site where anyone (employers, other institutions) can independently verify the certificate is genuine and unaltered." /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-[#64748B]">Loading records...</td></tr>
                ) : filteredCredentials.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-[#64748B]">No records found.</td></tr>
                ) : (
                  paginatedCreds.map((cred) => (
                    <tr key={cred.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${cred.user ? 'bg-accent-10 text-accent' : 'bg-gray-200 text-gray-500'}`}>
                            {cred.user?.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{cred.user?.full_name || 'Restricted'}</p>
                            <p className="text-xs text-gray-500 dark:text-[#64748B] font-mono">{cred.user?.wallet_address ? cred.user.wallet_address.slice(0, 6) + '...' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cred.skill_name}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#94A3B8] font-mono">
                        {cred.certificate_number || '-'}
                      </td>

                      {/* 🔒 Notes Column */}
                      <td className="px-6 py-4">
                        {cred.private_notes ? (
                          <div className="group relative w-max">
                            <span className="cursor-help text-accent text-xs font-medium border-b border-dotted border-accent">
                              View Note
                            </span>
                            {/* The Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                              <p className="font-bold text-gray-400 mb-1 uppercase tracking-wider text-[10px]">Note:</p>
                              {/* ✅ Render directly (it's already decrypted by API) */}
                              {cred.private_notes}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {cred.transaction_hash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${cred.transaction_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:text-accent-dark text-xs font-medium flex items-center gap-1"
                          >
                            View Proof
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={credPage} totalItems={filteredCredentials.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCredPage} />
        </div>
      </div>
    </RegistrarLayout>
  );
}