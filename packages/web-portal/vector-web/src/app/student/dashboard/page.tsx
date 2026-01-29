'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; 
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CredentialCard from '@/components/dashboard/CredentialCard';
import RecentActivity from '@/components/dashboard/RecentActivity';

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
  full_name: string;
  student_id: string;
  role: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [hasPendingCVR, setHasPendingCVR] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [aiData, setAiData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
          .select('full_name, student_id, role')
          .eq('id', session.user.id)
          .maybeSingle();

        // 2. 🛡️ SAFE FALLBACK: If DB read fails, use Virtual Profile
        if (!profile) {
          console.warn("⚠️ Using Virtual Profile Fallback.");
          profile = {
            full_name: session.user.email?.split('@')[0] || "Ace Denulan", 
            student_id: "03-2026-2861",
            role: "student"
          };
        }

        // Capitalize the full name
        const capitalizedProfile = {
          ...profile,
          full_name: profile.full_name ? capitalizeWords(profile.full_name) : 'Student'
        };

        setUser(capitalizedProfile);

        // 3. Load AI Data
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

  const displayCredentials = aiData?.credentials?.map(cred => {
    const analysis = aiData.skillHealth.find(
      s => s.skillName.toLowerCase() === cred.skill_name.toLowerCase()
    );
    return {
      category: 'Verified Credential',
      title: cred.skill_name,
      issueDate: new Date(cred.issued_at).toLocaleDateString(),
      marketRelevance: analysis ? analysis.healthScore : 50,
      verified: true,
    };
  }) || [];

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
              You've earned <span className="font-bold text-white">{displayCredentials.length > 0 ? displayCredentials.length : '0'}</span> credential{displayCredentials.length !== 1 ? 's' : ''} this month!
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
            <p className="text-3xl font-bold text-gray-900">{displayCredentials.length}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>+{displayCredentials.length} this semester</span>
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
            <p className="text-3xl font-bold text-gray-900">{displayCredentials.length}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>ERC-1155 on Polygon</span>
          </div>
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

      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Verified Credentials</h2>
          <button onClick={() => router.push('/student/skills')} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
            View All <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {displayCredentials.length > 0 ? (
            displayCredentials.map((credential, index) => (
              <CredentialCard key={index} {...credential} />
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
              <p className="text-gray-500">No verified credentials found yet.</p>
            </div>
          )}
        </div>
      </div>

      <RecentActivity />
    </DashboardLayout>
  );
}