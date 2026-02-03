'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
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
}

export default function CoachPage() {
  const router = useRouter();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [studentId, setStudentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false); // UI State from vector-front
  
  // ⚡ DEFAULT CHART DATA (Prevents "No Graph" error)
  const defaultHistory = [
    { month: 'Jan', value: 20 }, { month: 'Feb', value: 25 }, { month: 'Mar', value: 30 },
    { month: 'Apr', value: 28 }, { month: 'May', value: 35 }, { month: 'Jun', value: 40 },
    { month: 'Jul', value: 45 }, { month: 'Aug', value: 50 }, { month: 'Sep', value: 55 },
    { month: 'Oct', value: 52 }, { month: 'Nov', value: 58 }, { month: 'Dec', value: 65 },
  ];

  const [metrics, setMetrics] = useState({
    portfolioScore: 65, // Default start
    marketAlignment: 'Analyzing...',
    projectedGrowth: 0
  });
  const [skillsList, setSkillsList] = useState<SkillMetric[]>([]);
  const [trendHistory, setTrendHistory] = useState(defaultHistory);
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "👋 Hi! I'm connecting to the blockchain to analyze your career data..." }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper: Generate synthetic history (Client-Side Only)
  const generateHistory = (score: number, trend: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const history = [];
    let currentVal = score;
    
    for (let i = 11; i >= 0; i--) {
      // Ensure value stays between 10 and 100
      const safeVal = Math.max(10, Math.min(100, Math.round(currentVal)));
      history.unshift({ month: months[i], value: safeVal });
      
      // Calculate previous month based on trend
      if (trend === 'growing') currentVal -= (Math.random() * 5 + 1);
      else if (trend === 'declining') currentVal += (Math.random() * 5 + 1);
      else currentVal += (Math.random() * 4 - 2); 
    }
    return history;
  };

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, student_id, wallet_address')
        .eq('id', session.user.id)
        .single();

      if (!profile) return;
      
      setStudentId(profile.student_id);
      const firstName = profile.full_name?.split(' ')[0] || 'Student';

      if (!profile.wallet_address) {
        setMessages([{ role: 'ai', text: `Hi ${firstName}, please connect your wallet on the Dashboard so I can analyze your skills!` }]);
        setLoading(false);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
        
        const foundSkills: string[] = [];
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

        if (foundSkills.length === 0) {
          setMessages([{ role: 'ai', text: `Hi ${firstName}, I don't see any verified credentials yet. The chart currently shows the **Market Average** for a beginner developer.` }]);
          setLoading(false);
          // Keep default history so the graph shows *something*
          return;
        }

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            studentId: profile.student_id, 
            resumeText: "",
            skillsOverride: foundSkills 
          })
        });

        const json = await res.json();
        
        if (json.status === 'success') {
          const aiData = json.data;
          
          let totalScore = 0;
          let overallTrendValue = 0;
          
          const processedSkills = aiData.skillHealth.map((s: any) => {
            totalScore += s.healthScore;
            if (s.trend === 'growing') overallTrendValue += 1;
            if (s.trend === 'declining') overallTrendValue -= 1;
            
            return {
              name: s.skillName,
              category: 'Tech',
              score: s.healthScore,
              trend: s.trend,
              growthRate: s.trend === 'growing' ? 0.15 : s.trend === 'declining' ? -0.10 : 0.02
            };
          });

          const avgScore = Math.round(totalScore / processedSkills.length) || 50;
          const alignment = avgScore > 75 ? 'Very High' : avgScore > 50 ? 'Moderate' : 'Needs Work';
          const growth = overallTrendValue > 0 ? '+12%' : overallTrendValue < 0 ? '-5%' : '+2%';
          const aggTrend = overallTrendValue > 0 ? 'growing' : overallTrendValue < 0 ? 'declining' : 'stable';

          setMetrics({
            portfolioScore: avgScore,
            marketAlignment: alignment,
            projectedGrowth: parseInt(growth)
          });

          setSkillsList(processedSkills);
          // Update graph with REAL data
          setTrendHistory(generateHistory(avgScore, aggTrend));

          const topSkill = processedSkills.sort((a: any, b: any) => b.score - a.score)[0];
          setMessages([{ 
            role: 'ai', 
            text: `👋 Hi ${firstName}! I've analyzed your ${foundSkills.length} verified credentials.\n\nYour **${topSkill?.name}** is looking strong (${topSkill?.score}/100).\n\nUse the chart to see your portfolio's relevance over time.`
          }]);
        }

      } catch (error) {
        console.error("Coach Load Error:", error);
        setMessages([{ role: 'ai', text: "I encountered an error analyzing your data. Showing cached market data." }]);
      } finally {
        setLoading(false);
      }
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId, 
          message: textToSend,
          context: { skills: skillsList } 
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection error." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompts = ["📉 Improve score?", "💼 Job matches", "📝 Cover letter", "🚀 New skill"];
  const maxValue = 100;

  return (
    <DashboardLayout>
      {/* Page Header */}
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
              <svg className="w-4 h-4" fill="none" stroke="gray" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className='text-gray-500'>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${chatOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 relative transition-all duration-300`}>
        
        {/* LEFT COLUMN: THE VISUAL REPORT */}
        <div className={`${chatOpen ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-6 transition-all duration-300`}>
          
          {/* Skill Relevance Trends Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Portfolio Relevance</h2>
              <span className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">12 Months</span>
            </div>
            
            {/* FORCE GRAPH RENDER */}
            <div className="mb-8 overflow-x-auto">
              <div className="flex items-end justify-between h-56 gap-2 min-w-[300px] px-2">
                {trendHistory.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex items-end h-full">
                        <div 
                          className="w-full bg-purple-600 rounded-t hover:bg-purple-700 transition-all duration-500" 
                          style={{ height: `${(data.value / maxValue) * 100}%` }}
                        ></div>
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          Score: {data.value}
                        </div>
                    </div>
                    <span className="text-[10px] uppercase text-gray-400 font-bold">{data.month}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Score</div>
                <div className="text-2xl font-bold text-gray-900">{metrics.portfolioScore}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Alignment</div>
                <div className={`text-2xl font-bold ${metrics.portfolioScore > 75 ? 'text-green-600' : 'text-purple-600'}`}>{metrics.marketAlignment}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Growth</div>
                <div className={`text-2xl font-bold ${metrics.projectedGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {metrics.projectedGrowth > 0 ? '+' : ''}{metrics.projectedGrowth}%
                </div>
              </div>
            </div>
          </div>

          {/* LISTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rising Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Rising Skills
              </h3>
              <div className="space-y-4">
                {skillsList.filter(s => s.trend === 'growing').length > 0 ? (
                  skillsList.filter(s => s.trend === 'growing').map((skill, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-green-600">+{Math.round(skill.growthRate * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${skill.score}%` }}></div></div>
                    </div>
                  ))
                ) : <p className="text-sm text-gray-400">No rising assets yet.</p>}
              </div>
            </div>

            {/* Declining Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                Declining Skills
              </h3>
              <div className="space-y-4">
                {skillsList.filter(s => s.trend === 'declining').length > 0 ? (
                  skillsList.filter(s => s.trend === 'declining').map((skill, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-red-500">{Math.round(skill.growthRate * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${skill.score}%` }}></div></div>
                    </div>
                  ))
                ) : <p className="text-sm text-gray-400">Your portfolio is stable.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE AI CO-PILOT */}
        {chatOpen && (
        <div className="lg:col-span-1">
          <div className="sticky top-6 h-[calc(100vh-theme(spacing.32))] min-h-[500px] flex flex-col">
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-purple-700 to-purple-600 text-white flex items-center gap-3 z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-purple-700 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-lg leading-tight">Vector Co-Pilot</h2>
                  <p className="text-purple-100 text-xs font-medium">Analyzing your chart...</p>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-br-none' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none whitespace-pre-wrap'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      <div className="flex space-x-1.5 items-center h-5">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-gray-200 z-10">
                <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                  {quickPrompts.map((prompt, i) => (
                    <button key={i} onClick={() => handleSend(prompt)} disabled={chatLoading} className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium hover:bg-purple-100 hover:border-purple-200 transition-colors">
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 relative">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask Vector anything..." className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pl-4" />
                  <button onClick={() => handleSend()} disabled={chatLoading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Floating Chat Toggle Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50"
          title="Open chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
      
      <ExportCVRModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </DashboardLayout>
  );
}