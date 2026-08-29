'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmployerLayout from '@/components/dashboard/EmployerLayout';
import { supabase } from '@/lib/supabaseClient';

interface JobPosting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  location?: string;
  required_skills: string[];
  expires_at?: string;
  _count?: { applications: number };
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  matchScore?: number;
  student: { id: string; full_name: string; email: string };
  job?: { id: string; title: string };
}

interface DashboardData {
  activeJobs: number;
  totalApplicants: number;
  shortlistedCandidates: number;
  pendingReviews: number;
  postings: JobPosting[];
  recentApplications: Application[];
  applicantsByPosting: { title: string; count: number; id: string }[];
  pipelineStages: { label: string; count: number; color: string }[];
  matchRanges: { label: string; count: number; color: string }[];
  attentionItems: { text: string; color: string; actionLabel: string; href: string }[];
}

// ── Tiny Canvas Trend Chart ─────────────────────────────────────────────────
function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 10, right: 10, bottom: 26, left: 28 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value));
    const range = max - min || 1;

    const px = (i: number) => pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
    const py = (v: number) => pad.top + plotH - ((v - min) / range) * plotH;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    grad.addColorStop(0, 'rgba(6,180,201,0.22)');
    grad.addColorStop(1, 'rgba(6,180,201,0.01)');

    // Draw fill
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0].value));
    for (let i = 1; i < data.length; i++) {
      const cpx1 = (px(i - 1) + px(i)) / 2;
      const cpy1 = py(data[i - 1].value);
      const cpx2 = cpx1;
      const cpy2 = py(data[i].value);
      ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, px(i), py(data[i].value));
    }
    ctx.lineTo(px(data.length - 1), pad.top + plotH);
    ctx.lineTo(px(0), pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0].value));
    for (let i = 1; i < data.length; i++) {
      const cpx = (px(i - 1) + px(i)) / 2;
      ctx.bezierCurveTo(cpx, py(data[i - 1].value), cpx, py(data[i].value), px(i), py(data[i].value));
    }
    ctx.strokeStyle = '#06B4C9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots
    data.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(px(i), py(d.value), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#06B4C9';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        ctx.fillText(d.label, px(i), h - 4);
      }
    });
  }, [data]);

  return <canvas ref={canvasRef} width={380} height={130} className="w-full h-full" />;
}

// ── SVG Donut Chart ─────────────────────────────────────────────────────────
function DonutChart({ segments, total }: { segments: { label: string; count: number; color: string }[]; total: number }) {
  const size = 100;
  const r = 36;
  const sw = 16;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = segments.map(seg => {
    const pct = total > 0 ? seg.count / total : 0;
    const dash = pct * circ;
    const s = { ...seg, dash, gap: circ - dash, offset };
    offset += dash;
    return s;
  });
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} className="dark:stroke-[#1E2536]" />
        {slices.map((s, i) => (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">{total}</span>
        <span className="text-[9px] uppercase tracking-wide text-gray-400 font-semibold">Total</span>
      </div>
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    under_review: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
    shortlisted: 'bg-[#06B4C9]/10 text-[#06B4C9] border-[#06B4C9]/30',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
    hired: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30',
    active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30',
    interviewing: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#1A2030] dark:text-[#94A3B8] dark:border-[#283042]';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${cls} whitespace-nowrap`}>{label}</span>;
}

// ── Time ago ────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Avatar helpers ───────────────────────────────────────────────────────────
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

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, loading, iconBg }: {
  label: string; value: number; icon: React.ReactNode; loading: boolean; iconBg: string;
}) {
  return (
    <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wide mb-1.5">{label}</p>
        {loading
          ? <div className="h-8 w-10 bg-gray-100 dark:bg-[#1A2030] rounded animate-pulse" />
          : <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{value}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function EmployerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    activeJobs: 0, totalApplicants: 0, shortlistedCandidates: 0, pendingReviews: 0,
    postings: [], recentApplications: [], applicantsByPosting: [],
    pipelineStages: [], matchRanges: [], attentionItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<'7' | '14' | '30'>('7');
  const [selectedPipelineJob, setSelectedPipelineJob] = useState('all');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Fetch employer's jobs
        const jobsRes = await fetch(`/api/jobs?employer_id=${user.id}&limit=50`);
        const jobsJson = jobsRes.ok ? await jobsRes.json() : { jobs: [] };
        const postings: JobPosting[] = (jobsJson.jobs || []);

        // Fetch applications per job
        let allApps: Application[] = [];
        await Promise.allSettled(
          postings.slice(0, 12).map(async p => {
            const r = await fetch(`/api/jobs/${p.id}/applicants`);
            if (!r.ok) return;
            const d = await r.json();
            const apps = (d.applications || []).map((a: Application) => ({ ...a, job: { id: p.id, title: p.title } }));
            allApps = [...allApps, ...apps];
          })
        );
        allApps.sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());

        const activeJobs = postings.filter(p => p.status === 'active').length;
        const totalApplicants = allApps.length;
        const shortlistedCandidates = allApps.filter(a => a.status === 'shortlisted').length;
        const pendingReviews = allApps.filter(a => a.status === 'pending').length;

        const applicantsByPosting = postings
          .map(p => ({ title: p.title, count: p._count?.applications || 0, id: p.id }))
          .filter(x => x.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const stageCounts: Record<string, number> = {};
        allApps.forEach(a => { stageCounts[a.status] = (stageCounts[a.status] || 0) + 1; });
        const pipelineStages = [
          { label: 'New', count: stageCounts['pending'] || 0, color: '#3B82F6' },
          { label: 'Under Review', count: stageCounts['under_review'] || 0, color: '#06B4C9' },
          { label: 'Shortlisted', count: stageCounts['shortlisted'] || 0, color: '#10B981' },
          { label: 'Interview', count: stageCounts['interviewing'] || 0, color: '#8B5CF6' },
          { label: 'Hired', count: stageCounts['hired'] || 0, color: '#F59E0B' },
        ];

        const matchRanges = [
          { label: '90-100%', count: allApps.filter(a => (a.matchScore || 0) >= 0.9).length, color: '#10B981' },
          { label: '80-89%', count: allApps.filter(a => (a.matchScore || 0) >= 0.8 && (a.matchScore || 0) < 0.9).length, color: '#06B4C9' },
          { label: '70-79%', count: allApps.filter(a => (a.matchScore || 0) >= 0.7 && (a.matchScore || 0) < 0.8).length, color: '#F59E0B' },
          { label: 'Below 70%', count: allApps.filter(a => (a.matchScore || 0) < 0.7).length, color: '#F87171' },
        ];

        const attentionItems: { text: string; color: string; actionLabel: string; href: string }[] = [];
        if (pendingReviews > 0)
          attentionItems.push({ text: `${pendingReviews} new application${pendingReviews > 1 ? 's' : ''} need review`, color: '#06B4C9', actionLabel: 'Review', href: postings[0] ? `/employer/postings/${postings[0].id}/applicants` : '/employer/postings' });
        if (shortlistedCandidates > 0)
          attentionItems.push({ text: `${shortlistedCandidates} candidate${shortlistedCandidates > 1 ? 's' : ''} ready for shortlisting`, color: '#10B981', actionLabel: 'View', href: '/employer/postings' });
        const interviewCount = stageCounts['interviewing'] || 0;
        if (interviewCount > 0)
          attentionItems.push({ text: `${interviewCount} interview${interviewCount > 1 ? 's' : ''} are scheduled`, color: '#8B5CF6', actionLabel: 'View', href: '/employer/postings' });
        const expiring = postings.filter(p => p.expires_at && new Date(p.expires_at).getTime() - Date.now() < 7 * 24 * 3600000);
        if (expiring.length > 0)
          attentionItems.push({ text: `${expiring.length} job posting${expiring.length > 1 ? 's' : ''} expiring soon`, color: '#F87171', actionLabel: 'View', href: '/employer/postings' });

        setData({ activeJobs, totalApplicants, shortlistedCandidates, pendingReviews, postings, recentApplications: allApps.slice(0, 8), applicantsByPosting, pipelineStages, matchRanges, attentionItems });
      } catch (e) { console.error('Dashboard error:', e); }
      finally { setLoading(false); }
    };
    run();
  }, [router]);

  // Build trend data from loaded applications
  const trendData = (() => {
    const days = parseInt(trendRange);
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = data.recentApplications.filter(a => new Date(a.applied_at).toDateString() === d.toDateString()).length;
      return { label, value: count };
    });
  })();

  const maxBar = Math.max(...data.applicantsByPosting.map(x => x.count), 1);
  const maxPipe = Math.max(...data.pipelineStages.map(s => s.count), 1);
  const donutTotal = data.matchRanges.reduce((s, r) => s + r.count, 0);

  const pipelineToDisplay = selectedPipelineJob === 'all'
    ? data.pipelineStages
    : data.pipelineStages; // per-job pipeline would need extra API call; show global

  return (
    <EmployerLayout>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 dark:text-[#64748B] mt-0.5">Welcome back to your employer portal.</p>
      </div>

      {/* ── Row 1: Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Active job postings" value={data.activeJobs} loading={loading} iconBg="bg-[#06B4C9]/10"
          icon={<svg className="w-6 h-6 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
        <StatCard label="Total applicants" value={data.totalApplicants} loading={loading} iconBg="bg-emerald-500/10"
          icon={<svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard label="Shortlisted candidates" value={data.shortlistedCandidates} loading={loading} iconBg="bg-violet-500/10"
          icon={<svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>} />
        <StatCard label="Pending reviews" value={data.pendingReviews} loading={loading} iconBg="bg-amber-500/10"
          icon={<svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      </div>

      {/* ── Row 2: Trend + Pipeline + Applicants by Posting ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Trend */}
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Applicant trend</span>
            </div>
            <select value={trendRange} onChange={e => setTrendRange(e.target.value as '7' | '14' | '30')}
              className="text-xs text-gray-500 dark:text-[#64748B] bg-transparent border-0 focus:ring-0 cursor-pointer">
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          <div className="h-[130px]">
            {loading
              ? <div className="h-full bg-gray-100 dark:bg-[#1A2030] rounded-lg animate-pulse" />
              : trendData.every(d => d.value === 0)
                ? <div className="h-full flex flex-col items-center justify-center gap-2 opacity-60">
                  <svg className="w-8 h-8 text-gray-300 dark:text-[#283042]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  <p className="text-xs text-gray-400 dark:text-[#64748B]">No data yet</p>
                </div>
                : <TrendChart data={trendData} />
            }
          </div>
        </div>

        {/* Pipeline */}
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Hiring pipeline</span>
            </div>
            {data.postings.length > 1 && (
              <select value={selectedPipelineJob} onChange={e => setSelectedPipelineJob(e.target.value)}
                className="text-xs text-gray-500 dark:text-[#64748B] bg-transparent border-0 focus:ring-0 cursor-pointer max-w-[110px] truncate">
                <option value="all">All positions</option>
                {data.postings.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-end gap-2" style={{ height: 112 }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-gray-100 dark:bg-[#1A2030] animate-pulse" style={{ height: `${25 + i * 12}%` }} />
              ))
              : pipelineToDisplay.every(s => s.count === 0)
                ? <div className="w-full flex items-center justify-center h-full"><p className="text-xs text-gray-400 dark:text-[#64748B]">No pipeline data</p></div>
                : pipelineToDisplay.map(stage => {
                  const pct = maxPipe > 0 ? (stage.count / maxPipe) * 100 : 0;
                  return (
                    <div key={stage.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[10px] font-bold text-gray-700 dark:text-[#CBD5E1]">{stage.count}</span>
                      <div className="w-full" style={{ height: `${Math.max(pct, 4)}%`, background: stage.color, borderRadius: '4px 4px 0 0' }}
                        title={`${stage.label}: ${stage.count}`} />
                      <span className="text-[9px] text-gray-400 dark:text-[#64748B] text-center">{stage.label}</span>
                    </div>
                  );
                })}
          </div>
          {!loading && !pipelineToDisplay.every(s => s.count === 0) && (
            <p className="text-[10px] text-center text-gray-400 dark:text-[#64748B] mt-2">Click a bar to filter recent applications</p>
          )}
        </div>

        {/* Applicants by posting */}
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Applicants by posting</span>
          </div>
          {loading
            ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-5 bg-gray-100 dark:bg-[#1A2030] rounded animate-pulse" />)}</div>
            : data.applicantsByPosting.length === 0
              ? <div className="h-24 flex flex-col items-center justify-center gap-1"><p className="text-xs text-gray-400 dark:text-[#64748B]">No applicant data yet</p></div>
              : <div className="space-y-3.5">
                {data.applicantsByPosting.map(item => (
                  <Link key={item.id} href={`/employer/postings/${item.id}/applicants`} className="group block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-[#CBD5E1] truncate max-w-[75%] group-hover:text-[#06B4C9] transition-colors">{item.title}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-[#1E2536] rounded-full overflow-hidden">
                      <div className="h-full bg-[#06B4C9] rounded-full transition-all duration-700" style={{ width: `${(item.count / maxBar) * 100}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── Row 3: Performance + Match Donut + Attention ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Job Posting Performance */}
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Job posting performance</h3>
            <Link href="/employer/postings" className="text-xs text-[#06B4C9] font-semibold hover:underline">View all</Link>
          </div>
          {loading
            ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-[#1A2030] rounded-lg animate-pulse" />)}</div>
            : data.postings.length === 0
              ? <div className="h-28 flex flex-col items-center justify-center gap-2">
                <svg className="w-8 h-8 text-gray-300 dark:text-[#283042]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <p className="text-xs text-gray-400 dark:text-[#64748B]">No postings yet</p>
                <Link href="/employer/postings" className="text-xs text-[#06B4C9] font-semibold hover:underline">Create a posting →</Link>
              </div>
              : <div className="space-y-1">
                {data.postings.slice(0, 5).map(job => (
                  <Link key={job.id} href={`/employer/postings/${job.id}/applicants`} className="group flex items-center justify-between gap-3 px-2.5 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#06B4C9] transition-colors">{job.title}</p>
                      <p className="text-[11px] text-gray-400 dark:text-[#64748B]">{job._count?.applications || 0} applicants</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
          }
        </div>

        {/* Match Range Donut */}
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Applicants by match range</h3>
          {loading
            ? <div className="flex items-center gap-6"><div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-[#1A2030] animate-pulse flex-shrink-0" /><div className="space-y-2 flex-1">{[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-gray-100 dark:bg-[#1A2030] rounded animate-pulse" />)}</div></div>
            : donutTotal === 0
              ? <div className="h-28 flex flex-col items-center justify-center gap-2"><p className="text-xs text-gray-400 dark:text-[#64748B]">No match data yet</p></div>
              : <div className="flex items-center gap-5">
                <DonutChart segments={data.matchRanges} total={donutTotal} />
                <div className="space-y-2.5 flex-1">
                  {data.matchRanges.map(r => (
                    <div key={r.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                        <span className="text-xs text-gray-600 dark:text-[#94A3B8]">{r.label}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
          }
        </div>

        {/* Needs Attention */}
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Needs your attention</h3>
          </div>
          {loading
            ? <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-100 dark:bg-[#1A2030] rounded animate-pulse" />)}</div>
            : data.attentionItems.length === 0
              ? <div className="h-28 flex flex-col items-center justify-center gap-2">
                <svg className="w-9 h-9 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-gray-400 dark:text-[#64748B]">All caught up!</p>
              </div>
              : <div className="space-y-2">
                {data.attentionItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 dark:border-[#192030] last:border-0">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-gray-700 dark:text-[#CBD5E1] leading-snug">{item.text}</span>
                    </div>
                    <Link href={item.href} className="text-xs font-semibold text-[#06B4C9] hover:underline flex-shrink-0">{item.actionLabel}</Link>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── Row 4: Recent Applications ────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1E2536]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent applications</h3>
          <Link href="/employer/candidates" className="text-xs font-semibold text-[#06B4C9] hover:underline flex items-center gap-1">
            View all
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-[#1A2030] rounded-lg animate-pulse" />)}</div>
        ) : data.recentApplications.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400 dark:text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#64748B]">No recent applications.</p>
            <Link href="/employer/postings" className="text-xs text-[#06B4C9] font-semibold hover:underline">Post a job to start receiving applications →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-[#0E1220]">
                <tr>
                  {['Candidate', 'Position', 'Match', 'Status', 'Applied', ''].map(h => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-gray-500 dark:text-[#64748B] uppercase tracking-wide ${h === '' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#1E2536]">
                {data.recentApplications.map(app => {
                  const mp = app.matchScore !== undefined ? Math.round(app.matchScore * 100) : null;
                  const ini = initials(app.student.full_name);
                  const ac = avColor(app.student.full_name);
                  return (
                    <tr key={app.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${ac} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{ini}</div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{app.student.full_name}</p>
                            <p className="text-[11px] text-gray-400 dark:text-[#64748B] truncate">{app.student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-sm text-gray-700 dark:text-[#CBD5E1] truncate max-w-[160px] block">{app.job?.title || '—'}</span></td>
                      <td className="px-5 py-3.5">
                        {mp !== null
                          ? <span className={`text-sm font-bold ${mp >= 80 ? 'text-emerald-600 dark:text-emerald-400' : mp >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-[#64748B]'}`}>{mp}%</span>
                          : <span className="text-gray-400 dark:text-[#64748B] text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={app.status} /></td>
                      <td className="px-5 py-3.5"><span className="text-xs text-gray-500 dark:text-[#64748B] whitespace-nowrap">{timeAgo(app.applied_at)}</span></td>
                      <td className="px-5 py-3.5 text-right">
                        {app.job?.id
                          ? <Link href={`/employer/postings/${app.job.id}/applicants/${app.id}/resume`} className="px-3 py-1.5 text-xs font-semibold text-[#06B4C9] border border-[#06B4C9]/40 hover:bg-[#06B4C9]/10 rounded-lg transition-colors inline-block whitespace-nowrap">Review</Link>
                          : <span className="text-gray-400 text-xs">—</span>}
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
