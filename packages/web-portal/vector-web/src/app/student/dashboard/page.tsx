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
  credentials: any[];
}

interface UserProfile {
  id: string;
  full_name: string;
  student_id: string;
  role: string;
  wallet_address?: string;
}

interface BlockchainCredential {
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [hasPendingCVR, setHasPendingCVR] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [aiData, setAiData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockchainCredentials, setBlockchainCredentials] = useState<BlockchainCredential[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]); 
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  
  // 🆕 State for Tutorial Visibility
  const [showTutorial, setShowTutorial] = useState(true);

  const capitalizeWords = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const refreshPipeline = async (walletAddress: string, studentId: string) => {
    if (!walletAddress) return;

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      
      const foundSkills: string[] = [];
      const verifiedCreds: BlockchainCredential[] = [];
      const processedIds = new Set<number>();

      const newActivities: ActivityItem[] = [];

      newActivities.push({
        id: 'wallet-conn',
        type: 'info',
        title: 'Wallet Connected',
        description: `Active: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        time: 'Just now'
      });

      if (typeof window !== 'undefined' && localStorage.getItem('sampleCVRData')) {
        newActivities.push({
          id: 'cvr-gen',
          type: 'badge',
          title: 'CVR Generated',
          description: 'You created a new verified resume',
          time: 'Recent'
        });
      }

      if (typeof window !== 'undefined' && localStorage.getItem('pendingCVR')) {
        setHasPendingCVR(true);
        newActivities.push({
          id: 'cvr-pending',
          type: 'warning',
          title: 'Verification Pending',
          description: 'Awaiting registrar approval',
          time: 'Ongoing'
        });
      }

      for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
        if (typeof skillId !== 'number') continue;
        if (!Number.isInteger(skillId) || skillId <= 0) continue;
        if (processedIds.has(skillId)) continue;

        try {
          const balance = await contract.balanceOf(walletAddress, skillId);
          if (balance > 0) {
            processedIds.add(skillId);
            foundSkills.push(skillName);

            verifiedCreds.push({
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
        } catch (readError) {
          console.error(`Error reading ${skillName}:`, readError);
        }
      }

      setBlockchainCredentials(verifiedCreds);
      setActivities(newActivities); 

      // B. Feed AI (The Handoff)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: studentId, 
          resumeText: "",
          skillsOverride: foundSkills 
        })
      });
      
      const json = await res.json();
      if (json.status === 'success') {
        setAiData(json.data);
      }

    } catch (error) {
      console.error("Pipeline Error:", error);
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      // 🆕 Redirect to MetaMask download if not found
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsWalletConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0].toLowerCase();

      setUser(prev => prev ? ({ ...prev, wallet_address: address }) : null);

      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({ wallet_address: address })
          .eq('id', user.id);

        if (error) throw error;
        console.log("✅ Wallet Linked to DB");
        await refreshPipeline(address, user.student_id);
      }
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      
      if (
        error?.code === -32002 || 
        error?.info?.error?.code === -32002 ||
        error?.error?.code === -32002 || 
        (typeof error?.message === 'string' && error.message.includes("already pending"))
      ) {
         alert("A wallet connection request is already pending. Please open your MetaMask extension to approve it.");
      } else {
         alert("Failed to connect wallet: " + (error.message || "Unknown error"));
      }
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

          if (profile.wallet_address) {
            await refreshPipeline(profile.wallet_address, profile.student_id);
          } else {
            setActivities([{
              id: 'init',
              type: 'info',
              title: 'Welcome to Vector',
              description: 'Connect wallet to sync verified skills',
              time: 'Now'
            }]);
            
            const res = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                studentId: profile.student_id, 
                resumeText: "" 
              })
            });
            const json = await res.json();
            if (json.status === 'success') {
              setAiData(json.data);
            }
          }
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

  const dbCredentials = aiData?.credentials?.map(cred => {
    const analysis = aiData.skillHealth.find(
      s => s.skillName.toLowerCase() === cred.skill_name.toLowerCase()
    );
    return {
      category: 'Database Credential',
      title: cred.skill_name,
      issueDate: new Date(cred.issued_at).toLocaleDateString(),
      marketRelevance: analysis ? analysis.healthScore : 50,
      verified: true,
    };
  }) || [];

  const uniqueDbCredentials = dbCredentials.filter(dbCred => 
    !blockchainCredentials.some(chainCred => chainCred.title === dbCred.title)
  );

  const allCredentials = [...blockchainCredentials, ...uniqueDbCredentials];

  return (
    <DashboardLayout>
      {/* Welcome Banner */}
      <div className="mb-6 -mt-6 md:-mt-2 bg-purple-50 border border-purple-100 rounded-2xl overflow-visible relative">
        <div className="flex flex-col md:flex-row items-center justify-between py-2 px-4 md:py-3 md:px-10 relative">
          <div className="flex-1 text-purple-900 z-10 pl-4">
            <h1 className="text-2xl md:text-5xl font-bold mb-2 flex items-center gap-2">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 
            </h1>
            <p className="text-purple-700 text-sm md:text-base mb-1">
              You've earned <span className="font-bold text-purple-900">{allCredentials.length > 0 ? allCredentials.length : '0'}</span> credential{allCredentials.length !== 1 ? 's' : ''} this month!
            </p>
            <p className="text-purple-700 text-sm md:text-base mb-1">
              Keep it up and improve your progress!
            </p>
            <div className="flex items-center gap-3 mt-4">
              {loading ? (
                <span className="text-sm text-purple-600 animate-pulse bg-purple-50 px-3 py-1 rounded-full">⚡ Loading...</span>
              ) : user?.wallet_address ? (
                <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="font-medium">Wallet Address:</span>
                  <span className="font-mono">{`${user.wallet_address.slice(0,6)}...${user.wallet_address.slice(-4)}`}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user?.wallet_address) return;
                      try {
                        await navigator.clipboard.writeText(user.wallet_address);
                        setCopiedWallet(true);
                        setTimeout(() => setCopiedWallet(false), 2000);
                      } catch (e) {
                        console.error('Copy failed', e);
                      }
                    }}
                    className="p-1 rounded hover:bg-white/50 transition-colors text-gray-600"
                    aria-label="Copy wallet address"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" /><rect x="8" y="8" width="12" height="12" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </button>
                  {copiedWallet && <span className="text-xs text-green-700 font-medium">Copied</span>}
                </span>
              ) : (
                <button 
                  onClick={connectWallet}
                  disabled={isWalletConnecting}
                  className="flex items-center gap-2 text-sm bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all active:scale-95"
                >
                  {isWalletConnecting ? (
                    <>Connecting...</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Connect Wallet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="relative w-80 h-40 md:w-[500px] md:h-56 mt-4 md:mt-0 md:-mr-8 md:-mb-8">
            <img 
              src="/sidebar-illustration.png" 
              alt="Dashboard Illustration" 
              className="absolute right-4 -top-6 md:-top-28 w-[150%] h-[150%] object-contain drop-shadow-2xl opacity-95"
            />
          </div>
          {loading && (
            <span className="absolute top-10 right-4 text-xs text-purple-200 animate-pulse bg-purple-700/50 px-3 py-1 rounded-full">
              ⚡ Analyzing...
            </span>
          )}
        </div>
      </div>

      {/* 🆕 WALLET TUTORIAL SECTION (Only visible if no wallet connected) */}
      {!loading && !user?.wallet_address && showTutorial && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-lg mb-8 overflow-hidden relative">
          {/* Header */}
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              How to Connect Your Wallet
            </h3>
            <button onClick={() => setShowTutorial(false)} className="text-blue-400 hover:text-blue-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3 text-orange-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">1. Install MetaMask</h4>
              <p className="text-sm text-gray-500 mb-3">Download the browser extension or mobile app.</p>
              <a href="https://metamask.io/download/" target="_blank" className="text-xs text-blue-600 font-semibold hover:underline">Download Here &rarr;</a>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">2. Create Account</h4>
              <p className="text-sm text-gray-500">Follow the setup instructions to create your digital wallet address.</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">3. Connect</h4>
              <p className="text-sm text-gray-500 mb-3">Click the button in the dashboard header to link.</p>
              <button 
                onClick={connectWallet}
                className="px-4 py-1.5 bg-gray-900 text-white text-xs rounded-full hover:bg-black transition-all"
              >
                Connect Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (Main Stats & Credentials) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Verified Skills Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100/50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-600">Verified Skills</h3>
              </div>
              <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">{allCredentials.length}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{allCredentials.length} this semester</span>
              </div>
            </div>

            {/* Market Score Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100/50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-600">Market Score</h3>
              </div>
              <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">
                  {aiData?.skillHealth?.length && aiData.skillHealth.length > 0 
                    ? Math.round(aiData.skillHealth.reduce((acc, s) => acc + s.healthScore, 0) / aiData.skillHealth.length)
                    : 0}%
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+5% from last month</span>
              </div>
            </div>

            {/* Skill Health Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100/50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-600">Skill Health</h3>
              </div>
              <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">
                  {aiData?.skillHealth.filter(s => s.healthScore >= 60).length || 0}/{aiData?.skillHealth.length || 12}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{aiData?.skillHealth.filter(s => s.healthScore < 60).length || 1} skill needs attention</span>
              </div>
            </div>

            {/* Job Matches Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100/50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-600">Job Matches</h3>
              </div>
              <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">{allCredentials.length > 0 ? allCredentials.length * 12 + 4 : 0}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>Active roles fitting your profile</span>
              </div>
            </div>
          </div>

          {hasPendingCVR && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-fade-in shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-blue-500 mt-0.5">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Pending Credential Verification</h3>
                  <p className="text-blue-700 text-sm">Your CVR is currently being verified by the registrar.</p>
                </div>
                <button onClick={handleClosePendingCard} className="text-blue-400 hover:text-blue-600">×</button>
              </div>
            </div>
          )}

          {/* Insight Section */}
          {!loading && aiData && decayingSkill && (
            <div className={`border rounded-xl p-4 transition-all duration-500 shadow-sm ${
              decayingSkill.trend === 'growing' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
            }`}>
              {/* Insight Content Unchanged */}
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${decayingSkill.trend === 'growing' ? 'text-green-500' : 'text-orange-500'}`}>
                  {decayingSkill.trend === 'growing' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${decayingSkill.trend === 'growing' ? 'text-green-900' : 'text-orange-900'}`}>
                    {decayingSkill.trend === 'growing' ? 'Market Opportunity Detected' : 'Skill Decay Detected'}
                  </h3>
                  <p className={`text-sm ${decayingSkill.trend === 'growing' ? 'text-green-700' : 'text-orange-700'}`}>
                    {decayingSkill.trend === 'growing' 
                      ? `Great news! Demand for ${decayingSkill.skillName} is skyrocketing (Market Demand: ${decayingSkill.currentDemand} jobs).`
                      : `Your ${decayingSkill.skillName} proficiency relevance has dropped due to market shifts.`
                    }
                  </p>
                  
                  {recommendedCourses.length > 0 && (
                    <div className="mt-3 bg-white/60 rounded-lg p-3 border border-white/50">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">AI Recommendation:</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{recommendedCourses[0].courseName}</span>
                        <span className="text-xs bg-white px-2 py-1 rounded border shadow-sm">
                          {recommendedCourses[0].relevanceScore}% Match
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Verified Micro-Credentials Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Verified Credentials</h2>
              <button onClick={() => router.push('/student/skills')} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1 transition-colors">
                View All <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            
            {/* Credentials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {allCredentials.length > 0 ? (
                allCredentials.map((credential, index) => (
                  <CredentialCard key={index} {...credential} />
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 p-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">No verified credentials found.</p>
                    {!user?.wallet_address ? (
                      <p className="text-purple-600 text-sm mt-1 font-medium cursor-pointer" onClick={connectWallet}>
                        Connect your wallet to scan for skills.
                      </p>
                    ) : (
                      <button 
                        onClick={() => router.push('/student/cvr')}
                        className="mt-3 bg-purple-600 !text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition shadow-sm"
                      >
                        Upload Resume for Analysis
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Recent Activity + Extra Widgets) */}
        <div className="xl:col-span-1 space-y-6">
          {/* ⚡ Dynamic Recent Activity - Stays on Right now */}
          <RecentActivity activities={activities} />
          
          {/* Complete Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Setup Checklist</h3>
            
            <div className="relative pt-1 mb-4">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                    {user?.wallet_address && allCredentials.length > 0 ? 'Almost Done' : 'In Progress'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-purple-600">
                    {user?.wallet_address ? (allCredentials.length > 0 ? '75%' : '50%') : '25%'}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                <div 
                  style={{ width: user?.wallet_address ? (allCredentials.length > 0 ? '75%' : '50%') : '25%' }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-600 transition-all duration-500"
                ></div>
              </div>
            </div>

            <ul className="space-y-3 mb-6">

              <li className="flex items-center text-sm text-gray-600">
                  {user?.wallet_address ? (
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2"></div>
                  )}
                  Connect Wallet
              </li>
              <li className="flex items-center text-sm text-gray-600">
                  {allCredentials.length > 0 || hasPendingCVR ? (
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2"></div>
                  )}
                  Upload Resume (CVR)
              </li>
              <li className="flex items-center text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2"></div>
                  Complete Profile Information
              </li>
            </ul>

            <button 
              onClick={() => router.push('/student/profile')}
              className="w-full block text-center bg-purple-50 text-purple-700 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
            >
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}