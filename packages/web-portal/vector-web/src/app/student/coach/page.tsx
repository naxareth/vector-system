'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import MarketInsightsPanel from '@/components/student/MarketInsightsPanel';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface SkillMetric {
  name: string;
  category: string;
  score: number;
  trend: 'growing' | 'stable' | 'declining';
  growthRate: number;
  verified: boolean;
}

interface MarketPoint {
  date: string;
  [skill: string]: string | number;
}

export default function CoachPage() {
  const router = useRouter();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [studentId, setStudentId] = useState<string>('');
  // 🆕 UUID for the market insights panel (always a UUID, not student_id)
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [metrics, setMetrics] = useState({
    portfolioScore: 0,
    marketAlignment: 'Analyzing...',
    projectedGrowth: 0
  });
  const [skillsList, setSkillsList] = useState<SkillMetric[]>([]);
  const [realHistory, setRealHistory] = useState<MarketPoint[]>([]);
  const [selectedSkillView, setSelectedSkillView] = useState<string>('All');

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "👋 Hi! I'm connecting to the blockchain to analyze your career data..." }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 🆕 Always store the raw UUID for the market insights panel
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, student_id, wallet_address')
        .eq('id', session.user.id)
        .single();

      if (!profile) return;

      const activeIdentifier = profile.student_id || session.user.id;
      setStudentId(activeIdentifier);
      const firstName = profile.full_name?.split(' ')[0] || 'Student';

      // 1. Fetch wallet skills
      const foundSkills: string[] = [];
      if (profile.wallet_address) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
          const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
          const processedIds = new Set<number>();
          for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
            if (typeof skillId !== 'number' || processedIds.has(skillId)) continue;
            try {
              const balance = await contract.balanceOf(profile.wallet_address, skillId);
              if (balance > 0n) {
                processedIds.add(skillId);
                foundSkills.push(skillName);
              }
            } catch (e) { console.error(e); }
          }
        } catch (error) {
          console.warn("Wallet read failed.");
        }
      }

      // 2. Fetch AI Analysis
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeIdentifier,
          resumeText: "",
          skillsOverride: foundSkills
        })
      });

      const json = await res.json();

      if (json.status === 'success') {
        const aiData = json.data;
        let totalScore = 0;
        let overallTrendValue = 0;

        const dbVerifiedSkills = aiData.credentials?.map((c: any) => c.skill_name) || [];
        const allVerifiedNames = Array.from(new Set([...foundSkills, ...dbVerifiedSkills]));

        const processedSkills = aiData.skillHealth.map((s: any) => {
          totalScore += s.healthScore;
          if (s.trend === 'growing') overallTrendValue += 1;
          if (s.trend === 'declining') overallTrendValue -= 1;

          return {
            name: s.skillName,
            category: 'Tech',
            score: s.healthScore,
            trend: s.trend,
            growthRate: s.trend === 'growing' ? 0.15 : s.trend === 'declining' ? -0.10 : 0.02,
            verified: allVerifiedNames.includes(s.skillName)
          };
        });

        const avgScore = Math.round(totalScore / processedSkills.length) || 50;
        const alignment = avgScore > 75 ? 'Very High' : avgScore > 50 ? 'Moderate' : 'Needs Work';
        const growth = overallTrendValue > 0 ? '+12%' : overallTrendValue < 0 ? '-5%' : '+2%';

        setMetrics({ portfolioScore: avgScore, marketAlignment: alignment, projectedGrowth: parseInt(growth) });
        setSkillsList(processedSkills);
        if (json.data.history) setRealHistory(json.data.history);

        if (allVerifiedNames.length === 0) {
          setMessages([{
            role: 'ai',
            text: `👋 Hi ${firstName}! You don't have any verified skills yet, so I've loaded the **Global Market Trends** for you. Check out what's hot right now!`
          }]);
        } else {
          const topSkill = processedSkills.sort((a: any, b: any) => b.score - a.score)[0];
          setMessages([{
            role: 'ai',
            text: `👋 Hi ${firstName}! I've analyzed your **${allVerifiedNames.length}** verified credentials. Your **${topSkill?.name}** is looking strong!`
          }]);
        }
      }
      setLoading(false);
    };

    initPage();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          message: textToSend,
          context: {
            skills: skillsList,
            verifiedCount: skillsList.filter(s => s.verified).length
          }
        })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderTrendGraph = () => {
    if (realHistory.length === 0) return null;
    const allValues = realHistory.flatMap(d => Object.keys(d).filter(k => k !== 'date').map(k => Number(d[k])));
    const maxVal = allValues.length ? Math.max(...allValues) * 1.1 : 100;
    const minVal = allValues.length ? Math.min(...allValues) * 0.9 : 0;
    const range = (maxVal - minVal) || 1;
    const activeSkills = skillsList.map(s => s.name);
    const colors = ['#9333ea', '#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

    return (
      <div className="relative h-64 w-full">
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-300 pointer-events-none z-0">
          <span>{Math.round(maxVal)} jobs</span>
          <span className="border-b border-dashed border-gray-100 w-full"></span>
          <span>{Math.round(minVal)} jobs</span>
        </div>
        <svg className="absolute inset-0 h-full w-full overflow-visible z-10" preserveAspectRatio="none">
          {activeSkills.map((skill, index) => {
            if (selectedSkillView !== 'All' && selectedSkillView !== skill) return null;
            const points = realHistory.map((point, i) => {
              const x = (i / (realHistory.length - 1)) * 100;
              const val = Number(point[skill] || 0);
              const y = 100 - ((val - minVal) / range) * 100;
              return `${x},${y}`;
            }).join(' ');
            const color = colors[index % colors.length];
            return (
              <g key={skill}>
                <polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" className="drop-shadow-sm transition-all duration-500 ease-in-out" />
                {realHistory.map((point, i) => {
                  const x = (i / (realHistory.length - 1)) * 100;
                  const val = Number(point[skill] || 0);
                  const y = 100 - ((val - minVal) / range) * 100;
                  return <circle key={i} cx={`${x}%`} cy={`${y}%`} r="4" fill="white" stroke={color} strokeWidth="2" className="cursor-pointer hover:r-6 transition-all" />;
                })}
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-gray-400 mt-2">
          {realHistory.length > 1 && realHistory.filter((_, i) => i === 0 || i === realHistory.length - 1 || i % Math.ceil(realHistory.length / 5) === 0).map((d, i) => <span key={i}>{d.date}</span>)}
        </div>
      </div>
    );
  };

  const quickPrompts = ["📉 Improve score?", "💼 Job matches", "📝 Cover letter", "🚀 New skill"];

  return (
    <DashboardLayout>
      <div className="mb-4 -mt-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Career Intelligence Report</h1>
            </div>
            <p className="text-sm md:text-base text-gray-500">AI-powered analysis of your skill portfolio against real-time market data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <span className="text-gray-500 text-xs md:text-sm flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Analysis
            </span>
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs md:text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="gray" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className='text-gray-500'>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${chatOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 relative transition-all duration-300`}>
        <div className={`${chatOpen ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-6 transition-all duration-300`}>

          {/* Existing: Market Demand Trends */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Market Demand Trends</h2>
                <p className="text-xs text-gray-500">Real-time job postings</p>
              </div>
              <select value={selectedSkillView} onChange={(e) => setSelectedSkillView(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-purple-500">
                <option value="All">All Skills</option>
                {skillsList.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="mb-8 px-2">
              {realHistory.length > 0 ? renderTrendGraph() : (
                <div className="flex flex-col items-center justify-center h-56 gap-4 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  <span className="text-sm font-medium">Gathering Data... Check back tomorrow!</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
              <div className="text-center"><div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Score</div><div className="text-2xl font-bold text-gray-900">{metrics.portfolioScore}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Alignment</div><div className={`text-2xl font-bold ${metrics.portfolioScore > 75 ? 'text-green-600' : 'text-purple-600'}`}>{metrics.marketAlignment}</div></div>
              <div className="text-center"><div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Growth</div><div className={`text-2xl font-bold ${metrics.projectedGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>{metrics.projectedGrowth}%</div></div>
            </div>
          </div>

          {/* 🆕 Rich Market Intelligence Panel */}
          {userId && <MarketInsightsPanel userId={userId} />}

          {/* Existing: Rising / Declining Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Rising Skills
              </h3>
              <div className="space-y-4">
                {skillsList.filter(s => s.trend === 'growing').map((skill, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-medium">{skill.name}</span><span className="text-green-600">+{Math.round(skill.growthRate * 100)}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${skill.score}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                Declining Skills
              </h3>
              <div className="space-y-4">
                {skillsList.filter(s => s.trend === 'declining').map((skill, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-medium">{skill.name}</span><span className="text-red-500">{Math.round(skill.growthRate * 100)}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${skill.score}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Existing: Chat Panel */}
        {chatOpen && (
          <div className="lg:col-span-1">
            <div className="sticky top-6 h-[calc(100vh-theme(spacing.32))] min-h-[500px] flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-gradient-to-r from-purple-700 to-purple-600 text-white flex items-center justify-between">
                <div><h2 className="font-bold">Vector Co-Pilot</h2><p className="text-xs font-medium text-purple-100">Analyzing your context...</p></div>
                <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none whitespace-pre-wrap'}`}>{msg.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                  {quickPrompts.map((p, i) => (
                    <button key={i} onClick={() => handleSend(p)} className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors">{p}</button>
                  ))}
                </div>
                <div className="flex gap-2 relative">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask Vector anything..." className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <button onClick={() => handleSend()} disabled={chatLoading} className="bg-purple-600 text-white px-4 rounded-xl hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50">Send</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50 hover:bg-purple-700 active:scale-95">
          💬
        </button>
      )}
      <ExportCVRModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </DashboardLayout>
  );
}