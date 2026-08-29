'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import EmployerLayout from '@/components/dashboard/EmployerLayout';
import { supabase } from '@/lib/supabaseClient';

interface JobPosting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  location?: string | null;
  job_type?: string | null;
  salary_range?: string | null;
  description?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  expires_at?: string | null;
  _count?: { applications: number };
}

// ── Utility: time-ago string ─────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Status badge helper ───────────────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    draft:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    closed: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    open:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
  const cls = map[status.toLowerCase()] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  return { cls, label: status.charAt(0).toUpperCase() + status.slice(1) };
}

// ── More-options dropdown ─────────────────────────────────────────────────────
function MoreMenu({ onClose }: { onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        title="More options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 bg-[#131825] border border-[#1E2536] rounded-xl shadow-2xl py-1 animate-in fade-in slide-in-from-top-2 duration-100">
          {[
            { label: 'Edit Posting',   icon: '✏️' },
            { label: 'Duplicate',      icon: '📋' },
            { label: 'Close Posting',  icon: '🔒' },
            { label: 'Delete',         icon: '🗑️', danger: true },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); onClose?.(); }}
              className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Job Posting Card ──────────────────────────────────────────────────────────
function JobCard({ job }: { job: JobPosting }) {
  const apps = job._count?.applications ?? 0;
  const views = Math.floor(apps * 7.3 + 12); // simulated view count from applicants ratio
  const convRate = views > 0 ? Math.round((apps / views) * 100) : 0;
  const badge = statusBadge(job.status);

  return (
    <div className="group bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-5 hover:border-[#06B4C9]/40 hover:shadow-lg hover:shadow-[#06B4C9]/5 transition-all duration-200">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {job.title}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-[#64748B] flex-wrap">
            {job.job_type && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {job.job_type}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Posted {timeAgo(job.created_at)}
            </span>
            {job.salary_range && (
              <span className="text-[#06B4C9] font-semibold">{job.salary_range}</span>
            )}
          </div>
        </div>
        <MoreMenu />
      </div>

      {/* Description snippet */}
      {job.description && (
        <p className="text-xs text-gray-500 dark:text-[#64748B] line-clamp-2 mb-3 leading-relaxed">
          {job.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-5 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <svg className="w-3.5 h-3.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{apps} Applicant{apps !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{views} Views</span>
        </div>
        {/* Conversion progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-[#1A2030] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#06B4C9] to-[#06B4C9]/70 transition-all duration-500"
              style={{ width: `${Math.min(convRate * 3, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 whitespace-nowrap">{convRate}% conversion</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-[#1E2536]">
        <Link
          href={`/employer/postings/${job.id}/applicants`}
          className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          View Details
        </Link>
        <Link
          href={`/employer/postings/${job.id}/applicants`}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#06B4C9] hover:bg-[#06B4C9]/85 !text-white transition-colors shadow-sm"
        >
          View Applicants
          {apps > 0 && (
            <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full">{apps}</span>
          )}
        </Link>
      </div>
    </div>
  );
}

const PH_LOCATIONS = [
  'Remote (Philippines)',
  'Hybrid - Metro Manila',
  'Manila, Metro Manila',
  'Makati City, Metro Manila',
  'Taguig City (BGC)',
  'Cebu City, Cebu',
];

const SALARY_PRESETS = [
  '₱15,000 – ₱25,000',
  '₱25,000 – ₱40,000',
  '₱40,000 – ₱60,000',
  '₱60,000 – ₱90,000',
  '₱90,000 – ₱120,000',
  '₱120,000 – ₱180,000',
  '₱180,000+',
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobPostingsManagement() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'closed'>('active');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'applicants'>('newest');

  // Job Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', location: '', job_type: 'Full-time',
    salary_range: '', required_skills: '', preferred_skills: '',
    experience_level: '', duration_value: '', duration_unit: 'Months',
    pay_type: 'Monthly',
  });

  const [salaryPreset, setSalaryPreset] = useState('');
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setShowLocDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Skill chip state (UI layer — feeds into formData.required_skills / preferred_skills on submit)
  const [reqSkills, setReqSkills] = useState<string[]>([]);
  const [prefSkills, setPrefSkills] = useState<string[]>([]);
  const [reqSkillInput, setReqSkillInput] = useState('');
  const [prefSkillInput, setPrefSkillInput] = useState('');

  // Employer questions (internal reference only — never sent to applicants)
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);
  const [editingQVal, setEditingQVal] = useState('');

  const showDuration = formData.job_type === 'Part-time' || formData.job_type === 'Contract';

  const addReqSkill = () => {
    const val = reqSkillInput.trim();
    if (val && !reqSkills.includes(val)) setReqSkills(prev => [...prev, val]);
    setReqSkillInput('');
  };
  const addPrefSkill = () => {
    const val = prefSkillInput.trim();
    if (val && !prefSkills.includes(val)) setPrefSkills(prev => [...prev, val]);
    setPrefSkillInput('');
  };
  const addQuestion = () => {
    const val = questionInput.trim();
    if (val) { setQuestions(prev => [...prev, val]); setQuestionInput(''); }
  };

  useEffect(() => {
    const fetchPostings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const res = await fetch(`/api/jobs?employer_id=${user.id}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          setPostings(data.jobs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPostings();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const csrfToken = typeof document !== 'undefined'
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
        : '';

      const payload = {
        ...formData,
        // Use chip arrays if any chips were added; fall back to comma-input for compatibility
        required_skills: reqSkills.length > 0
          ? reqSkills
          : formData.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        preferred_skills: prefSkills.length > 0
          ? prefSkills
          : formData.preferred_skills.split(',').map(s => s.trim()).filter(Boolean),
        // employer_questions is internal only — stored on formData but NOT sent to applicants
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      try {
        if (contentType.includes('application/json')) data = await res.json();
      } catch { /* ignore */ }

      if (!res.ok) {
        let errMessage = 'Failed to create job';
        if (typeof data?.error === 'string') errMessage = data.error;
        else if (data?.error && typeof data.error === 'object')
          errMessage = Object.values(data.error).flat().join(', ');
        else if (res.status === 401) errMessage = 'Your session has expired. Please refresh or log in again.';
        else if (res.status === 403) errMessage = 'Access denied. Employer account required.';
        else errMessage = `Server error (${res.status}). Please verify your company profile or try again.`;
        throw new Error(errMessage);
      }

      setShowCreateModal(false);
      setFormData({ title: '', description: '', location: '', job_type: 'Full-time', salary_range: '', required_skills: '', preferred_skills: '', experience_level: '', duration_value: '', duration_unit: 'Months', pay_type: 'Monthly' });
      setSalaryPreset('');
      setReqSkills([]); setPrefSkills([]); setReqSkillInput(''); setPrefSkillInput('');
      setQuestions([]); setQuestionInput('');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const r = await fetch(`/api/jobs?employer_id=${user.id}&limit=100`);
        if (r.ok) { const d = await r.json(); setPostings(d.jobs || []); }
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const counts = {
    active: postings.filter(p => p.status === 'active' || p.status === 'open').length,
    draft:  postings.filter(p => p.status === 'draft').length,
    closed: postings.filter(p => p.status === 'closed').length,
  };

  const tabFiltered = postings.filter(p => {
    if (activeTab === 'active') return p.status === 'active' || p.status === 'open';
    if (activeTab === 'draft')  return p.status === 'draft';
    if (activeTab === 'closed') return p.status === 'closed';
    return true;
  });

  const searched = tabFiltered.filter(p =>
    !search.trim() ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.location?.toLowerCase().includes(search.toLowerCase()))
  );

  const statusFiltered = searched.filter(p =>
    statusFilter === 'all' || p.status === statusFilter
  );

  const sorted = [...statusFiltered].sort((a, b) => {
    if (sortOrder === 'newest')    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortOrder === 'oldest')    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortOrder === 'applicants') return (b._count?.applications ?? 0) - (a._count?.applications ?? 0);
    return 0;
  });

  const totalApplicants = postings.reduce((s, p) => s + (p._count?.applications ?? 0), 0);

  const tabs = [
    { key: 'active', label: 'Active',  count: counts.active },
    { key: 'draft',  label: 'Drafts',  count: counts.draft  },
    { key: 'closed', label: 'Closed',  count: counts.closed },
  ] as const;

  const inputCls = "w-full px-3 py-2.5 bg-white dark:bg-[#0E1220] border border-gray-200 dark:border-[#283042] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#4A5568] focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 focus:border-[#06B4C9] transition-colors";

  const handleRenew = async (jobId: string) => {
    try {
      const csrfToken = typeof document !== 'undefined'
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
        : '';
        
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        })
      });

      if (res.ok) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const refreshedPostingsResponse = await fetch(`/api/jobs?employer_id=${user.id}`);
          if (refreshedPostingsResponse.ok) {
            const refreshedData = await refreshedPostingsResponse.json();
            setPostings(refreshedData.jobs || []);
          }
        }
      }
    } catch (e) {
      console.error('Failed to renew job:', e);
    }
  };

  return (
    <EmployerLayout>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Postings</h1>
          <p className="text-sm text-gray-500 dark:text-[#64748B] mt-1">Create and manage your job listings.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#06B4C9] hover:bg-[#0598AD] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post New Job
        </button>
      </div>

      {/* ── Search + Filter toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[220px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search job postings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#4A5568] focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 focus:border-[#06B4C9] transition-colors"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-[#64748B] font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] text-gray-700 dark:text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 transition-colors"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
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
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="applicants">Most Applicants</option>
          </select>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-[#1E2536] mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-[#06B4C9] text-[#06B4C9]'
                : 'border-transparent text-gray-500 dark:text-[#64748B] hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key
                ? 'bg-[#06B4C9]/15 text-[#06B4C9]'
                : 'bg-gray-100 dark:bg-[#1E2536] text-gray-500 dark:text-gray-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}

        {/* Right summary */}
        <div className="ml-auto text-xs text-gray-400 dark:text-[#64748B] pr-1">
          {totalApplicants} total applicants · {postings.length} postings
        </div>
      </div>

      {/* ── Card Grid ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-5 w-48 bg-gray-100 dark:bg-[#1A2030] rounded" />
                <div className="h-4 w-16 bg-gray-100 dark:bg-[#1A2030] rounded-full" />
              </div>
              <div className="h-3 w-full bg-gray-100 dark:bg-[#1A2030] rounded mb-2" />
              <div className="h-3 w-2/3 bg-gray-100 dark:bg-[#1A2030] rounded mb-4" />
              <div className="flex gap-4">
                <div className="h-6 w-24 bg-gray-100 dark:bg-[#1A2030] rounded" />
                <div className="h-6 w-32 bg-gray-100 dark:bg-[#1A2030] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#06B4C9]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#06B4C9]/20">
            <svg className="w-8 h-8 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
            {search ? 'No postings match your search' : `No ${activeTab} postings`}
          </p>
          <p className="text-sm text-gray-500 dark:text-[#64748B]">
            {search ? 'Try a different keyword or clear your search.' : `There are currently no ${activeTab} job listings.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* ── Create Job Modal ─────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="bg-white dark:bg-[#0F1623] border border-gray-200 dark:border-[#1E2536] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-x-hidden">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-[#1E2536] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Post New Job</h2>
                <p className="text-xs text-gray-500 dark:text-[#64748B] mt-0.5">Fill in the details to publish a new job listing</p>
              </div>
              <button
                onClick={() => !creating && setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreateJob} className="flex flex-col flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {/* Error banner */}
                {createError && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-red-700 dark:text-red-400 font-semibold">{createError}</p>
                      {(createError.includes('profile') || createError.includes('Employer profile')) && (
                        <Link href="/employer/profile" className="text-red-600 dark:text-red-400 underline text-xs mt-1 inline-block font-semibold">
                          Complete your company profile →
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Frontend Developer"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className={inputCls}
                  />
                </div>

                {/* Job Overview */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Job Overview <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the role, responsibilities, and ideal candidate..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className={inputCls + ' resize-none'}
                  />
                </div>

                {/* Location + Job Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div ref={locRef} className="relative">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Location <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Type or select location…"
                      value={formData.location || ''}
                      onFocus={() => setShowLocDropdown(true)}
                      onChange={e => {
                        setFormData({ ...formData, location: e.target.value });
                        setShowLocDropdown(true);
                      }}
                      className={inputCls}
                    />
                    {showLocDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#283042] rounded-xl shadow-xl overflow-hidden py-1">
                        {PH_LOCATIONS.filter(loc =>
                          !formData.location || loc.toLowerCase().includes(formData.location.toLowerCase())
                        ).map(loc => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, location: loc });
                              setShowLocDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Job Type
                    </label>
                    <select
                      value={formData.job_type || 'Full-time'}
                      onChange={e => setFormData({ ...formData, job_type: e.target.value })}
                      className={inputCls}
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                      <option>Freelance</option>
                    </select>
                  </div>
                </div>

                {/* Experience Level + conditional Duration */}
                <div className={`grid gap-3 ${showDuration ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Experience Level <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                    </label>
                    <select
                      value={formData.experience_level}
                      onChange={e => setFormData({ ...formData, experience_level: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Select level…</option>
                      <option value="entry">Entry Level</option>
                      <option value="junior">Junior</option>
                      <option value="mid">Mid-Level</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead / Manager</option>
                    </select>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-[#4A5568]">Select the level of experience expected for this position.</p>
                  </div>

                  {/* Duration — only for Part-time / Contract */}
                  {showDuration && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                        Duration <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                      </label>
                      <div className="flex gap-2 w-full">
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 6"
                          value={formData.duration_value}
                          onChange={e => setFormData({ ...formData, duration_value: e.target.value })}
                          className={inputCls + ' min-w-0 flex-1'}
                        />
                        <select
                          value={formData.duration_unit}
                          onChange={e => setFormData({ ...formData, duration_unit: e.target.value })}
                          className={inputCls + ' flex-1'}
                        >
                          <option value="Months">Months</option>
                          <option value="Years">Years</option>
                        </select>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-[#4A5568]">Specify the expected duration of the position.</p>
                    </div>
                  )}
                </div>

                {/* Pay Type + Salary Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Pay Type
                    </label>
                    <select
                      value={formData.pay_type || 'Monthly'}
                      onChange={e => {
                        const newPayType = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          pay_type: newPayType,
                          salary_range: salaryPreset ? `${salaryPreset} / ${newPayType}` : prev.salary_range
                        }));
                      }}
                      className={inputCls}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Hourly">Hourly</option>
                      <option value="Annual">Annual</option>
                      <option value="Project-based">Project-based</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Salary Range <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                    </label>
                    <select
                      value={salaryPreset}
                      onChange={e => {
                        const val = e.target.value;
                        setSalaryPreset(val);
                        if (val !== 'custom') {
                          setFormData(prev => ({
                            ...prev,
                            salary_range: val ? `${val} / ${prev.pay_type || 'Monthly'}` : ''
                          }));
                        }
                      }}
                      className={inputCls}
                    >
                      <option value="">Select range…</option>
                      {SALARY_PRESETS.map((preset) => (
                        <option key={preset} value={preset}>{preset}</option>
                      ))}
                      <option value="custom">Custom amount…</option>
                    </select>
                  </div>
                </div>

                {/* Custom Salary Range Input (shown when Custom is selected or manually typing) */}
                {salaryPreset === 'custom' && (
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. ₱45,000 – ₱65,000 / month or Negotiable"
                      value={formData.salary_range}
                      onChange={e => setFormData({ ...formData, salary_range: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                )}

                {/* ── Skills & Expertise ──────────────────────────────────── */}
                <div className="space-y-4">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      Skills &amp; Expertise
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-[#1E2536]" />
                  </div>

                  {/* Required Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Required Skills</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-semibold">Required</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-[#64748B] mb-2.5">Skills candidates must have for this position.</p>
                    {/* Chip list */}
                    {reqSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {reqSkills.map(skill => (
                          <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
                            {skill}
                            <button type="button" onClick={() => setReqSkills(prev => prev.filter(s => s !== skill))} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Add input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a skill and press Enter…"
                        value={reqSkillInput}
                        onChange={e => setReqSkillInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReqSkill(); } }}
                        className={inputCls + ' flex-1'}
                      />
                      <button
                        type="button"
                        onClick={addReqSkill}
                        className="px-3 py-2 text-xs font-semibold bg-[#06B4C9]/10 hover:bg-[#06B4C9]/20 text-[#06B4C9] border border-[#06B4C9]/25 rounded-xl transition-colors whitespace-nowrap"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Bonus Skills (preferred_skills — backend key unchanged) */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Bonus Skills</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-semibold">Optional</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-[#64748B] mb-2.5">Additional skills that would be beneficial but are not required.</p>
                    {/* Chip list */}
                    {prefSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {prefSkills.map(skill => (
                          <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {skill}
                            <button type="button" onClick={() => setPrefSkills(prev => prev.filter(s => s !== skill))} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Add input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a skill and press Enter…"
                        value={prefSkillInput}
                        onChange={e => setPrefSkillInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPrefSkill(); } }}
                        className={inputCls + ' flex-1'}
                      />
                      <button
                        type="button"
                        onClick={addPrefSkill}
                        className="px-3 py-2 text-xs font-semibold bg-[#06B4C9]/10 hover:bg-[#06B4C9]/20 text-[#06B4C9] border border-[#06B4C9]/25 rounded-xl transition-colors whitespace-nowrap"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Employer Questions (internal reference — NOT shown to applicants) ── */}
                <div className="space-y-3">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Employer Questions
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-[#1E2536]" />
                    <span className="text-[10px] text-gray-400 dark:text-[#4A5568] font-medium">Internal only</span>
                  </div>

                  {/* Internal-only notice */}
                  <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-700/30 rounded-xl">
                    <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      <span className="font-bold">Internal reference only.</span> These questions are for your interview preparation and are never sent to or seen by applicants.
                    </p>
                  </div>

                  {/* Saved questions list */}
                  {questions.length > 0 && (
                    <div className="space-y-1.5">
                      {questions.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3 bg-gray-50 dark:bg-[#1A2030] border border-gray-100 dark:border-[#1E2536] rounded-xl group">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-[#4A5568] mt-0.5 w-4 flex-shrink-0">{idx + 1}.</span>
                          {editingQIdx === idx ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editingQVal}
                                onChange={e => setEditingQVal(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); const updated = [...questions]; updated[idx] = editingQVal.trim(); setQuestions(updated); setEditingQIdx(null); }
                                  if (e.key === 'Escape') setEditingQIdx(null);
                                }}
                                className={inputCls + ' text-xs py-1'}
                              />
                              <button type="button" onClick={() => { const updated = [...questions]; updated[idx] = editingQVal.trim(); setQuestions(updated); setEditingQIdx(null); }} className="text-[11px] font-semibold px-2.5 py-1 bg-[#06B4C9]/10 text-[#06B4C9] rounded-lg hover:bg-[#06B4C9]/20 transition-colors">Save</button>
                              <button type="button" onClick={() => setEditingQIdx(null)} className="text-[11px] font-semibold px-2.5 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                            </div>
                          ) : (
                            <>
                              <p className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{q}</p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button type="button" onClick={() => { setEditingQIdx(idx); setEditingQVal(q); }} className="text-[11px] font-semibold px-2 py-0.5 text-[#06B4C9] hover:bg-[#06B4C9]/10 rounded-lg transition-colors">Edit</button>
                                <button type="button" onClick={() => setQuestions(prev => prev.filter((_, i) => i !== idx))} className="text-[11px] font-semibold px-2 py-0.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add question input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Tell us about your experience working with React."
                      value={questionInput}
                      onChange={e => setQuestionInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQuestion(); } }}
                      className={inputCls + ' flex-1 text-xs'}
                    />
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="px-3 py-2 text-xs font-semibold bg-gray-100 dark:bg-[#1E2536] hover:bg-gray-200 dark:hover:bg-[#283042] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#283042] rounded-xl transition-colors whitespace-nowrap"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1E2536] flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50 dark:bg-[#0B0F19] rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => !creating && setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-[#06B4C9] to-[#0598AD] text-white rounded-xl hover:shadow-lg hover:shadow-[#06B4C9]/25 transition-all disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Posting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Post Job
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
}
