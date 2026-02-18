'use client';
import { useState, useEffect } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
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

  return (
    <RegistrarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Credential Audit Log</h1>
          <p className="text-sm md:text-base text-gray-600">
            Immutable record of all credentials issued on the Polygon blockchain + Encrypted Database Records.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              placeholder="Search by Student, Wallet, Skill, or Cert ID..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Credential</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Cert No.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Secure Notes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading ledger...</td></tr>
                ) : filteredCredentials.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No records found.</td></tr>
                ) : (
                  filteredCredentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${cred.user ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>
                            {cred.user?.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{cred.user?.full_name || 'Restricted'}</p>
                            <p className="text-xs text-gray-500 font-mono">{cred.user?.wallet_address ? cred.user.wallet_address.slice(0,6)+'...' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cred.skill_name}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {cred.certificate_number || '-'}
                      </td>

                      {/* 🔒 Notes Column */}
                      <td className="px-6 py-4">
                        {cred.private_notes ? (
                          <div className="group relative w-max">
                            <span className="cursor-help text-purple-600 text-xs font-medium border-b border-dotted border-purple-600">
                              View Secure Note
                            </span>
                            {/* The Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                              <p className="font-bold text-gray-400 mb-1 uppercase tracking-wider text-[10px]">Decrypted Content:</p>
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
                            className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center gap-1"
                          >
                            View TX
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
        </div>
      </div>
    </RegistrarLayout>
  );
}