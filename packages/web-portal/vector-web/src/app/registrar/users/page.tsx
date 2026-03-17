'use client';
import { useState, useEffect, useRef } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import HelpTip from '@/components/shared/HelpTip';

interface UserCredential {
  id: string;
  skill_name: string;
  issued_at: string;
  transaction_hash: string;
  token_id: string;
  revoked: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  wallet_address: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  credentials: UserCredential[];
  totalCredentials: number;
  activeCredentials: number;
}

const ROWS_PER_PAGE = 10;

const AVATAR_PALETTE = [
  'bg-orange-100 !text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
  'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400',
  'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400',
];

function avatarColor(name: string) {
  if (!name) return 'bg-gray-100 text-gray-400';
  const hash = name.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string) {
  return name ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?';
}

function shortWallet(addr: string | null) {
  if (!addr) return 'Not Connected';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const TH = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 ${className}`}>
    {children}
  </th>
);

const BadgeRole = ({ role }: { role: string }) => {
  const colors =
    role === 'super_admin'
      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
      : role === 'registrar'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
      : 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400';

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${colors}`}>
      {role.replace('_', ' ')}
    </span>
  );
};

const BadgeStatus = ({ status }: { status: string }) => {
  const colors =
    status === 'active'
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
      : status === 'suspended'
      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400';

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${colors}`}>
      {status}
    </span>
  );
};

export default function ManageUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/registrar/users');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch users');
        }
        
        setUsers(Array.isArray(data) ? data : []);
        setFetchError('');
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to fetch users';
        console.error('Error fetching users:', error);
        setFetchError(errorMsg);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filtered = users.filter((user) => {
    const term = searchQuery.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      (user.wallet_address?.toLowerCase() || '').includes(term)
    );
  });

  const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);

  const handleRevokeCredential = async (credential: UserCredential) => {
    if (!selectedUser) return;

    if (!confirm(`Revoke credential "${credential.skill_name}"? This action cannot be undone.`)) {
      return;
    }

    setRevoking(true);
    setRevokeError('');

    try {
      const response = await fetch('/api/registrar/revoke-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: credential.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke credential');
      }

      // Refresh the selected user's data
      const updatedUser = {
        ...selectedUser,
        credentials: selectedUser.credentials.map((c) =>
          c.id === credential.id ? { ...c, revoked: true } : c
        ),
        activeCredentials: selectedUser.activeCredentials - 1,
      };
      setSelectedUser(updatedUser);

      // Update users list
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                credentials: u.credentials.map((c) =>
                  c.id === credential.id ? { ...c, revoked: true } : c
                ),
                activeCredentials: u.activeCredentials - 1,
              }
            : u
        )
      );
    } catch (error: any) {
      setRevokeError(error.message || 'Failed to revoke credential');
      console.error('Error revoking credential:', error);
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <RegistrarLayout>
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#06B4C9] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-[#94A3B8] text-sm font-medium">Loading users…</p>
          </div>
        </div>
      </RegistrarLayout>
    );
  }

  return (
    <RegistrarLayout>
      <div className="max-w-7xl mx-auto px-4">
        {!selectedUser ? (
          <>
            {/* Header */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                All Users
                <HelpTip text="View all users, their profile information, and manage their issued credentials. Click on any user to view details." />
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {users.length > 0 ? `${users.length} total users` : 'No users found'}
              </p>
            </div>

            {/* Error Message */}
            {fetchError && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Error:</strong> {fetchError}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Make sure you have issued credentials to students. You can only manage students you've issued certificates to.
                </p>
              </div>
            )}

            {/* Summary Stats */}
            {users.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</p>
                </div>
                <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Students</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.filter(u => u.role === 'student').length}</p>
                </div>
                <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Registrars</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.filter(u => u.role === 'registrar').length}</p>
                </div>
                <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Total Credentials</p>
                  <p className="text-2xl font-bold text-[#06B4C9] mt-1">{users.reduce((sum, u) => sum + u.totalCredentials, 0)}</p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search by name, email, or wallet address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-[#283042] bg-white dark:bg-[#131825] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06B4C9]"
              />
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#283042] bg-gray-50 dark:bg-[#131825]">
                      <TH>User</TH>
                      <TH>Role</TH>
                      <TH>Status</TH>
                      <TH>Wallet</TH>
                      <TH>Credentials</TH>
                      <TH>Joined</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="border-b border-gray-100 dark:border-[#283042] hover:bg-gray-50 dark:hover:bg-[#131825] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(user.full_name)}`}>
                              {getInitials(user.full_name)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{user.full_name}</p>
                              <p className="text-xs text-gray-500 dark:text-[#94A3B8]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <BadgeRole role={user.role} />
                        </td>
                        <td className="px-4 py-4">
                          <BadgeStatus status={user.status} />
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 dark:text-[#94A3B8] font-mono">{shortWallet(user.wallet_address)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.activeCredentials}</span>
                            <span className="text-xs text-gray-500 dark:text-[#94A3B8]">of {user.totalCredentials}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 dark:text-[#94A3B8]">{formatDate(user.created_at)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {paginated.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-gray-500 dark:text-[#94A3B8] text-sm">No users found matching your search.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#283042] bg-white dark:bg-[#0E1220] text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#131825] transition-colors text-sm font-medium"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-[#94A3B8]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#283042] bg-white dark:bg-[#0E1220] text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#131825] transition-colors text-sm font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* User Detail View */}
            <div className="mb-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex items-center gap-2 text-[#06B4C9] hover:text-[#04a3b5] font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Users
              </button>
            </div>

            {/* User Header */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold ${avatarColor(selectedUser.full_name)}`}>
                    {getInitials(selectedUser.full_name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser.full_name}</h2>
                    <p className="text-gray-600 dark:text-[#94A3B8] mt-1">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeRole role={selectedUser.role} />
                  <BadgeStatus status={selectedUser.status} />
                </div>
              </div>

              {/* User Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-[#283042]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 font-mono">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Wallet Address</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 font-mono">{shortWallet(selectedUser.wallet_address)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Member Since</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Last Updated</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(selectedUser.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Issued Credentials
                  <span className="text-sm font-normal text-gray-500 dark:text-[#94A3B8]">
                    ({selectedUser.credentials.filter(c => !c.revoked).length} active)
                  </span>
                </h3>
              </div>

              {revokeError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <p className="text-sm text-red-700 dark:text-red-400">{revokeError}</p>
                </div>
              )}

              {selectedUser.credentials.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-[#94A3B8] py-8">No credentials issued to this user.</p>
              ) : (
                <>
                  {/* Active Credentials */}
                  <div className="space-y-3 mb-6">
                    {selectedUser.credentials.filter(c => !c.revoked).map((cred) => (
                      <div
                        key={cred.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-green-500/5 dark:border-green-500/20"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">{cred.skill_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 dark:text-[#94A3B8]">
                              Issued: {formatDate(cred.issued_at)}
                            </span>
                            {cred.token_id && (
                              <span className="text-xs text-gray-500 dark:text-[#94A3B8] font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                                Token ID: {cred.token_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeCredential(cred)}
                          disabled={revoking}
                          className="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-white border border-red-200 hover:bg-red-600 hover:border-red-600 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {revoking ? 'Revoking...' : 'Revoke (Burn)'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Revoked Archive */}
                  {selectedUser.credentials.some(c => c.revoked) && (
                    <div className="pt-4 border-t border-gray-200 dark:border-[#283042]">
                      <details className="group">
                        <summary className="cursor-pointer flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-[#94A3B8] hover:text-gray-900 dark:hover:text-white">
                          <svg className="w-4 h-4 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Revoked Archive ({selectedUser.credentials.filter(c => c.revoked).length})
                        </summary>
                        <div className="mt-3 space-y-2 opacity-60">
                          {selectedUser.credentials.filter(c => c.revoked).map((cred) => (
                            <div
                              key={cred.id}
                              className="p-3 rounded-lg border bg-red-50/30 border-red-100/50 dark:bg-red-500/5 dark:border-red-500/10"
                            >
                              <p className="text-sm font-medium text-red-700 dark:text-red-400 line-through">
                                {cred.skill_name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 dark:text-[#94A3B8]">
                                  {formatDate(cred.issued_at)}
                                </span>
                                {cred.transaction_hash && (
                                  <span className="text-xs text-gray-500 dark:text-[#94A3B8] font-mono">
                                    TX: {cred.transaction_hash.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </RegistrarLayout>
  );
}
