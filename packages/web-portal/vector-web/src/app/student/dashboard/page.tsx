'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; 
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CredentialCard from '@/components/dashboard/CredentialCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
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
  credentials: {
    id: string;
    skill_name: string;
    issued_at: string;
    token_id: string;
  }[];
}

interface UserProfile {
  id: string; // Needed for update
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
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // ⚡ Helper: Fetch Blockchain Data
  const fetchBlockchainCredentials = async (walletAddress: string) => {
    // Only proceed if ethereum object exists
    if (typeof window === 'undefined' || !(window as any).ethereum || !walletAddress) return;

    try {
      // Use "any" to prevent network change errors
      const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
      
      // We check network just to be safe, but we don't block reading
      const network = await provider.getNetwork();
      if (network.chainId !== 31337n && network.chainId !== 1337n) {
        console.warn("Wrong network for reading credentials. Switch to Localhost.");
        // Optional: Could prompt switch here
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      const foundCredentials: BlockchainCredential[] = [];

      for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
        if (typeof skillId !== 'number') continue; 
        
        try {
          const balance = await contract.balanceOf(walletAddress, skillId);
          if (balance > 0n) {
            foundCredentials.push({
              category: 'Blockchain Verified',
              title: skillName,
              issueDate: 'Verified On-Chain',
              marketRelevance: 95,
              verified: true,
            });
          }
        } catch (readError) {
          console.error(`Failed to read balance for ${skillName}`, readError);
        }
      }
      setBlockchainCredentials(foundCredentials);
    } catch (error) {
      console.error("Error fetching blockchain credentials:", error);
    }
  };

  // ⚡ Helper: Connect Wallet & Save to DB
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert("Please install MetaMask to connect your wallet.");
      return;
    }

    setIsWalletConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      // Request access
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      // Save to Supabase
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({ wallet_address: address })
          .eq('id', user.id);

        if (error) throw error;
        
        // Update Local State
        setUser(prev => prev ? ({ ...prev, wallet_address: address }) : null);
        
        // Fetch Credentials immediately
        await fetchBlockchainCredentials(address);
      }
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet: " + error.message);
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

        // 1. Try to fetch profile
        let { data: profile } = await supabase
          .from('users')
          .select('id, full_name, student_id, role, wallet_address') // Requested ID for updates
          .eq('id', session.user.id)
          .maybeSingle();

        // 2. Safe Fallback
        if (!profile) {
          console.warn("⚠️ Using Virtual Profile Fallback.");
          profile = {
            id: session.user.id,
            full_name: session.user.email?.split('@')[0] || "Student", 
            student_id: "03-2026-PENDING",
            role: "student",
            wallet_address: "" 
          };
        }

        setUser(profile);

        // 3. Fetch Blockchain Credentials
        if (profile.wallet_address && !profile.wallet_address.includes("pending")) {
           await fetchBlockchainCredentials(profile.wallet_address);
        }

        // 4. Load AI Data
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

      } catch (error) {
        console.error("Dashboard Error:", error);
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

  const allCredentials = [...blockchainCredentials, ...dbCredentials];

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name || 'Student'}! 👋
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            Overview of your credentials and market standing
          </p>
        </div>
        
        {/* Wallet Connection Status */}
        <div className="flex items-center gap-3">
          {loading ? (
             <span className="text-sm text-purple-600 animate-pulse bg-purple-50 px-3 py-1 rounded-full">⚡ Loading...</span>
          ) : user?.wallet_address && !user.wallet_address.includes("pending") ? (
             <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               Wallet Connected: {user.wallet_address.slice(0,6)}...{user.wallet_address.slice(-4)}
             </span>
          ) : (
             <button 
               onClick={connectWallet}
               disabled={isWalletConnecting}
               className="flex items-center gap-2 text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all shadow-sm"
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
        <div className={`border rounded-xl p-4 mb-6 md:mb-8 transition-all duration-500 ${
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
                <div className="mt-3 bg-white/50 rounded-lg p-3">
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
          <button onClick={() => router.push('/student/skills')} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
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
            <div className="col-span-1 md:col-span-2 p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <p className="text-gray-600 font-medium">No verified credentials found.</p>
                <p className="text-gray-400 text-sm mt-1">Connect your wallet to see blockchain credentials.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <RecentActivity />
    </DashboardLayout>
  );
}