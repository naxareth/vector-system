'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import EmployerLayout from '@/components/dashboard/EmployerLayout';
import StatusDropdown from '@/components/dashboard/StatusDropdown';
import { supabase } from '@/lib/supabaseClient';

interface Application {
  id: string;
  status: string;
  applied_at: string;
  cover_note: string | null;
  cvr_export_id: string | null;
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  isVerified?: boolean;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
  };
}

interface JobPosting {
  id: string;
  title: string;
}

const AV_COLORS = ['bg-[#06B4C9]', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
function initials(name: string) {
  const p = name.trim().split(' ');
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}
function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

export default function CandidatesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'match'>('newest');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch employer's jobs
        const jobsRes = await fetch(`/api/jobs?employer_id=${user.id}&limit=100`);
        if (!jobsRes.ok) return;
        const jobsJson = await jobsRes.json();
        const postings: JobPosting[] = jobsJson.jobs || [];
        setJobs(postings);

        // Fetch applicants across all jobs
        let allApps: Application[] = [];
        await Promise.allSettled(
          postings.map(async p => {
            const res = await fetch(`/api/jobs/${p.id}/applicants`);
            if (!res.ok) return;
            const data = await res.json();
            const apps = (data.applications || []).map((app: any) => ({
              ...app,
              job: { id: p.id, title: p.title }
            }));
            allApps = [...allApps, ...apps];
          })
        );
        setApplications(allApps);
      } catch (e) {
        console.error('Failed to load candidates data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateStatus = async (jobId: string, applicationId: string, newStatus: string) => {
    try {
      const csrfToken = typeof document !== 'undefined'
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
        : '';

      const res = await fetch(`/api/jobs/${jobId}/applicants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ application_id: applicationId, status: newStatus })
      });

      if (res.ok) {
        setApplications(prev => prev.map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        ));
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  // Filtered & Sorted applications
  const filtered = applications.filter(app => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      app.student.full_name.toLowerCase().includes(q) ||
      app.student.email.toLowerCase().includes(q) ||
      app.job.title.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesJob = jobFilter === 'all' || app.job.id === jobFilter;

    return matchesSearch && matchesStatus && matchesJob;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'newest') return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    if (sortOrder === 'oldest') return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
    if (sortOrder === 'match') return (b.matchScore ?? 0) - (a.matchScore ?? 0);
    return 0;
  });

  // Summary counts
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const reviewingCount = applications.filter(a => a.status === 'reviewing').length;
  const offeredCount = applications.filter(a => a.status === 'offered' || a.status === 'accepted').length;

  return (
    <EmployerLayout>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Candidates</h1>
        <p className="text-sm text-gray-500 dark:text-[#64748B] mt-0.5">
          Review and manage all student job applications across your postings.
        </p>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wide mb-1.5">Total Applications</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{loading ? '…' : totalCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#06B4C9]/10">
            <svg className="w-6 h-6 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wide mb-1.5">Pending Review</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{loading ? '…' : pendingCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-500/10">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wide mb-1.5">Under Review</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{loading ? '…' : reviewingCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-500/10">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wide mb-1.5">Offered / Hired</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{loading ? '…' : offeredCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/10">
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
      </div>

      {/* ── Toolbar / Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search candidate name, email, or position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#4A5568] focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 focus:border-[#06B4C9] transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-[#64748B] font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] text-gray-700 dark:text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="interview">Interview</option>
            <option value="offered">Offered</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Position Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-[#64748B] font-medium whitespace-nowrap">Position:</span>
          <select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] text-gray-700 dark:text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 transition-colors max-w-[180px] truncate"
          >
            <option value="all">All Positions</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-[#64748B] font-medium whitespace-nowrap">Sort:</span>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
            className="text-xs bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] text-gray-700 dark:text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 transition-colors"
          >
            <option value="newest">Newest Applied</option>
            <option value="oldest">Oldest Applied</option>
            <option value="match">Highest Match Score</option>
          </select>
        </div>
      </div>

      {/* ── All Applications Table ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1E2536] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">All Applications</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#06B4C9]/10 text-[#06B4C9] font-semibold">
              {sorted.length} candidate{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading candidates…</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-[#06B4C9]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">No candidate applications found</p>
            <p className="text-xs text-gray-500 dark:text-[#64748B]">
              {search || statusFilter !== 'all' || jobFilter !== 'all'
                ? 'Try adjusting your search query or clear your filter criteria.'
                : 'Candidates will appear here when student applications are submitted.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-[#1A2030] border-b border-gray-100 dark:border-[#1E2536] text-gray-500 dark:text-[#64748B] text-xs uppercase tracking-wide font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Candidate</th>
                  <th className="px-6 py-3.5">Applied Position</th>
                  <th className="px-6 py-3.5">Skill Match</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Applied Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                {sorted.map(app => {
                  const ini = initials(app.student.full_name);
                  const ac = avColor(app.student.full_name);
                  const mp = app.matchScore !== undefined ? Math.round(app.matchScore * 100) : null;

                  return (
                    <tr key={app.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.03] transition-colors">
                      {/* Candidate Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${ac} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {ini}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/employer/postings/${app.job.id}/applicants/${app.id}/resume`}
                              className="font-semibold text-gray-900 dark:text-white hover:text-[#06B4C9] transition-colors truncate block"
                            >
                              {app.student.full_name}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-[#64748B] truncate">{app.student.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Applied Position */}
                      <td className="px-6 py-4">
                        <Link
                          href={`/employer/postings/${app.job.id}/applicants`}
                          className="font-medium text-gray-700 dark:text-gray-300 hover:text-[#06B4C9] transition-colors truncate block max-w-[200px]"
                        >
                          {app.job.title}
                        </Link>
                      </td>

                      {/* Skill Match */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {mp !== null ? (
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              mp >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              mp >= 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}>
                              {mp}% match
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                          {app.isVerified && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-6 py-4">
                        <StatusDropdown
                          value={app.status}
                          onChange={(newStatus) => updateStatus(app.job.id, app.id, newStatus)}
                        />
                      </td>

                      {/* Applied Date */}
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-[#64748B]">
                        {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/employer/postings/${app.job.id}/applicants/${app.id}/resume`}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#06B4C9] hover:bg-[#0598AD] !text-white rounded-lg transition-colors shadow-sm inline-flex items-center gap-1"
                          >
                            Review
                          </Link>
                          <a
                            href={`mailto:${app.student.email}`}
                            title="Email Candidate"
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors inline-flex items-center"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EmployerLayout>
  );
}
