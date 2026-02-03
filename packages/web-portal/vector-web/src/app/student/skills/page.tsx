'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

interface SkillData {
  name: string;
  category: string;
  marketDemand: string;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
  healthScore?: number;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userWallet, setUserWallet] = useState<string | null>(null);

  // ⚡ Helper: Convert AI Score to Text Label
  const getDemandLabel = (score: number) => {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  // ⚡ Helper: Convert AI Trend to Icon Direction
  const getTrendDirection = (trendStr: string): 'up' | 'down' | 'stable' => {
    if (trendStr === 'growing') return 'up';
    if (trendStr === 'declining') return 'down';
    return 'stable';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get User Session & Wallet
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('users')
          .select('wallet_address, student_id')
          .eq('id', session.user.id)
          .single();

        if (!profile?.wallet_address) {
          setLoading(false);
          return;
        }

        setUserWallet(profile.wallet_address);

        // 2. Read Blockchain (The Source of Truth)
        const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
        
        const foundSkillNames: string[] = [];
        const processedIds = new Set<number>();

        // Scan wallet for all known skills
        for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
          if (typeof skillId !== 'number' || processedIds.has(skillId)) continue;

          try {
            const balance = await contract.balanceOf(profile.wallet_address, skillId);
            if (balance > 0n) {
              processedIds.add(skillId);
              foundSkillNames.push(skillName);
            }
          } catch (e) {
            console.error(e);
          }
        }

        // 3. Ask AI for Market Analysis of these specific skills
        if (foundSkillNames.length > 0) {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              studentId: profile.student_id, 
              resumeText: "",
              skillsOverride: foundSkillNames // <--- Critical: Force AI to look at these
            })
          });

          const json = await res.json();
          
          if (json.status === 'success' && json.data.skillHealth) {
            // 4. Map AI Data to UI Format
            const mappedSkills: SkillData[] = json.data.skillHealth.map((analysis: any) => ({
              name: analysis.skillName,
              category: 'Blockchain Verified', // Or map strictly if you have categories
              marketDemand: getDemandLabel(analysis.healthScore),
              lastUpdated: 'Verified On-Chain',
              trend: getTrendDirection(analysis.trend),
              healthScore: analysis.healthScore
            }));
            
            setSkills(mappedSkills);
          }
        }

      } catch (error) {
        console.error("Skills Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 -mt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Skills</h1>
        <p className="text-sm md:text-base text-gray-500">Track and manage your verified skills</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center text-purple-600 animate-pulse">
          Analyzing Blockchain Assets...
        </div>
      )}

      {/* Empty State (No Wallet or No Skills) */}
      {!loading && skills.length === 0 && (
        <div className="bg-white rounded-xl p-12 border-2 border-dashed border-gray-200 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Verified Skills Found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {!userWallet 
              ? "Connect your wallet on the dashboard to view your blockchain credentials." 
              : "Your wallet is connected, but no VECTOR credentials were found."}
          </p>
          <Link href="/student/dashboard" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      )}

      {/* Skills Grid */}
      {!loading && skills.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {skills.map((skill, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{skill.name}</h3>
                  <span className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 font-medium">
                    {skill.category}
                  </span>
                </div>
                
                {/* Trend Indicator */}
                <div className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-lg ${
                  skill.trend === 'up' ? 'text-green-700 bg-green-50' : 
                  skill.trend === 'down' ? 'text-red-700 bg-red-50' : 
                  'text-gray-600 bg-gray-50'
                }`}>
                  {skill.trend === 'up' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      Rising
                    </>
                  )}
                  {skill.trend === 'down' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                      Cooling
                    </>
                  )}
                  {skill.trend === 'stable' && (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>
                      Stable
                    </>
                  )}
                </div>
              </div>

              {/* Market Demand Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Market Demand</span>
                  <span className={`font-bold ${
                    skill.marketDemand === 'Very High' ? 'text-green-600' :
                    skill.marketDemand === 'High' ? 'text-blue-600' :
                    'text-orange-600'
                  }`}>
                    {skill.marketDemand}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      skill.healthScore && skill.healthScore >= 80 ? 'bg-green-500' :
                      skill.healthScore && skill.healthScore >= 60 ? 'bg-blue-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${skill.healthScore || 50}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {skill.lastUpdated}
                </span>
                <span className="text-xs text-gray-400">ID: {skill.name.substring(0,3).toUpperCase()}-001</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}