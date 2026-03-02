'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import MarketInsightsPanel from '@/components/student/MarketInsightsPanel';
import RecommendationsPanel, { CourseRecommendation } from '@/components/student/RecommendationsPanel';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
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
          const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
          const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
          const processedIds = new Set<number>();
          for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
            if (typeof skillId !== 'number' || processedIds.has(skillId)) continue;
            try {
              const balance = await contract.balanceOf(profile.wallet_address, skillId);
              if (balance > BigInt(0)) { processedIds.add(skillId); foundSkills.push(skillName); }
            } catch (e) { console.error(e); }
          }
        } catch { console.warn("Wallet read failed."); }
      }

      // 2. Fetch AI Analysis
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: activeIdentifier, resumeText: "", skillsOverride: foundSkills })
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

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // ---------------------------------------------------------------------------
  // renderTrendGraph
  //
  // Fixed pixel viewBox (600×160) with preserveAspectRatio="xMidYMid meet" —
  // avoids the distortion that came from preserveAspectRatio="none" which was
  // stretching circle radii and stroke widths non-uniformly.
  //
  // Smooth cubic bezier curves replace polyline for clean, professional lines.
  //
  // Per-skill normalization: each skill maps its own min/max to the Y range
  // so all lines fill the vertical space regardless of absolute job count.
  // A legend with actual job counts preserves the real-world context.
  // ---------------------------------------------------------------------------
  const renderTrendGraph = () => {
    if (realHistory.length === 0) return null;

    // Cap "All Skills" to top 5 by score to avoid spaghetti chart
    const activeSkills = selectedSkillView === 'All'
      ? [...skillsList].sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.name)
      : [selectedSkillView];

    const colors = ['#06B4C9', '#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

    // Fixed pixel coordinate space — ~35% wider/taller than original
    const VW = 820;
    const VH = 220;
    const PAD_LEFT = 8;
    const PAD_RIGHT = 8;
    const PAD_TOP = 10;
    const PAD_BOTTOM = 20; // room for date labels
    const chartW = VW - PAD_LEFT - PAD_RIGHT;
    const chartH = VH - PAD_TOP - PAD_BOTTOM;

    const hasEnoughData = realHistory.length >= 4;

    // Per-skill ranges
    const skillRanges: Record<string, { min: number; max: number; latest: number }> = {};
    activeSkills.forEach(skill => {
      const values = realHistory.map(d => Number(d[skill] || 0)).filter(v => v > 0);
      if (values.length === 0) return;
      skillRanges[skill] = {
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1],
      };
    });

    const visibleSkills = activeSkills.filter(s => skillRanges[s]);

    // Smooth cubic bezier path builder
    const smoothPath = (pts: { x: number; y: number }[]): string => {
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const tension = 0.4;
        const cp1x = p0.x + (p1.x - p0.x) * tension;
        const cp1y = p0.y;
        const cp2x = p1.x - (p1.x - p0.x) * tension;
        const cp2y = p1.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }
      return d;
    };

    return (
      <div className="space-y-3">
        {/* Low data notice */}
        {!hasEnoughData && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Only {realHistory.length} snapshot{realHistory.length !== 1 ? 's' : ''} available.
            Trend lines improve after 4+ daily cron runs. Check back tomorrow!
          </div>
        )}

        {/* Chart */}
        <div className="relative w-full" style={{ height: '240px' }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            {/* Gradient defs */}
            <defs>
              {visibleSkills.map((skill, index) => (
                <linearGradient key={skill} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[index % colors.length]} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={colors[index % colors.length]} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {/* Subtle horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = PAD_TOP + frac * chartH;
              return (
                <line
                  key={frac}
                  x1={PAD_LEFT} y1={y}
                  x2={PAD_LEFT + chartW} y2={y}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
              );
            })}

            {visibleSkills.map((skill, index) => {
              const { min, max } = skillRanges[skill];
              const range = max - min || 1;
              const color = colors[index % colors.length];

              const dataPoints = realHistory
                .map((point) => ({ val: Number(point[skill] || 0), date: point.date }))
                .filter(p => p.val > 0);

              if (dataPoints.length < 1) return null;

              const pts = dataPoints.map((p, j) => ({
                x: PAD_LEFT + (dataPoints.length === 1
                  ? chartW / 2
                  : (j / (dataPoints.length - 1)) * chartW),
                y: PAD_TOP + chartH - ((p.val - min) / range) * chartH,
                val: p.val,
                date: p.date,
              }));

              const pathD = smoothPath(pts);
              const areaD = `${pathD} L ${pts[pts.length - 1].x} ${PAD_TOP + chartH} L ${pts[0].x} ${PAD_TOP + chartH} Z`;

              return (
                <g key={skill}>
                  {/* Area fill */}
                  <path d={areaD} fill={`url(#grad-${index})`} />

                  {/* Smooth line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                    className="drop-shadow-sm"
                  />

                  {/* Data point dots — crisp fixed-size circles */}
                  {pts.map((p, j) => (
                    <g key={j}>
                      <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
                      <title>{`${skill}: ${p.val.toLocaleString()} jobs (${p.date})`}</title>
                    </g>
                  ))}
                </g>
              );
            })}

            {/* X-axis date labels inside the SVG — consistent sizing */}
            {(() => {
              const step = Math.max(1, Math.ceil(realHistory.length / 5));
              return realHistory
                .map((d, i) => ({ d, i }))
                .filter(({ i }) => i === 0 || i === realHistory.length - 1 || i % step === 0)
                .map(({ d, i }) => {
                  const x = PAD_LEFT + (realHistory.length === 1
                    ? chartW / 2
                    : (i / (realHistory.length - 1)) * chartW);
                  return (
                    <text
                      key={i}
                      x={x}
                      y={VH - 4}
                      textAnchor={i === 0 ? 'start' : i === realHistory.length - 1 ? 'end' : 'middle'}
                      fontSize="9"
                      fill="#9ca3af"
                    >
                      {d.date}
                    </text>
                  );
                });
            })()}
          </svg>
        </div>

        {/* Legend with actual job counts */}
        {visibleSkills.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
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
                    ({skillRanges[skill]?.latest.toLocaleString()} jobs)
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Career Intelligence Report</h1>
            </div>
            <p className="text-sm md:text-base text-gray-500">AI-powered analysis of your skill portfolio against real-time market data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs md:text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="gray" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className='text-gray-500'>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* Market Demand Trends */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Market Demand Trends</h2>
              <p className="text-xs text-gray-500">Real-time job postings</p>
            </div>
            <select
              value={selectedSkillView}
              onChange={(e) => setSelectedSkillView(e.target.value)}
              className="text-xs border border-gray-300 dark:border-[#283042] rounded-lg px-2 py-1 bg-white dark:bg-[#151C2A] text-gray-900 dark:text-[#E2E8F0] outline-none focus:ring-1 focus:ring-[#06B4C9]"
            >
              <option value="All">Top 5 Skills</option>
              {skillsList.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="mb-8 px-2">
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
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</span>
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
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alignment</span>
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
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Growth</span>
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
            </h3>
            {skillsList.filter(s => s.trend === 'growing').length > 0 ? (
              <div className="space-y-4">
                {skillsList.filter(s => s.trend === 'growing').map((skill, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-green-600">+{Math.round(skill.growthRate * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${skill.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
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
            )}
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
              Declining Skills
            </h3>
            {skillsList.filter(s => s.trend === 'declining').length > 0 ? (
              <div className="space-y-4">
                {skillsList.filter(s => s.trend === 'declining').map((skill, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-red-500">{Math.round(skill.growthRate * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${skill.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
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
            )}
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
                <h2 className="font-bold text-sm leading-tight">Vector Co-Pilot</h2>
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