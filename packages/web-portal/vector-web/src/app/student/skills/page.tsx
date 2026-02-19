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

  const getDemandLabel = (score: number) => {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  const getTrendDirection = (trendStr: string): 'up' | 'down' | 'stable' => {
    if (trendStr === 'growing') return 'up';
    if (trendStr === 'declining') return 'down';
    return 'stable';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('users')
          .select('wallet_address, student_id')
          .eq('id', session.user.id)
          .single();

        setUserWallet(profile?.wallet_address || null);

        // 1. Fetch Secure DB Credentials
        const dbRes = await fetch('/api/student/credentials');
        const dbCreds = dbRes.ok ? await dbRes.json() : [];
        const dbSkillNames = dbCreds.map((c: any) => c.skill_name);
        const foundSkillNames: string[] = [...dbSkillNames];

        // 2. Read Blockchain (if wallet exists)
        if (profile?.wallet_address && ethers.isAddress(profile.wallet_address)) {
            const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
            
            // 🛡️ SECURITY CHECK: Does contract exist at this address?
            const code = await provider.getCode(CONTRACT_ADDRESS);
            if (code === "0x") {
                console.error("Contract not found at address. Did you redeploy or restart Hardhat?");
            } else {
                const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
                const processedIds = new Set<number>();

                for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
                    if (typeof skillId !== 'number' || processedIds.has(skillId)) continue;
                    try {
                        // Use staticCall to prevent state changes and catch "0x" errors early
                        const balance = await contract.balanceOf(profile.wallet_address, skillId);
                        if (balance > 0n) {
                            processedIds.add(skillId);
                            if (!foundSkillNames.includes(skillName)) {
                                foundSkillNames.push(skillName);
                            }
                        }
                    } catch (e) { 
                        console.warn(`Error scanning skill ${skillName}:`, e);
                    }
                }
            }
        }

        // 3. AI Market Analysis
        if (foundSkillNames.length > 0) {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              studentId: profile?.student_id || 'guest', 
              resumeText: "",
              skillsOverride: foundSkillNames 
            })
          });

          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.data.skillHealth) {
              const mappedSkills: SkillData[] = json.data.skillHealth.map((analysis: any) => ({
                name: analysis.skillName,
                category: 'Blockchain Verified', 
                marketDemand: getDemandLabel(analysis.healthScore),
                lastUpdated: 'Verified',
                trend: getTrendDirection(analysis.trend),
                healthScore: analysis.healthScore
              }));
              setSkills(mappedSkills);
            }
          }
        } else {
            setSkills([]);
        }

      } catch (error) {
        console.error("Critical Skills Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-4 -mt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Skills</h1>
        <p className="text-sm md:text-base text-gray-500">Track and manage your verified skills</p>
      </div>

      {loading && (
        <div className="p-12 text-center text-purple-600 animate-pulse">
          Syncing Credentials...
        </div>
      )}

      {!loading && skills.length === 0 && (
        <div className="bg-white rounded-xl p-12 border-2 border-dashed border-gray-200 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Verified Skills Found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {!userWallet 
              ? "Connect your wallet on the dashboard to view your blockchain credentials." 
              : "We checked the blockchain and your university records, but no VECTOR credentials were found."}
          </p>
          <Link href="/student/dashboard" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      )}

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
                <div className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-lg ${
                  skill.trend === 'up' ? 'text-green-700 bg-green-50' : 
                  skill.trend === 'down' ? 'text-red-700 bg-red-50' : 
                  'text-gray-600 bg-gray-50'
                }`}>
                  {skill.trend === 'up' && <>Rising <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></>}
                  {skill.trend === 'down' && <>Cooling <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg></>}
                  {skill.trend === 'stable' && <>Stable <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg></>}
                </div>
              </div>
              
              <div className="mb-4">
                 <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-500">Market Demand: {skill.marketDemand}</span>
                    <span className="font-bold text-gray-900">{skill.healthScore}%</span>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${skill.healthScore && skill.healthScore >= 60 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${skill.healthScore}%` }}></div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}