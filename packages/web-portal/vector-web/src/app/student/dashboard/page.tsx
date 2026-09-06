"use client";

// Extract up to 3 meaningful keyword tags from the course title
function extractTags(title: string): string[] {
  const stop = new Set([
    'and', 'the', 'of', 'in', 'for', 'to', 'a', 'an', 'with', 'on', 'at', 'by',
    'i', 'ii', 'iii', 'iv', 'introduction', 'advanced', 'fundamentals', 'complete', 'guide',
    'course', 'bootcamp', 'certification', 'essentials', 'mastery', 'professional'
  ]);
  return title
    .replace(/[():,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w.toLowerCase()))
    .slice(0, 3);
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ActivityItem } from '@/components/dashboard/RecentActivity';
import Link from 'next/link';
import { generateStudentId } from '@/lib/utils/id';

interface AIAnalysisData {
  skillHealth: {
    skillName: string;
    trend: 'growing' | 'stable' | 'declining';
    healthScore: number;
    decayRate: number;
    currentDemand: number;
  }[];
  recommendations: {
    courseName?: string;
    courseTitle?: string;
    relevanceScore: number;
    reason: string;
    courseCode?: string;
    provider?: string | null;
    link?: string | null;
  }[];
}

interface UserProfile {
  id: string;
  full_name: string;
  student_id: string;
  role: string;

  location?: string;
  profiles?: {
    phone?: string;
    bio?: string;
    university?: string;
    major?: string;
    graduation_year?: string;
  }
}

interface CredentialItem {
  id: string;
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
  certificateNumber?: string;
  credentialData?: Record<string, unknown>;
}



export default function StudentDashboard() {
  const router = useRouter();
  const [hasPendingCVR, setHasPendingCVR] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [aiData, setAiData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  const [allCredentials, setAllCredentials] = useState<CredentialItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const capitalizeWords = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const refreshPipeline = async (identifier: string) => {
    try {
      const newActivities: ActivityItem[] = [];
      const foundSkills: string[] = [];

      const dbRes = await fetch('/api/student/credentials');
      const dbCreds = dbRes.ok ? await dbRes.json() : [];


      // --- PERFORMANCE Caching Layer ---
      const CACHE_KEY = `vector_ai_analysis_v2_${identifier}`;
      const CACHE_TTL = 24 * 60 * 60 * 1000;
      let cachedData = null;

      try {
        const rawCache = localStorage.getItem(CACHE_KEY);
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.credentialCount === dbCreds.length) {
            cachedData = parsed.data;
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) { /* ignore parsing errors */ }

      let analysisJson;

      if (cachedData) {
        analysisJson = cachedData;
      } else {
        // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
        const csrfToken = typeof document !== 'undefined'
          ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
          : '';

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken || ''
          },
          body: JSON.stringify({
            studentId: identifier,
            resumeText: "",
            skillsOverride: Array.from(new Set([
              ...foundSkills,
              ...dbCreds.flatMap((c: { skill_tags?: string[]; skill_name: string }) => (Array.isArray(c.skill_tags) && c.skill_tags.length > 0) ? c.skill_tags : [c.skill_name])
            ]))
          })
        });

        if (!res.ok) {
          console.warn(`[Pipeline] /api/analyze returned ${res.status} — skipping AI analysis.`);
          analysisJson = null;
        } else {
          analysisJson = await res.json();

          if (analysisJson.status === 'success') {
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                credentialCount: dbCreds.length,
                data: analysisJson
              }));
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) { /* ignore quota errors */ }
          }
        }
      }

      if (analysisJson?.status === 'success') {
        setAiData(analysisJson.data);
      }

      const mergedCreds: CredentialItem[] = [];

      dbCreds.forEach((dbC: { id: string; skill_name: string; skill_tags?: string[]; issued_at: string; certificate_number?: string; credential_data?: Record<string, unknown> }) => {
        const tags: string[] = Array.isArray(dbC.skill_tags) && dbC.skill_tags.length > 0
          ? dbC.skill_tags
          : [dbC.skill_name];
        const displayTitle = tags.join(', ');

        const matchedAnalysis = tags
          .map((tag: string) => analysisJson?.data?.skillHealth?.find((s: { skillName: string; healthScore: number }) => s.skillName === tag))
          .filter(Boolean);
        const avgHealth = matchedAnalysis.length > 0
          ? Math.round(matchedAnalysis.reduce((sum: number, a: { healthScore: number }) => sum + a.healthScore, 0) / matchedAnalysis.length)
          : (analysisJson?.data?.skillHealth?.find((s: { skillName: string; healthScore: number }) => s.skillName === dbC.skill_name)?.healthScore ?? 70);

        mergedCreds.push({
          id: dbC.id,
          category: `University Issued — ${dbC.skill_name}`,
          title: displayTitle,
          issueDate: new Date(dbC.issued_at).toLocaleDateString(),
          marketRelevance: avgHealth,
          verified: true,
          certificateNumber: dbC.certificate_number,
          credentialData: dbC.credential_data
        });
      });


      setAllCredentials(mergedCreds);
      setActivities(prev => {
        const merged = [...newActivities, ...prev];
        const seen = new Set<string>();
        return merged.filter(a => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        }).slice(0, 10);
      });

      if (typeof window !== 'undefined' && localStorage.getItem('pendingCVR')) {
        setHasPendingCVR(true);
      }

    } catch (error) {
      console.error("Pipeline Error:", error);
    }
  };


  useEffect(() => {
    const initDashboard = async () => {
      try {
        // Try local session first (no network call), fall back to getUser() if null
        let user = (await supabase.auth.getSession()).data.session?.user ?? null;
        if (!user) {
          const { data } = await supabase.auth.getUser();
          user = data.user;
        }
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('users')
          .select('*, profiles(phone, bio, university, major, graduation_year)')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          if (!profile.student_id) {
            const newId = generateStudentId();
            console.log(`[LazyInit] Generating student ID for ${user.email}: ${newId}`);
            await supabase.from('users').update({ student_id: newId }).eq('id', user.id);
            profile.student_id = newId;
          }

          const capitalizedProfile = {
            ...profile,
            full_name: profile.full_name ? capitalizeWords(profile.full_name) : 'Student',
            profiles: Array.isArray(profile.profiles) ? profile.profiles[0] : profile.profiles
          };
          setUser(capitalizedProfile);




          await refreshPipeline(profile.student_id || user.id);
        }
      } catch (error) {
        console.error("Init Error:", error);
      } finally {
        setLoading(false);
      }
    };
    initDashboard();
  }, [router]);



  const marketScore = aiData?.skillHealth?.length
    ? Math.round(aiData.skillHealth.reduce((acc, s) => acc + s.healthScore, 0) / aiData.skillHealth.length)
    : 0;

  // Compute trust score: ratio of verified credentials to total (verified + pending-like)
  const verifiedCount = allCredentials.filter(c => c.verified).length;
  const pendingCount = hasPendingCVR ? 1 : 0;
  const totalCredentialSlots = Math.max(verifiedCount + pendingCount + 2, 6); // assume some unverified slots
  const trustScore = totalCredentialSlots > 0 ? Math.round((verifiedCount / totalCredentialSlots) * 100) : 0;
  const bestJobMatch = marketScore > 0 ? marketScore : (aiData?.recommendations?.[0]?.relevanceScore || 0);

  // Credential status helper
  const getCredentialStatus = (cred: CredentialItem, index: number): 'verified' | 'in_review' | 'needs_attention' => {
    if (cred.verified) return 'verified';
    if (index < allCredentials.length - 1) return 'in_review';
    return 'needs_attention';
  };

  // Credential icon helper
  const getCredentialIcon = (cred: CredentialItem) => {
    const cat = cred.category.toLowerCase();
    const title = cred.title.toLowerCase();
    if (cat.includes('computer') || title.includes('computer') || title.includes('software') || title.includes('development') || title.includes('full-stack') || title.includes('full stack')) {
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        </div>
      );
    }
    if (cat.includes('cloud') || title.includes('cloud') || title.includes('aws') || title.includes('azure')) {
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          </svg>
        </div>
      );
    }
    if (cat.includes('design') || title.includes('design') || title.includes('ux') || title.includes('ui')) {
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </div>
      );
    }
    // Default: graduation cap
    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15v-3.75m0 0h10.5" />
        </svg>
      </div>
    );
  };

  // Extract institution name from category (e.g. "University Issued — React" -> institution from profile)
  const getInstitutionName = (cred: CredentialItem) => {
    const cat = cred.category;
    if (cat.toLowerCase().includes('university')) return user?.profiles?.university || 'State University';
    if (cat.toLowerCase().includes('amazon') || cred.title.toLowerCase().includes('aws')) return 'Amazon Web Services';
    if (cat.toLowerCase().includes('cloud')) return 'Cloud Provider';
    return user?.profiles?.university || 'Issuing Institution';
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* ── Welcome Banner — Dark Navy with Trust Score Ring ── */}
          <div className="rounded-2xl overflow-hidden relative" style={{ background: '#0F172A' }}>

            {/* SVG background layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <svg
                viewBox="0 0 900 160"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute w-full h-full"
              >
                {/* Concentric hollow rings from right edge */}
                <circle cx="820" cy="80" r="140" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="60" />
                <circle cx="820" cy="80" r="220" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="60" />
                <circle cx="820" cy="80" r="300" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="60" />
                {/* Bottom-left accent arcs */}
                <circle cx="-30" cy="160" r="120" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="50" />
                <circle cx="-30" cy="160" r="200" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="50" />
              </svg>
            </div>

            {/* Banner content */}
            <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 relative z-10">
              {/* Trust Score Ring */}
              <div className="flex-shrink-0 mr-6 hidden md:flex items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg viewBox="0 0 80 80" className="w-24 h-24 transform -rotate-90">
                    {/* Background ring */}
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5.5" />
                    {/* Progress ring */}
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke="#06B4C9"
                      strokeWidth="5.5"
                      strokeLinecap="round"
                      strokeDasharray={`${(trustScore / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                    <span className="text-xl font-extrabold text-white leading-none mb-0.5">{trustScore}%</span>
                    <span className="text-[8px] uppercase tracking-wider text-[#06B4C9] font-bold leading-tight">Trust Score</span>
                  </div>
                </div>
              </div>

              {/* Welcome text */}
              <div className="flex-1 min-w-0 py-2">
                <h1 className="text-xl md:text-2xl font-bold mb-1 text-white">
                  Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}
                </h1>
                <p className="text-gray-400 text-sm mb-4">
                  {verifiedCount} of {totalCredentialSlots} credentials verified — your profile is ready for {aiData?.recommendations?.length || 0} new matched roles
                </p>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-[#06B4C9]">{verifiedCount}</span>
                    <span className="text-xs text-[#06B4C9]">Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-amber-400">{pendingCount}</span>
                    <span className="text-xs text-amber-400">Pending</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-white">{bestJobMatch}%</span>
                    <span className="text-xs text-gray-400">Best job match</span>
                  </div>
                  <Link
                    href="/student/credentials/upload"
                    className="ml-auto bg-[#06B4C9] hover:bg-[#0598A9] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Upload Credential (AI Extract)
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Credential Verification ── */}
          <div id="tour-credentials">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Credential verification</h2>
                <span className="text-xs font-medium bg-[#06B4C9]/10 text-[#06B4C9] px-2 py-0.5 rounded-full border border-[#06B4C9]/20 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Extraction Powered
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/student/credentials/upload"
                  className="bg-[#06B4C9] hover:bg-[#0598A9] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Upload & Analyze
                </Link>
                <button
                  onClick={() => router.push('/student/skills')}
                  className="text-[#06B4C9] text-sm font-medium hover:underline"
                >
                  View all →
                </button>
              </div>
            </div>

            {allCredentials.length > 0 ? (
              <div className="space-y-0">
                {allCredentials.slice(0, 4).map((cred, idx) => {
                  const status = getCredentialStatus(cred, idx);
                  const statusConfig = {
                    verified: { label: 'Verified', className: 'text-green-600', icon: '✓' },
                    in_review: { label: 'In review', className: 'text-amber-500', icon: '◎' },
                    needs_attention: { label: 'Needs attention', className: 'text-red-500', icon: '⊘' },
                  };
                  const sc = statusConfig[status];
                  return (
                    <Link key={cred.id} href={`/student/skills/${cred.id}`}>
                      <div className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 hover:border-[#06B4C9]/40 hover:bg-gray-50/50 transition-all cursor-pointer first:rounded-t-xl last:rounded-b-xl -mt-px first:mt-0">
                        {getCredentialIcon(cred)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{cred.title}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {getInstitutionName(cred)} · Issued {cred.issueDate}
                          </p>
                          {cred.certificateNumber && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {status === 'in_review' && <span className="text-amber-500">Awaiting issuer confirmation · </span>}
                              {status === 'needs_attention' && <span className="text-red-400">Issuer record not found — resubmit source document · </span>}
                              {status === 'verified' && <span className="text-gray-400">Confirmed with issuing registrar · </span>}
                              ID {cred.certificateNumber}
                            </p>
                          )}
                          {!cred.certificateNumber && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {status === 'in_review' && <span className="text-amber-500">Awaiting issuer confirmation</span>}
                              {status === 'needs_attention' && <span className="text-red-400">Issuer record not found — resubmit source document</span>}
                              {status === 'verified' && <span className="text-gray-400">Confirmed with issuing registrar</span>}
                            </p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${sc.className} flex-shrink-0`}>
                          <span>{sc.icon}</span>
                          <span>{sc.label}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No credentials detected yet.</p>
              </div>
            )}
          </div>

          {/* ── Top Skills Performance ── */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">Top Skills Performance</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              {aiData?.skillHealth && aiData.skillHealth.length > 0 ? (
                <div className="space-y-4">
                  {aiData.skillHealth
                    .sort((a, b) => b.healthScore - a.healthScore)
                    .slice(0, 3)
                    .map((skill) => {
                      const trendColors = {
                        growing: { bg: 'bg-[#06B4C9]', text: 'text-cyan-700', light: 'bg-cyan-50' },
                        stable: { bg: 'bg-slate-400', text: 'text-slate-600', light: 'bg-slate-100' },
                        declining: { bg: 'bg-amber-400', text: 'text-amber-700', light: 'bg-amber-50' },
                      };
                      const colors = trendColors[skill.trend] || trendColors.stable;
                      return (
                        <div key={skill.skillName} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">{skill.skillName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.text} ${colors.light}`}>
                                {skill.trend}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{skill.healthScore}%</span>
                          </div>
                          <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`absolute top-0 left-0 h-full ${colors.bg} transition-all duration-700 ease-out rounded-full`}
                              style={{ width: `${skill.healthScore}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Demand: {skill.currentDemand.toLocaleString()} Jobs</span>
                            <span>Decay Rate: {skill.decayRate.toFixed(2)}%</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400">No skill analytics available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Matched to Your Verified Skills ── */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">Matched to your verified skills</h2>
              <Link
                href="/student/jobs"
                className="text-[#06B4C9] text-sm font-medium hover:underline"
              >
                Browse all jobs →
              </Link>
            </div>

            {aiData?.recommendations && aiData.recommendations.length > 0 ? (
              <div className="space-y-3">
                {aiData.recommendations.slice(0, 2).map((rec, i: number) => {
                  const courseTitle = rec.courseTitle || rec.courseName || 'Position';
                  const matchPercent = rec.relevanceScore || 80;
                  // Derive a job-like display from the recommendation
                  const tags = extractTags(courseTitle);
                  return (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#06B4C9]/40 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        {/* Match percentage circle */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg viewBox="0 0 48 48" className="w-12 h-12 transform -rotate-90">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                            <circle
                              cx="24" cy="24" r="20"
                              fill="none"
                              stroke="#06B4C9"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray={`${(matchPercent / 100) * 2 * Math.PI * 20} ${2 * Math.PI * 20}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-900">{matchPercent}%</span>
                          </div>
                        </div>

                        {/* Job info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{courseTitle}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {rec.provider || 'Company'} · {user?.location || 'Remote'}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {tags.map((tag: string) => (
                              <span key={tag} className="text-[11px] text-[#06B4C9] bg-[#06B4C9]/10 border border-[#06B4C9]/20 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Apply button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (rec.link) window.open(rec.link, '_blank');
                            else router.push('/student/jobs');
                          }}
                          className="flex-shrink-0 bg-[#06B4C9] text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-[#06B4C9]/80 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">No matched jobs yet</p>
              </div>
            )}
          </div>

          {/* ── Recommended Courses ── */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">Recommended Courses</h2>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              {aiData?.recommendations && aiData.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {aiData.recommendations.slice(0, 3).map((rec, i: number) => {
                    const courseTitle = rec.courseTitle || rec.courseName || 'Course';
                    const tags = extractTags(courseTitle);
                    return (
                      <div key={i} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1">
                            {courseTitle}
                          </p>
                          <span className="flex-shrink-0 text-xs font-bold text-[#06B4C9]">
                            {rec.relevanceScore || 80}% Match
                          </span>
                        </div>
                        {rec.provider && (
                          <span className="mt-1 inline-block text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {rec.provider}
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.map((tag: string) => (
                            <span key={tag} className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {rec.link && (
                          <div className="flex justify-end mt-2">
                            <a
                              href={rec.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#06B4C9] hover:underline"
                            >
                              View Course →
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400">No course suggestions available yet</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="xl:col-span-1 flex flex-col gap-6">

          {/* ── Activity ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Activity</h3>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.slice(0, 3).map((activity) => {
                  const dotColor = activity.type === 'success' ? 'bg-green-500'
                    : activity.type === 'info' ? 'bg-blue-500'
                      : activity.type === 'warning' ? 'bg-amber-500'
                        : 'bg-green-500';
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-snug">{activity.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">No recent activity.</p>
              )}
            </div>
          </div>

          {/* ── Boost Your Trust Score ── */}
          <div id="tour-setup" className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Boost your trust score</h3>
            <div className="space-y-0">
              {/* Upload & AI Analyze Credential */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Upload & AI Analyze Credential</p>
                  <p className="text-[11px] text-[#06B4C9] font-semibold">Instant AI Extraction</p>
                </div>
                <button
                  onClick={() => router.push('/student/credentials/upload')}
                  className="bg-[#06B4C9]/10 text-[#06B4C9] hover:bg-[#06B4C9] hover:text-white px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                >
                  Upload
                </button>
              </div>
              {/* Verify LinkedIn */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Verify LinkedIn profile</p>
                </div>
                <button
                  onClick={() => router.push('/student/profile')}
                  className="text-[#06B4C9] text-xs font-semibold hover:underline"
                >
                  Add
                </button>
              </div>
              {/* Add Git portfolio */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Add Git portfolio</p>
                  <p className="text-[11px] text-[#06B4C9] font-medium">High demand</p>
                </div>
                <button
                  onClick={() => router.push('/student/profile')}
                  className="text-[#06B4C9] text-xs font-semibold hover:underline"
                >
                  Add
                </button>
              </div>
              {/* Verify internship record */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Verify internship record</p>
                  <p className="text-[11px] text-gray-400">Matches {aiData?.recommendations?.length || 0} jobs</p>
                </div>
                <button
                  onClick={() => router.push('/student/profile')}
                  className="text-[#06B4C9] text-xs font-semibold hover:underline"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* ── Job Alerts ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Job alerts</h3>
            <div className="space-y-4">
              {aiData?.recommendations && aiData.recommendations.length > 0 ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#06B4C9]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">
                        {aiData.recommendations.length} new roles match your verified {allCredentials[0]?.title || 'AWS'} credential
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">
                        {aiData.recommendations[0]?.provider || 'Employer'} viewed your verified profile
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Yesterday</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">No job alerts yet. Add credentials to get matched.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}