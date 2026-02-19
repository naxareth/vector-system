'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CredentialCard from '@/components/dashboard/CredentialCard';
import RecentActivity, { ActivityItem } from '@/components/dashboard/RecentActivity';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';

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
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
  certificateNumber?: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [hasPendingCVR, setHasPendingCVR] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [aiData, setAiData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [allCredentials, setAllCredentials] = useState<CredentialItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]); 
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
   
  const [showTutorial, setShowTutorial] = useState(true);

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

      // 1. 🛡️ Fetch Secure DB Credentials (Category 2 & 3 Fix)
      const dbRes = await fetch('/api/student/credentials');
      const dbCreds = dbRes.ok ? await dbRes.json() : [];

      // 2. Read Blockchain (Verification Layer)
      if (walletAddress) {
        newActivities.push({
            id: 'wallet-conn',
            type: 'info',
            title: 'Wallet Connected',
            description: `Active: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            time: 'Just now'
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

      // 3. 🤖 AI Analysis (Flexible Identifier Fallback)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: identifier, // Use profile.student_id OR user.id (UUID)
          resumeText: "",
          skillsOverride: Array.from(new Set([...foundSkills, ...dbCreds.map((c:any) => c.skill_name)]))
        })
      });
      
      const json = await res.json();
      if (json.status === 'success') {
        setAiData(json.data);
      }

      // 4. Merge & Deduplicate Credentials for UI
      const mergedCreds: CredentialItem[] = [...blockchainCreds];
      dbCreds.forEach((dbC: any) => {
         const exists = mergedCreds.find(mc => mc.title.toLowerCase() === dbC.skill_name.toLowerCase());
         if (!exists) {
            const analysis = json.data?.skillHealth?.find((s:any) => s.skillName === dbC.skill_name);
            mergedCreds.push({
                category: 'University Issued',
                title: dbC.skill_name,
                issueDate: new Date(dbC.issued_at).toLocaleDateString(),
                marketRelevance: analysis ? analysis.healthScore : 70,
                verified: true,
                certificateNumber: dbC.certificate_number
            });
         }
      });

      setAllCredentials(mergedCreds);
      setActivities(prev => [...newActivities, ...prev].slice(0, 10));

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
          // 🛡️ Pass UUID (session.user.id) as fallback for student_id
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

  const decayingSkill = aiData?.skillHealth.find(s => s.healthScore < 60) || 
                        aiData?.skillHealth.sort((a, b) => a.healthScore - b.healthScore)[0];

  const recommendedCourses = aiData?.recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 2) || [];

  return (
    <DashboardLayout>
      {/* 1. Welcome Banner (Full UI Retained) */}
      <div className="mb-6 -mt-6 md:-mt-2 bg-purple-50 border border-purple-100 rounded-2xl overflow-visible relative">
        <div className="flex flex-col md:flex-row items-center justify-between py-2 px-4 md:py-3 md:px-10 relative">
          <div className="flex-1 text-purple-900 z-10 pl-4">
            <h1 className="text-2xl md:text-5xl font-bold mb-2 flex items-center gap-2">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 
            </h1>
            <p className="text-purple-700 text-sm md:text-base mb-1">
              You've earned <span className="font-bold text-purple-900">{allCredentials.length}</span> credential{allCredentials.length !== 1 ? 's' : ''} this month!
            </p>
            <div className="flex items-center gap-3 mt-4">
              {loading ? (
                <span className="text-sm text-purple-600 animate-pulse bg-purple-50 px-3 py-1 rounded-full">⚡ Loading...</span>
              ) : user?.wallet_address ? (
                <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="font-medium">Wallet Address:</span>
                  <span className="font-mono">{`${user.wallet_address.slice(0,6)}...${user.wallet_address.slice(-4)}`}</span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(user.wallet_address || '')} className="p-1 rounded hover:bg-white/50 text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" /><rect x="8" y="8" width="12" height="12" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </button>
                </span>
              ) : (
                <button onClick={connectWallet} disabled={isWalletConnecting} className="flex items-center gap-2 text-sm bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800">
                  {isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
          <div className="relative w-80 h-40 md:w-[500px] md:h-56 mt-4 md:mt-0 md:-mr-8 md:-mb-8">
            <img src="/sidebar-illustration.png" alt="Illustration" className="absolute right-4 -top-6 md:-top-28 w-[150%] h-[150%] object-contain drop-shadow-2xl opacity-95"/>
          </div>
        </div>
      </div>

      {/* 2. Wallet Tutorial (Full UI Retained) */}
      {!loading && !user?.wallet_address && showTutorial && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-lg mb-8 overflow-hidden relative">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">How to Connect Your Wallet</h3>
            <button onClick={() => setShowTutorial(false)} className="text-blue-400 hover:text-blue-700">×</button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div><div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-600">1</div><h4 className="font-bold">Install MetaMask</h4></div>
            <div><div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600">2</div><h4 className="font-bold">Create Account</h4></div>
            <div><div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">3</div><h4 className="font-bold">Connect</h4></div>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm">
              <h3 className="text-sm font-medium text-gray-600">Verified Skills</h3>
              <p className="text-3xl font-bold text-gray-900">{allCredentials.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm">
              <h3 className="text-sm font-medium text-gray-600">Market Score</h3>
              <p className="text-3xl font-bold text-gray-900">{aiData?.skillHealth?.length ? Math.round(aiData.skillHealth.reduce((acc, s) => acc + s.healthScore, 0) / aiData.skillHealth.length) : 0}%</p>
            </div>
          </div>

          {hasPendingCVR && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between">
              <p className="text-blue-700 text-sm">Your Resume is currently being verified by the registrar.</p>
              <button onClick={handleClosePendingCard}>×</button>
            </div>
          )}

          {!loading && aiData && decayingSkill && (
            <div className={`border rounded-xl p-4 shadow-sm ${decayingSkill.trend === 'growing' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <h3 className="font-semibold">{decayingSkill.trend === 'growing' ? 'Market Opportunity Detected' : 'Skill Decay Detected'}</h3>
              <p className="text-sm">Demand for {decayingSkill.skillName} is currently {decayingSkill.trend}.</p>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Verified Credentials</h2>
              <button onClick={() => router.push('/student/skills')} className="text-purple-600 text-sm font-medium">View All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allCredentials.length > 0 ? (
                allCredentials.slice(0, 4).map((cred, i) => <CredentialCard key={i} {...cred} />)
              ) : (
                <div className="col-span-2 p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">No credentials found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <RecentActivity activities={activities} />

          {/* 4. Account Setup Checklist (Full UI Retained) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Setup Checklist</h3>
            <div className="relative pt-1 mb-4">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-semibold py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                  {user?.wallet_address && allCredentials.length > 0 ? 'Almost Done' : 'In Progress'}
                </span>
                <span className="text-xs font-semibold text-purple-600">{user?.wallet_address ? (allCredentials.length > 0 ? '75%' : '50%') : '25%'}</span>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                <div style={{ width: user?.wallet_address ? (allCredentials.length > 0 ? '75%' : '50%') : '25%' }} className="bg-purple-600 transition-all duration-500"></div>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm text-gray-600">
                {user?.wallet_address ? <span className="text-green-500 mr-2">✓</span> : <span className="mr-2">○</span>} Connect Wallet
              </li>
              <li className="flex items-center text-sm text-gray-600">
                {allCredentials.length > 0 || hasPendingCVR ? <span className="text-green-500 mr-2">✓</span> : <span className="mr-2">○</span>} Upload Resume (CVR)
              </li>
              <li className="flex items-center text-sm text-gray-600"><span className="mr-2">○</span> Complete Profile</li>
            </ul>
            <button onClick={() => router.push('/student/profile')} className="w-full bg-purple-50 text-purple-700 py-2 rounded-lg text-sm font-medium">Complete Setup</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}