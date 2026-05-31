'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HelpTip from '@/components/shared/HelpTip';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import MarketInsightsPanel from '@/components/student/MarketInsightsPanel';
import RecommendationsPanel, { CourseRecommendation } from '@/components/student/RecommendationsPanel';
import Pagination from '@/components/shared/Pagination';
import { fetchWalletSkillNames } from '@/lib/blockchain';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import chatbotSticker from './sticker_chatbot.png';
import chatbotProfile from './profile_chatbot.png';

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
  const [userId, setUserId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
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
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [atRiskSkills, setAtRiskSkills] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>('Student');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [risingPage, setRisingPage] = useState(1);
  const [decliningPage, setDecliningPage] = useState(1);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillDropOpen, setSkillDropOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "👋 Hi! I'm connecting to the blockchain to analyze your career data..." }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, student_id, wallet_address')
        .eq('id', session.user.id)
        .single();

      if (!profile) return;

      const activeIdentifier = profile.student_id || session.user.id;
      setStudentId(activeIdentifier);
      const raw = profile.full_name?.split(' ')[0] || 'Student';
      const firstName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      setUserName(firstName);

      // 1. Fetch wallet skills
      const foundSkills: string[] = [];
      if (profile.wallet_address) {
        try {
          foundSkills.push(...await fetchWalletSkillNames(profile.wallet_address));
        } catch { console.warn("Wallet read failed."); }
      }

      // 🛡️ CSRF - Extract token from cookies
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      // 2. Fetch AI Analysis
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({ studentId: activeIdentifier, resumeText: "", skillsOverride: foundSkills })
      });

      const json = await res.json();

      if (json.status === 'success') {
        const aiData = json.data;
        let totalScore = 0;
        let overallTrendValue = 0;

        const dbVerifiedSkills = aiData.credentials?.flatMap((c: any) => 
          (Array.isArray(c.skill_tags) && c.skill_tags.length > 0) ? c.skill_tags : [c.skill_name]
        ) || [];
        const allVerifiedNames = Array.from(new Set([...foundSkills, ...dbVerifiedSkills]));

        const processedSkills = aiData.skillHealth.map((s: any) => {
          totalScore += s.healthScore;
          // Use real trendSlope from skill_health_cache (range: -1.0 to +1.0)
          const realSlope = typeof s.trendSlope === 'number' ? s.trendSlope : 0;
          overallTrendValue += realSlope;
          return {
            name: s.skillName,
            category: 'Tech',
            score: s.healthScore,
            trend: s.trend,
            growthRate: realSlope,
            verified: allVerifiedNames.includes(s.skillName)
          };
        });

        const avgScore = Math.round(totalScore / processedSkills.length) || 50;
        const alignment = avgScore > 75 ? 'Very High' : avgScore > 50 ? 'Moderate' : 'Needs Work';
        // Derive projected growth from the average real trend slope across all skills
        const avgSlope = processedSkills.length > 0 ? overallTrendValue / processedSkills.length : 0;
        const projectedGrowthPct = Math.round(avgSlope * 100);

        setMetrics({ portfolioScore: avgScore, marketAlignment: alignment, projectedGrowth: projectedGrowthPct });
        setSkillsList(processedSkills);
        if (json.data.history) setRealHistory(json.data.history);
        if (aiData.recommendations) setRecommendations(aiData.recommendations);
        if (aiData.atRiskSkills) setAtRiskSkills(aiData.atRiskSkills);

        if (allVerifiedNames.length === 0) {
          setMessages([{ role: 'ai', text: `👋 Hi ${firstName}! You don't have any verified skills yet, so I've loaded the **Global Market Trends** for you. Check out what's hot right now!` }]);
        } else {
          const topSkill = [...processedSkills].sort((a: any, b: any) => b.score - a.score)[0];
          const topRec = aiData.recommendations?.[0];
          const recHint = topRec ? `\n\nBased on current market gaps, I'd suggest looking into **${topRec.courseTitle}** — ${topRec.reason}.` : '';
          setMessages([{ role: 'ai', text: `👋 Hi ${firstName}! I've analyzed your **${allVerifiedNames.length}** verified credentials. Your **${topSkill?.name}** is looking strong!${recHint}` }]);
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
    setHasInteracted(true);
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // 🛡️ CSRF - Extract token from cookies
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({
          userId: session.user.id,
          message: textToSend,
          context: {
            skills: skillsList,
            verifiedCount: skillsList.filter(s => s.verified).length,
            recommendations: recommendations.slice(0, 3).map(r => ({
              course: r.courseTitle,
              reason: r.reason,
              type: r.reasonType,
            })),
            atRiskSkills,
          }
        })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderTrendGraph = () => {
    if (realHistory.length === 0) return null;

    const activeSkills = selectedSkillView === 'All'
      ? [...skillsList].sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.name)
      : [selectedSkillView];

    const colors = ['#06B4C9', '#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];
    const hasEnoughData = realHistory.length >= 4;

    const visibleSkills = activeSkills.filter((skill) =>
      realHistory.some((row) => Number(row[skill] || 0) > 0)
    );

    const chartData = realHistory.map((row) => {
      const parsedRow: Record<string, string | number | null> = { date: row.date };
      visibleSkills.forEach((skill) => {
        const value = Number(row[skill] || 0);
        parsedRow[skill] = Number.isFinite(value) && value > 0 ? value : null;
      });
      return parsedRow;
    });

    const latestBySkill: Record<string, number> = {};
    visibleSkills.forEach((skill) => {
      const values = realHistory
        .map((row) => Number(row[skill] || 0))
        .filter((value) => Number.isFinite(value) && value > 0);
      latestBySkill[skill] = values.length ? values[values.length - 1] : 0;
    });

    return (
      <div className="space-y-4">
        {!hasEnoughData && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Only {realHistory.length} resume{realHistory.length !== 1 ? 's' : ''} version is available so far.
            More insights and trends will appear after you’ve created a few more over the next several days. Check back soon!
          </div>
        )}

        <div className="relative w-full min-w-0 -mx-1 sm:mx-0" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 0, bottom: 2 }}>
              <defs>
                {visibleSkills.map((skill, index) => (
                  <linearGradient key={skill} id={`trend-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[index % colors.length]} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={colors[index % colors.length]} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                minTickGap={26}
                tickMargin={8}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 8px 20px rgba(2, 8, 23, 0.08)',
                  backgroundColor: '#ffffff',
                }}
                labelStyle={{ color: '#334155', fontWeight: 600 }}
                formatter={(value, name) => [`${Number(value ?? 0).toLocaleString()} jobs`, String(name)]}
              />

              {visibleSkills.map((skill, index) => {
                const color = colors[index % colors.length];
                return (
                  <Area
                    key={skill}
                    type="monotone"
                    dataKey={skill}
                    connectNulls
                    stroke={color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#trend-grad-${index})`}
                    dot={{ r: 3, strokeWidth: 2, fill: '#ffffff', stroke: color }}
                    activeDot={{ r: 5, strokeWidth: 2, fill: '#ffffff', stroke: color }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {visibleSkills.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
            {visibleSkills.map((skill, index) => (
              <div key={skill} className="flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full flex-shrink-0"
                  style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: colors[index % colors.length],
                  }}
                />
                <span className="text-xs text-gray-500">
                  {skill}
                  <span className="text-gray-400 ml-1">
                    ({latestBySkill[skill]?.toLocaleString()} jobs)
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const quickPrompts = [
    {
      label: "Improve Score",
      prompt: "How can I improve my career readiness score?",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      label: "Job Matches",
      prompt: "Show me the best job matches for my skills",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
    },
    {
      label: "Cover Letter",
      prompt: "Help me write a cover letter based on my skills",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      label: "New Skill",
      prompt: "What new skills should I learn based on market trends?",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Career Intelligence Report <HelpTip text="An AI-generated overview of your skills, how they match the job market, and what to improve." /></h1>
            </div>
            <p className="text-sm md:text-base text-gray-500">AI-powered analysis of your skill portfolio against real-time market data.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* Market Demand Trends */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-1">Market Demand Trends <HelpTip text="A graph showing how many employers are hiring for each of your skills over time." size={14} /></h2>
              <p className="text-xs text-gray-500">Real-time job postings</p>
            </div>
            {/* Searchable Skill Selector */}
            {(() => {
              const filteredSkills = skillsList.filter(s =>
                s.name.toLowerCase().includes(skillSearch.toLowerCase())
              );
              return (
                <div className="relative">
                  <div
                    className="flex items-center gap-1 border border-gray-300 dark:border-[#283042] rounded-lg px-2 py-1 bg-white dark:bg-[#151C2A] cursor-pointer min-w-[140px]"
                    onClick={() => setSkillDropOpen(!skillDropOpen)}
                  >
                    <span className="text-xs text-gray-900 dark:text-[#E2E8F0] truncate flex-1">
                      {selectedSkillView === 'All' ? 'Top 5 Skills' : selectedSkillView}
                    </span>
                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {skillDropOpen && (
                    <div className="absolute right-0 z-20 mt-1 w-56 bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#283042] rounded-lg shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-gray-100 dark:border-[#1E2536]">
                        <input
                          type="text"
                          value={skillSearch}
                          onChange={e => setSkillSearch(e.target.value)}
                          placeholder="Search skills..."
                          className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-[#283042] rounded bg-gray-50 dark:bg-[#0E1220] text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#06B4C9]"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          onClick={() => { setSelectedSkillView('All'); setSkillDropOpen(false); setSkillSearch(''); }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 ${selectedSkillView === 'All' ? 'text-[#06B4C9] font-semibold' : 'text-gray-700 dark:text-[#E2E8F0]'}`}
                        >
                          Top 5 Skills
                        </button>
                        {filteredSkills.map(s => (
                          <button
                            key={s.name}
                            onClick={() => { setSelectedSkillView(s.name); setSkillDropOpen(false); setSkillSearch(''); }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 ${selectedSkillView === s.name ? 'text-[#06B4C9] font-semibold' : 'text-gray-700 dark:text-[#E2E8F0]'}`}
                          >
                            {s.name}
                          </button>
                        ))}
                        {filteredSkills.length === 0 && (
                          <p className="px-3 py-3 text-xs text-gray-400 text-center">No matching skills</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="mb-5 px-0">
            {realHistory.length > 0 ? renderTrendGraph() : (
              <div className="flex flex-col items-center justify-center h-56 gap-3 rounded-lg">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 16l4-5 3 3 4-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No trend data available yet</p>
                <p className="text-xs text-gray-400">Data populates after the first daily cron run</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            {/* Portfolio Score */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke={metrics.portfolioScore > 75 ? '#22c55e' : metrics.portfolioScore > 50 ? '#06B4C9' : '#f59e0b'}
                    strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(metrics.portfolioScore / 100) * 150.8} 150.8`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-gray-900">
                  {metrics.portfolioScore}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">Score <HelpTip text="A 0–100 rating of your overall skill portfolio strength based on verified credentials and market demand." size={11} /></span>
            </div>

            {/* Market Alignment */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${metrics.portfolioScore > 75 ? 'bg-green-500/10' : metrics.portfolioScore > 50 ? 'bg-cyan-500/10' : 'bg-amber-500/10'
                }`}>
                <svg className={`w-7 h-7 ${metrics.portfolioScore > 75 ? 'text-green-500' : metrics.portfolioScore > 50 ? 'text-[#06B4C9]' : 'text-amber-500'
                  }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-bold ${metrics.portfolioScore > 75 ? 'text-green-600' : metrics.portfolioScore > 50 ? 'text-[#06B4C9]' : 'text-amber-600'
                  }`}>{metrics.marketAlignment}</div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">Alignment <HelpTip text="How closely your current skills match what employers are hiring for right now." size={11} /></span>
              </div>
            </div>

            {/* Projected Growth */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${metrics.projectedGrowth >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                {metrics.projectedGrowth >= 0 ? (
                  <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="text-center">
                <div className={`text-sm font-bold ${metrics.projectedGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {metrics.projectedGrowth >= 0 ? '+' : ''}{metrics.projectedGrowth}%
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">Growth <HelpTip text="The predicted change in demand for your skills over the coming months. Positive means demand is rising." size={11} /></span>
              </div>
            </div>
          </div>
        </div>

        {/* Rich Market Intelligence */}
        {userId && <MarketInsightsPanel userId={userId} />}

        {/* Recommended Actions */}
        <RecommendationsPanel recommendations={recommendations} loading={loading} />

        {/* Rising / Declining Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Rising Skills
              <HelpTip text="Skills where employer demand is growing — these are becoming more valuable in the job market." size={13} />
              {skillsList.filter(s => s.trend === 'growing').length > 0 && (
                <span className="text-xs text-gray-400 font-normal ml-auto">{skillsList.filter(s => s.trend === 'growing').length} skills</span>
              )}
            </h3>
            {(() => {
              const rising = skillsList.filter(s => s.trend === 'growing');
              const SKILLS_PER_PAGE = 8;
              const totalRisingPages = Math.ceil(rising.length / SKILLS_PER_PAGE);
              const risingSlice = rising.slice((risingPage - 1) * SKILLS_PER_PAGE, risingPage * SKILLS_PER_PAGE);
              return rising.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {risingSlice.map((skill, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{skill.name}</span>
                          <span className="text-[#06B4C9]">+{Math.round(skill.growthRate * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-[#06B4C9] h-1.5 rounded-full" style={{ width: `${skill.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={risingPage} totalItems={rising.length} itemsPerPage={SKILLS_PER_PAGE} onPageChange={setRisingPage} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">No rising skills detected</p>
                  <p className="text-xs text-gray-400">Growth trends appear after analysis</p>
                </div>
              );
            })()}
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
              Declining Skills
              <HelpTip text="Skills where job market demand is dropping. Consider upgrading or complementing these with newer skills." size={13} />
              {skillsList.filter(s => s.trend === 'declining').length > 0 && (
                <span className="text-xs text-gray-400 font-normal ml-auto">{skillsList.filter(s => s.trend === 'declining').length} skills</span>
              )}
            </h3>
            {(() => {
              const declining = skillsList.filter(s => s.trend === 'declining');
              const SKILLS_PER_PAGE = 8;
              const totalDecliningPages = Math.ceil(declining.length / SKILLS_PER_PAGE);
              const decliningSlice = declining.slice((decliningPage - 1) * SKILLS_PER_PAGE, decliningPage * SKILLS_PER_PAGE);
              return declining.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {decliningSlice.map((skill, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{skill.name}</span>
                          <span className="text-amber-500">{Math.round(skill.growthRate * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${skill.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={decliningPage} totalItems={declining.length} itemsPerPage={SKILLS_PER_PAGE} onPageChange={setDecliningPage} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">No declining skills</p>
                  <p className="text-xs text-gray-400">All skills are stable or growing</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ---- Chat Overlay ---- */}
      {chatOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40 lg:bg-transparent lg:pointer-events-none" onClick={() => setChatOpen(false)} />

          {/* Panel */}
          <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-3rem))] flex flex-col bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#011018] to-[#011018]/90 text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#06B4C9]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4.5 h-4.5 text-[#06B4C9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm leading-tight flex items-center gap-1">Vector Co-Pilot <HelpTip text="An AI assistant that can answer questions about your skills, career options, and market trends." size={12} /></h2>
                <p className="text-[11px] font-medium text-[#06B4C9]">{chatLoading ? 'Thinking...' : 'Online'}</p>
              </div>
              <div className="flex items-center gap-1">
                {/* Clear chat */}
                <button
                  onClick={() => { setMessages([{ role: 'ai', text: "👋 Chat cleared! How can I help you?" }]); setHasInteracted(false); }}
                  title="Clear chat"
                  className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {/* Minimize */}
                <button
                  onClick={() => setChatOpen(false)}
                  title="Minimize"
                  className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-[#0B0F19]/50">
              {/* Welcome Screen — shown before user interacts */}
              {!hasInteracted && messages.length <= 1 && (
                <div className="flex flex-col items-center justify-center pt-4 pb-2">
                  <div className="relative w-36 h-36 mb-2">
                    <Image
                      src={chatbotSticker}
                      alt="Vector Co-Pilot mascot"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Hi, {userName}!</h3>
                  <p className="text-sm text-gray-500 text-center mt-1 max-w-[260px]">
                    I&apos;m your career co-pilot. Ask me anything about skills, jobs, or your portfolio.
                  </p>
                  <div className="w-12 border-t border-gray-200 mt-4 mb-1" />
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'} animate-fade-in`}>
                  {msg.role === 'ai' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden relative">
                      <Image src={chatbotProfile} alt="AI" fill className="object-cover" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                    ? 'bg-[#06B4C9] text-white rounded-br-none'
                    : 'bg-white dark:bg-[#1A2030] border border-gray-200 dark:border-[#1E2536] text-gray-800 dark:text-[#E2E8F0] rounded-bl-none'
                    }`}>
                    {msg.role === 'user' ? msg.text : (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start items-end gap-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden relative">
                    <Image src={chatbotProfile} alt="AI" fill className="object-cover" />
                  </div>
                  <div className="bg-white dark:bg-[#1A2030] border border-gray-200 dark:border-[#1E2536] rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts + Input */}
            <div className="p-3 bg-white dark:bg-[#131825] border-t border-gray-200 dark:border-[#1E2536]">
              <div className="grid grid-cols-2 gap-2 pb-2 mb-1">
                {quickPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.prompt)}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1A2030] border border-gray-200 dark:border-[#1E2536] rounded-full text-xs font-semibold text-gray-600 dark:text-[#94A3B8] hover:border-[#06B4C9]/40 hover:text-[#06B4C9] hover:bg-[#06B4C9]/5 transition-all duration-200 group"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#06B4C9]/10 flex items-center justify-center text-[#06B4C9] group-hover:bg-[#06B4C9]/20 transition-colors">
                      {p.icon}
                    </span>
                    <span className="truncate uppercase tracking-wide" style={{ fontSize: '10px' }}>{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Vector anything..."
                  className="flex-1 border border-gray-300 dark:border-[#1E2536] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#0B0F19] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#06B4C9]"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={chatLoading || !input.trim()}
                  className="bg-[#06B4C9] text-white px-3 rounded-xl hover:bg-[#06B4C9]/80 transition-colors disabled:opacity-40 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* FAB */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#06B4C9] text-white rounded-full flex items-center justify-center transition-all z-50 hover:bg-[#06B4C9]/90 hover:scale-105 active:scale-95 border border-[#06B4C9]/30"
          aria-label="Open chat"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <ExportCVRModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </DashboardLayout>
  );
}