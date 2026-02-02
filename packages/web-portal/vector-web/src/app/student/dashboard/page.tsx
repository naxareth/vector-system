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
  const [activities, setActivities] = useState<ActivityItem[]>([]); // ⚡ Dynamic Activities State
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ⚡ 1. THE PIPELINE: Read Blockchain -> Deduplicate -> Send to AI
  const refreshPipeline = async (walletAddress: string, studentId: string) => {
    if (!walletAddress) return;

    try {
      // A. Read Blockchain
      const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      
      const foundSkills: string[] = [];
      const verifiedCreds: BlockchainCredential[] = [];
      const processedIds = new Set<number>();

      // ⚡ Dynamic Activity Builder
      const newActivities: ActivityItem[] = [];

      // 1. Add Wallet Event
      newActivities.push({
        id: 'wallet-conn',
        type: 'info',
        title: 'Wallet Connected',
        description: `Active: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        time: 'Just now'
      });

      // 2. Add CVR Event if exists in localStorage
      if (typeof window !== 'undefined' && localStorage.getItem('sampleCVRData')) {
        newActivities.push({
          id: 'cvr-gen',
          type: 'badge',
          title: 'CVR Generated',
          description: 'You created a new verified resume',
          time: 'Recent'
        });
      }

      // 3. Add Pending Event if exists
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
        if (processedIds.has(skillId)) continue;

        try {
          const balance = await contract.balanceOf(walletAddress, skillId);
          if (balance > 0n) {
            processedIds.add(skillId);
            foundSkills.push(skillName);

            verifiedCreds.push({
              title: skillName,
              category: 'Blockchain Verified',
              issueDate: 'Verified On-Chain',
              marketRelevance: 85,
              verified: true,
            });

            // 4. Add Credential Activity Event
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
      setActivities(newActivities); // ⚡ Set the dynamic activities

      // B. Feed AI (The Handoff)
      console.log("Sending to AI:", foundSkills);
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

  // ⚡ 2. THE BINDING
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert("Please install MetaMask to connect your wallet.");
      return;
    }

    setIsWalletConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

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
      alert("Failed to connect wallet: " + error.message);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // ⚡ 3. INITIALIZATION
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
          // Capitalize Name for UI
          const capitalizedProfile = {
            ...profile,
            full_name: profile.full_name ? capitalizeWords(profile.full_name) : 'Student'
          };
          setUser(capitalizedProfile);

          if (profile.wallet_address) {
            await refreshPipeline(profile.wallet_address, profile.student_id);
          } else {
            // Default activity if no wallet
            setActivities([{
              id: 'init',
              type: 'info',
              title: 'Welcome to Vector',
              description: 'Connect wallet to sync verified skills',
              time: 'Now'
            }]);
            
            // Still try to fetch AI data based on just profile/resume if wallet missing
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
      <div className="mb-6 -mt-6 md:-mt-2 bg-gradient-to-l from-purple-400 to-purple-600 rounded-2xl shadow-lg overflow-visible relative">
        <div className="flex flex-col md:flex-row items-center justify-between py-2 px-4 md:py-3 md:px-10 relative">
          <div className="flex-1 text-white z-10">
            <h1 className="text-2xl md:text-5xl font-bold mb-2 flex items-center gap-2">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 
            </h1>
            <p className="text-purple-100 text-sm md:text-base mb-1">
              You've earned <span className="font-bold text-white">{allCredentials.length > 0 ? allCredentials.length : '0'}</span> credential{allCredentials.length !== 1 ? 's' : ''} this month!
            </p>
            <p className="text-purple-100 text-xs md:text-sm">
              Keep it up and improve your progress!
            </p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Verified Skills Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
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
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
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
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
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

        {/* Credential Tokens Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Credential Tokens</h3>
          </div>
          <div className="mb-2">
            <p className="text-3xl font-bold text-gray-900">{allCredentials.length}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>ERC-1155 on Polygon</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {loading ? (
             <span className="text-sm text-purple-600 animate-pulse bg-purple-50 px-3 py-1 rounded-full">⚡ Loading...</span>
          ) : user?.wallet_address ? (
             <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200 shadow-sm">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               Wallet: {user.wallet_address.slice(0,6)}...{user.wallet_address.slice(-4)}
             </span>
          ) : (
             <button 
               onClick={connectWallet}
               disabled={isWalletConnecting}
               className="flex items-center gap-2 text-sm bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all shadow-md active:scale-95"
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

      {hasPendingCVR && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 md:mb-8 animate-fade-in">
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
        <div className={`border rounded-xl p-4 mb-6 md:mb-8 transition-all duration-500 shadow-sm ${
          decayingSkill.trend === 'growing' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
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
                {!user?.wallet_address && (
                  <p className="text-purple-600 text-sm mt-1 font-medium cursor-pointer" onClick={connectWallet}>
                    Connect your wallet to scan for skills.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ⚡ Dynamic Recent Activity */}
      <RecentActivity activities={activities} />
    </DashboardLayout>
  );
}