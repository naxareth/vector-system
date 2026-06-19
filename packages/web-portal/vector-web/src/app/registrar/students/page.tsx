'use client';
import { useState, useEffect, useRef } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import Pagination from '@/components/shared/Pagination';
import HelpTip from '@/components/shared/HelpTip';

interface CredentialLog {
  id: string;
  skill_name: string;
  issued_at: string;

  certificate_number?: string;
  private_notes?: string;
  user: { full_name: string } | null;
}

const ROWS_PER_PAGE = 10;
const STATUS_OPTIONS = ['All', 'Verified', 'Pending', 'Revoked'];

const AVATAR_PALETTE = [
  'bg-orange-100 !text-orange-500 dark:bg-orange-500/15 dark:text-orange-400',
  'bg-purple-100 text-purple-500 dark:bg-purple-500/15 dark:text-purple-400',
  'bg-violet-100 text-violet-500 dark:bg-violet-500/15 dark:text-violet-400',
  'bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400',
  'bg-fuchsia-100 text-fuchsia-500 dark:bg-fuchsia-500/15 dark:text-fuchsia-400',
  'bg-indigo-100 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-400',
  'bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400',
  'bg-pink-100 text-pink-500 dark:bg-pink-500/15 dark:text-pink-400',
];

function avatarColor(name: string) {
  if (!name) return 'bg-gray-100 text-gray-400';
  const hash = name.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string) {
  return name ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?';
}



function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TH = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 ${className}`}>
    {children}
  </th>
);

const Dash = () => <span className="text-gray-300 dark:text-[#283042] text-xs select-none">None</span>;

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
    {label}
    <button onClick={onRemove} className="hover:opacity-70">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </span>
);

export default function ManageCredentials() {
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<CredentialLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [credPage, setCredPage] = useState(1);
  const [noteModal, setNoteModal] = useState<{ name: string; note: string; cert: string } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/registrar/credentials')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setCredentials)
      .catch(err => console.error('Error fetching ledger:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCredPage(1); }, [searchQuery, selectedStatus, selectedSkills]);

  const allSkills = Array.from(new Set(credentials.map(c => c.skill_name))).sort();

  const filtered = credentials.filter(cred => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      (cred.user?.full_name?.toLowerCase() || '').includes(term) ||

      cred.skill_name.toLowerCase().includes(term) ||
      (cred.certificate_number?.toLowerCase() || '').includes(term);
    const matchesSkill = selectedSkills.length === 0 || selectedSkills.includes(cred.skill_name);
    const matchesStatus = selectedStatus === 'All';
    return matchesSearch && matchesSkill && matchesStatus;
  });

  const paginated = filtered.slice((credPage - 1) * ROWS_PER_PAGE, credPage * ROWS_PER_PAGE);
  const activeFilterCount = (selectedStatus !== 'All' ? 1 : 0) + selectedSkills.length;
  const clearFilters = () => { setSelectedStatus('All'); setSelectedSkills([]); };

  return (
    <RegistrarLayout>
      <div className="max-w-7xl mx-auto px-1">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Issued Records
            <HelpTip text="A complete audit log of every certificate issued. Search by student name, certificate type, or serial number." />
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {credentials.length > 0 ? `${credentials.length} total records issued` : 'Track and verify all issued certificates'}
          </p>
        </div>

        {/* Summary Stats */}
        {credentials.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Total Issued</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{credentials.length}</p>
            </div>
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Certificate Types</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{allSkills.length}</p>
            </div>
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Unique Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {new Set(credentials.map(c => c.user?.full_name).filter(Boolean)).size}
              </p>
            </div>
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">This Month</p>
              <p className="text-2xl font-bold text-[#06B4C9] mt-1">
                {credentials.filter(c => {
                  const d = new Date(c.issued_at);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by student, certificate type, or ID…"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-[#1E2536] bg-white dark:bg-[#0E1220] text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 focus:border-[#06B4C9] transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                activeFilterCount > 0
                  ? 'border-[#06B4C9] bg-[#06B4C9]/10 text-[#06B4C9]'
                  : 'border-gray-200 dark:border-[#1E2536] bg-white dark:bg-[#0E1220] text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-[#283042]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[#06B4C9] text-white rounded-full">{activeFilterCount}</span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0E1220] border border-gray-200 dark:border-[#1E2536] rounded-xl z-30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1E2536]">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">Filters</span>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-[#06B4C9] hover:underline font-medium">Clear all</button>}
                </div>
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1E2536]">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-slate-500 mb-2">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s} onClick={() => setSelectedStatus(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          selectedStatus === s
                            ? 'bg-[#06B4C9] border-[#06B4C9] text-white'
                            : 'border-gray-200 dark:border-[#283042] text-gray-600 dark:text-slate-400 hover:border-[#06B4C9] hover:text-[#06B4C9]'
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                {allSkills.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-slate-500 mb-2">Certificate Type</p>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                      {allSkills.map(skill => (
                        <label key={skill} className="flex items-center gap-2.5 cursor-pointer group">
                          <input type="checkbox" checked={selectedSkills.includes(skill)}
                            onChange={() => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])}
                            className="w-3.5 h-3.5 accent-[#06B4C9] rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-[#06B4C9] transition-colors truncate">{skill}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {(selectedSkills.length > 0 || selectedStatus !== 'All') && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedStatus !== 'All' && <FilterChip label={`Status: ${selectedStatus}`} onRemove={() => setSelectedStatus('All')} />}
            {selectedSkills.map(skill => <FilterChip key={skill} label={skill} onRemove={() => setSelectedSkills(prev => prev.filter(s => s !== skill))} />)}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden bg-white dark:bg-[#0E1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#1E2536] bg-gray-50/60 dark:bg-[#131825]">
                  <TH>Student</TH>
                  <TH>Certificate</TH>
                  <TH className="hidden sm:table-cell">Cert No.</TH>
                  <TH className="hidden lg:table-cell">Date</TH>
                  <TH className="hidden md:table-cell">Notes</TH>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-7 h-7 border-2 border-[#06B4C9] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-400 dark:text-slate-500">Loading records…</span>
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#131825] flex items-center justify-center mb-1">
                        <svg className="w-6 h-6 text-gray-300 dark:text-[#283042]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-400">No records found</p>
                      <p className="text-xs text-gray-400 dark:text-slate-600">Try adjusting your search or filters</p>
                      {activeFilterCount > 0 && <button onClick={clearFilters} className="mt-1 text-xs text-[#06B4C9] hover:underline font-medium">Clear filters</button>}
                    </div>
                  </td></tr>
                ) : paginated.map((cred, i) => {
                  const name = cred.user?.full_name || '';
                  return (
                    <tr key={cred.id} className={`group transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03] ${i < paginated.length - 1 ? 'border-b border-gray-100 dark:border-[#1E2536]' : ''}`}>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(name)}`}>
                            {getInitials(name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
                              {name || <span className="italic text-gray-400">Restricted</span>}
                            </p>

                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/15 whitespace-nowrap">
                          {cred.skill_name}
                        </span>
                      </td>

                      <td className="hidden sm:table-cell px-5 py-3.5">
                        <span className="font-mono text-[11px] text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-[#131825] px-2 py-0.5 rounded">
                          {cred.certificate_number || 'None'}
                        </span>
                      </td>

                      <td className="hidden lg:table-cell px-5 py-3.5 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {cred.issued_at ? formatDate(cred.issued_at) : 'None'}
                      </td>

                      <td className="hidden md:table-cell px-5 py-3.5">
                        {cred.private_notes ? (
                          <button
                            onClick={() => setNoteModal({ name: cred.user?.full_name || 'Unknown', note: cred.private_notes!, cert: cred.skill_name })}
                            className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-slate-400 hover:text-[#06B4C9] transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            View note
                          </button>
                        ) : <Dash />}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                          Verified
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-[#1E2536] bg-gray-50/40 dark:bg-[#131825]/60 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Showing <span className="font-medium text-gray-600 dark:text-slate-400">{(credPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(credPage * ROWS_PER_PAGE, filtered.length)}</span> of <span className="font-medium text-gray-600 dark:text-slate-400">{filtered.length}</span> records
              </p>
              <Pagination currentPage={credPage} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCredPage} />
            </div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setNoteModal(null)}>
          <div className="relative w-full max-w-md bg-white dark:bg-[#0E1220] rounded-2xl border border-gray-200 dark:border-[#1E2536] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1E2536]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">Private Note</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{noteModal.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{noteModal.cert}</p>
              </div>
              <button onClick={() => setNoteModal(null)} className="ml-4 mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1E2536] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#06B4C9]/10 flex items-center justify-center mt-0.5">
                <svg className="w-3.5 h-3.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
              </div>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{noteModal.note}</p>
            </div>
            <div className="px-5 py-3 bg-gray-50/60 dark:bg-[#131825] border-t border-gray-100 dark:border-[#1E2536] flex justify-end">
              <button onClick={() => setNoteModal(null)} className="px-4 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-[#0E1220] border border-gray-200 dark:border-[#1E2536] text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-[#283042] transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </RegistrarLayout>
  );
}