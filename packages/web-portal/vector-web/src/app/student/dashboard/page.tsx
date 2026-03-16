"use client";
// Extract up to 3 meaningful keyword tags from the course title
function extractTags(title: string): string[] {
  const stop = new Set([
    'and','the','of','in','for','to','a','an','with','on','at','by',
    'i','ii','iii','iv','introduction','advanced','fundamentals','complete','guide',
    'course','bootcamp','certification','essentials','mastery','professional'
  ]);
  return title
    .replace(/[():,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w.toLowerCase()))
    .slice(0, 3);
}
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CredentialCard from '@/components/dashboard/CredentialCard';
import RecentActivity, { ActivityItem } from '@/components/dashboard/RecentActivity';
import Link from 'next/link';
import HelpTip from '@/components/shared/HelpTip';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import studentIllustration from './student.png';

interface AIAnalysisData {
  skillHealth: {
    skillName: string;
    trend: 'growing' | 'stable' | 'declining';
    healthScore: number;
    decayRate: number;
    currentDemand: number;
  }[];
  recommendations: {
    courseName: string;
    relevanceScore: number;
    reason: string;
    courseCode: string;
  }[];
}

interface UserProfile {
  id: string;
  full_name: string;
  student_id: string;
  role: string;
  wallet_address?: string;
}

interface CredentialItem {
  id: string;
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
  certificateNumber?: string;
  credentialData?: Record<string, any>;
}

function providerPill(provider: string | null): string {
  if (!provider) return 'bg-[#06B4C9]/10 text-[#06B4C9]';
  const p = provider.toLowerCase();
  if (p === 'udemy') return 'bg-purple-100 text-purple-700';
  if (p === 'coursera') return 'bg-blue-100 text-blue-700';
  if (p.startsWith('edx')) return 'bg-slate-100 text-slate-700';
  if (p.includes('freecodecamp')) return 'bg-green-100 text-green-700';
  if (p === 'hubspot') return 'bg-orange-100 text-orange-700';
  if (p.includes('linkedin')) return 'bg-sky-100 text-sky-700';
  return 'bg-[#06B4C9]/10 text-[#06B4C9]';
}

export default function StudentDashboard() {
  const router = useRouter();
  const [hasPendingCVR, setHasPendingCVR] = useState(false);
  const [hasCVRExport, setHasCVRExport] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [aiData, setAiData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [allCredentials, setAllCredentials] = useState<CredentialItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]); 
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  const capitalizeWords = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const refreshPipeline = async (walletAddress: string, identifier: string) => {
    try {
      const newActivities: ActivityItem[] = [];
      const blockchainCreds: CredentialItem[] = [];
      const foundSkills: string[] = [];

      const dbRes = await fetch('/api/student/credentials');
      const dbCreds = dbRes.ok ? await dbRes.json() : [];

      if (walletAddress) {
        newActivities.push({
            id: 'wallet-conn',
            type: 'info',
            title: 'Wallet Connected',
            description: `Active: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            time: 'Active'
        });

        const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
        const processedIds = new Set<number>();

        for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
            if (typeof skillId !== 'number' || processedIds.has(skillId)) continue;
            try {
                const balance = await contract.balanceOf(walletAddress, skillId);
                if (balance > 0) {
                    processedIds.add(skillId);
                    foundSkills.push(skillName);
                    blockchainCreds.push({
                        id: `bc-${skillId}`,
                        title: skillName,
                        category: 'Blockchain Verified',
                        issueDate: 'Verified On-Chain',
                        marketRelevance: 85,
                        verified: true,
                    });
                    newActivities.push({
                        id: `cred-${skillId}`,
                        type: 'success',
                        title: 'Skill Verified',
                        description: `${skillName} confirmed on Polygon`,
                        time: 'On-Chain'
                    });
                }
            } catch (e) { /* ignore read errors */ }
        }
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: identifier,
          resumeText: "",
          skillsOverride: Array.from(new Set([
            ...foundSkills, 
            ...dbCreds.flatMap((c:any) => (Array.isArray(c.skill_tags) && c.skill_tags.length > 0) ? c.skill_tags : [c.skill_name])
          ]))
        })
      });
      
      const json = await res.json();
      if (json.status === 'success') {
        setAiData(json.data);
      }

      const mergedCreds: CredentialItem[] = [];
      
      dbCreds.forEach((dbC: any) => {
        // ✅ Phase 8: Use skill_tags (actual skills) as primary title, skill_name as category
        const tags: string[] = Array.isArray(dbC.skill_tags) && dbC.skill_tags.length > 0
          ? dbC.skill_tags
          : [dbC.skill_name];
        const displayTitle = tags.join(', ');

        // Match analysis by individual skill tags when available
        const matchedAnalysis = tags
          .map((tag: string) => json.data?.skillHealth?.find((s: any) => s.skillName === tag))
          .filter(Boolean);
        const avgHealth = matchedAnalysis.length > 0
          ? Math.round(matchedAnalysis.reduce((sum: number, a: any) => sum + a.healthScore, 0) / matchedAnalysis.length)
          : (json.data?.skillHealth?.find((s: any) => s.skillName === dbC.skill_name)?.healthScore ?? 70);

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

      blockchainCreds.forEach(bc => {
        const alreadyExists = mergedCreds.some(mc => mc.title.toLowerCase() === bc.title.toLowerCase());
        if (!alreadyExists) mergedCreds.push(bc);
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

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    setIsWalletConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0].toLowerCase();

      if (user?.id) {
        await supabase.from('users').update({ wallet_address: address }).eq('id', user.id);
        setUser(prev => prev ? ({ ...prev, wallet_address: address }) : null);
        await refreshPipeline(address, user.student_id || user.id);
      }
    } catch (error: any) {
      alert("Failed to connect wallet: " + (error.message || "Unknown error"));
    } finally {
      setIsWalletConnecting(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          const capitalizedProfile = {
            ...profile,
            full_name: profile.full_name ? capitalizeWords(profile.full_name) : 'Student'
          };
          setUser(capitalizedProfile);

          // Check cvr_exports to accurately determine if user has uploaded a CVR
          const { data: cvrExports } = await supabase
            .from('cvr_exports')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);
          if (cvrExports && cvrExports.length > 0) setHasCVRExport(true);

          await refreshPipeline(profile.wallet_address || '', profile.student_id || session.user.id);
        }
      } catch (error) {
        console.error("Init Error:", error);
      } finally {
        setLoading(false);
      }
    };
    initDashboard();
  }, [router]);

  const handleClosePendingCard = () => {
    setHasPendingCVR(false);
    localStorage.removeItem('pendingCVR');
  };

  const marketScore = aiData?.skillHealth?.length
    ? Math.round(aiData.skillHealth.reduce((acc, s) => acc + s.healthScore, 0) / aiData.skillHealth.length)
    : 0;

  return (
    <DashboardLayout>
      {/* ── SINGLE GRID: Left col has ALL main content, Right col has sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* Welcome Banner */}
          <div className="bg-[#06B4C9]/90 rounded-2xl overflow-hidden relative">
            <div className="flex flex-col md:flex-row items-center justify-between p-8 pb-0">
              <div className="flex-1 text-[#06B4C9] z-10 pb-8">
                <h1 className="text-xl md:text-4xl font-bold mb-2 text-white">
                  Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
                </h1>
                <p className="text-white text-sm md:text-base mb-3">
                  You've earned <span className="font-bold text-white">{allCredentials.length}</span> credential{allCredentials.length !== 1 ? 's' : ''} this month!
                </p>
                <div className="flex items-center gap-3">
                  {loading ? (
                    <span className="text-sm text-[#06B4C9] bg-[#06B4C9]/10 px-3 py-1.5 rounded-full flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Loading...</span>
                  ) : user?.wallet_address ? (
                    <span id="tour-wallet" className="flex items-center gap-2 text-sm bg-gray-900/10 px-3 py-2 rounded-lg border border-gray-900">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7H5a2 2 0 010-4h14v4" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14a2 2 0 002 2h16v-5" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" /></svg>
                      <span className="font-medium text-white">Wallet:</span>
                      <span className="font-mono text-white">{`${user.wallet_address.slice(0,6)}...${user.wallet_address.slice(-4)}`}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(user.wallet_address || '')}
                        className="p-1 rounded hover:bg-white/10 text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                          <rect x="8" y="8" width="12" height="12" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        </svg>
                      </button>
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={connectWallet}
                        disabled={isWalletConnecting}
                        className="flex items-center gap-2 text-sm bg-[#06B4C9] text-white px-4 py-2.5 rounded-lg hover:bg-[#06B4C9]/90"
                      >
                        {isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}
                      </button>
                      <a href="/student/help" className="text-xs text-white/70 hover:text-white underline underline-offset-2">
                        Need help?
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative w-48 h-48 md:w-72 md:h-60 flex-shrink-0 self-center md:self-end">
                <Image 
                  src={studentIllustration} //temporary, replace with something more suitable for students
                  alt="Student professional illustration"
                  fill
                  className="object-contain object-bottom scale-120"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div id="tour-stats" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 relative">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Verified Skills <HelpTip text="Skills confirmed by your university and recorded permanently on the network." /></h3>
                  <p className="text-3xl font-bold text-gray-900 mb-3">{allCredentials.length}</p>
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${allCredentials.length > 2 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      {allCredentials.length > 2
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                      }
                    </svg>
                    <span>{allCredentials.length > 2 ? '+12%' : '-8%'}</span>
                    <span className="text-gray-400 font-normal">this month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#E7F1EC] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#157942]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 relative">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Market Score <HelpTip text="How well your current skills match what employers are hiring for right now. Higher is better." /></h3>
                  <p className="text-3xl font-bold text-gray-900 mb-3">{marketScore}%</p>
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${marketScore >= 70 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      {marketScore >= 70
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                      }
                    </svg>
                    <span>{marketScore >= 70 ? '+5%' : '-12%'}</span>
                    <span className="text-gray-400 font-normal">from last week</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#FFEDD4] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#F54900]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Skill Health Trends */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Skills Performance <HelpTip text="Shows how each of your skills is trending in the job market — growing, stable, or declining." /></h3>
              <div className="flex items-center gap-3 text-xs">
              </div>
            </div>
            {aiData?.skillHealth && aiData.skillHealth.length > 0 ? (
              <div className="space-y-4">
                {aiData.skillHealth
                  .sort((a, b) => b.healthScore - a.healthScore)
                  .slice(0, 3)
                  .map((skill, index) => {
                    const trendColors = {
                      growing: { bg: 'bg-[#06B4C9]', text: 'text-cyan-700', light: 'bg-cyan-50' },
                      stable: { bg: 'bg-slate-300', text: 'text-slate-600', light: 'bg-slate-100' },
                      declining: { bg: 'bg-amber-400', text: 'text-amber-700', light: 'bg-amber-50' }
                    };
                    const colors = trendColors[skill.trend];
                    
                    return (
                      <div key={skill.skillName} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">{skill.skillName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.text} ${colors.light}`}>
                              {skill.trend}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{skill.healthScore}%</span>
                        </div>
                        <div className="relative h-3.5 bg-gray-100 rounded-sm overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full ${colors.bg} transition-all duration-700 ease-out rounded-sm`}
                            style={{ width: `${skill.healthScore}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Demand: {skill.currentDemand.toFixed(1)}%</span>
                          <span>Decay Rate: {skill.decayRate.toFixed(2)}% <HelpTip size={12} text="How quickly this skill loses relevance if not updated. A lower number means the skill stays valuable longer." /></span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-2">No skill analytics available yet</p>
                <p className="text-xs text-gray-400">Connect your wallet and upload credentials to see performance trends</p>
              </div>
            )}
          </div>

          {/* Pending CVR Banner */}
          {hasPendingCVR && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between">
              <p className="text-blue-700 text-sm">Your Resume is currently being verified by the registrar.</p>
              <button onClick={handleClosePendingCard} className="text-blue-400 hover:text-blue-600 font-bold px-2">×</button>
            </div>
          )}

          {/* Verified Credentials */}
          <div id="tour-credentials" className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Verified Credentials <HelpTip text="Certificates and qualifications issued by your university, securely stored and verifiable by employers." /></h2>
              <button
                onClick={() => router.push('/student/skills')}
                className="text-[#06B4C9] text-sm font-medium hover:underline"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allCredentials.length > 0 ? (
                allCredentials.slice(0, 4).map((cred) => (
                  <CredentialCard key={cred.id} {...cred} />
                ))
              ) : (
                <div className="col-span-2 p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">No credentials detected yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: sticks to top, doesn't affect left column height ── */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <RecentActivity activities={activities} />

          <div id="tour-setup" className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Setup</h3>
            <div className="relative pt-1 mb-4">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-semibold py-1 px-2 uppercase rounded-full text-[#06B4C9] bg-[#06B4C9]/10">
                  {user?.wallet_address && allCredentials.length > 0 ? 'Almost Done' : 'In Progress'}
                </span>
                <span className="text-xs font-semibold text-[#06B4C9]">
                  {user?.wallet_address ? ((hasPendingCVR || hasCVRExport) ? '75%' : '50%') : '25%'}
                </span>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-[#06B4C9]/10">
                <div
                  style={{ width: user?.wallet_address ? ((hasPendingCVR || hasCVRExport) ? '75%' : '50%') : '25%' }}
                  className="bg-[#06B4C9] transition-all duration-500"
                ></div>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm text-gray-600">
                {user?.wallet_address
                  ? <span className="text-green-500 font-bold mr-2">✓</span>
                  : <span className="text-gray-300 mr-2">○</span>}
                Connect Wallet <HelpTip size={13} text="A digital wallet (like MetaMask) stores your certificates securely on the blockchain so employers can verify them." />
              </li>
              <li className="flex items-center text-sm text-gray-600">
                {hasPendingCVR || hasCVRExport
                  ? <span className="text-green-500 font-bold mr-2">✓</span>
                  : <span className="text-gray-300 mr-2">○</span>}
                Upload Resume (CVR) <HelpTip size={13} text="CVR stands for Credential-Verified Resume — a resume that links to your verified certificates for proof." />
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <span className="text-gray-300 mr-2">○</span>
                Complete Profile
              </li>
            </ul>
            <button
              onClick={() => router.push('/student/profile')}
              className="w-full bg-[#06B4C9] !text-white py-2.5 rounded-lg text-sm font-bold hover:bg-[#06B4C9]/80 transition-colors"
            >
              Complete Setup
            </button>
          </div>

          {/* ── Quick Course Picks ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Recommended Courses</h3>
              <Link href="/student/explore-courses" className="text-xs font-semibold text-[#06B4C9] hover:text-[#06B4C9]/70 transition-colors">
                Explore More →
              </Link>
            </div>

            {aiData?.recommendations && (aiData.recommendations as any[]).length > 0 ? (
              <div className="space-y-3">
                {(aiData.recommendations as any[]).slice(0, 3).map((rec: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-orange-300 text-white'
                    }`}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                          {rec.courseTitle || rec.courseName || 'Course'}
                        </p>
                        <span className="flex-shrink-0 text-xs font-bold text-[#06B4C9]">
                          {rec.relevanceScore || 80}%
                        </span>
                      </div>
                      {rec.provider && (
                        <span className={`mt-1.5 inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${providerPill(rec.provider)}`}>
                          {rec.provider}
                        </span>
                      )}
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {extractTags(rec.courseTitle || rec.courseName || '').map(tag => (
                          <span key={tag} className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {rec.link && (
                        <div className="flex justify-end mt-1.5">
                          <a
                            href={rec.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-gray-400 hover:text-[#06B4C9] transition-colors inline-flex items-center gap-0.5"
                          >
                            Take Course
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400 mb-2">No suggestions yet</p>
                <Link
                  href="/student/explore-courses"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#06B4C9] hover:underline"
                >
                  Browse all courses →
                </Link>
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}