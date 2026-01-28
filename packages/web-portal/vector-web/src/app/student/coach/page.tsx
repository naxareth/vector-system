'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export default function CoachPage() {
  const router = useRouter();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [studentId, setStudentId] = useState<string>('03-2023-001'); // Default fallback
  
  // ⚡ CHAT STATE
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "👋 Hi! I'm analyzing your Career Intelligence Report..." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch User (With Fallback)
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Try fetch
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, student_id')
        .eq('id', session.user.id)
        .maybeSingle();

      // Determine Name & ID
      const name = profile?.full_name?.split(' ')[0] || session.user.email?.split('@')[0] || "Student";
      const id = profile?.student_id || "03-2026-2861"; // Fallback to your ID

      setStudentId(id);
      
      // Update greeting
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[0] = { 
          role: 'ai', 
          text: `👋 Hi ${name}! I've analyzed your Career Intelligence Report.\n\nYour **Python** growth is fantastic, but we should watch the market trends. \n\nI can help you pivot to a Modern Stack. What would you like to do?` 
        };
        return newMsgs;
      });
    };

    fetchUser();
  }, [router]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Quick Action Chips
  const quickPrompts = [
    "📉 How do I fix the PHP drop?",
    "💼 What jobs fit my profile?",
    "📝 Draft a cover letter",
    "🚀 Suggest a learning path"
  ];

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    // Add User Message
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: studentId, 
          message: textToSend 
        })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting to the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Chart Data (Static Visuals)
  const trendData = [
    { month: 'Jan', value: 35 }, { month: 'Feb', value: 42 }, { month: 'Mar', value: 48 },
    { month: 'Apr', value: 52 }, { month: 'May', value: 51 }, { month: 'Jun', value: 58 },
    { month: 'Jul', value: 65 }, { month: 'Aug', value: 72 }, { month: 'Sep', value: 78 },
    { month: 'Oct', value: 75 }, { month: 'Nov', value: 82 }, { month: 'Dec', value: 85 },
  ];
  const maxValue = Math.max(...trendData.map(d => d.value));

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        
        {/* LEFT COLUMN: THE VISUAL REPORT (Static Data) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Skill Relevance Trends Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Skill Relevance Trends</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded">1 Year</button>
              </div>
            </div>
            <div className="mb-8 overflow-x-auto">
              <div className="flex items-end justify-between h-56 md:h-64 gap-2 min-w-[300px]">
                {trendData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-purple-600 rounded-t hover:bg-purple-700 transition-all duration-300 group relative" 
                         style={{ height: `${(data.value / maxValue) * 100}%` }}>
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                         {data.value}%
                       </div>
                    </div>
                    <span className="text-xs text-gray-500">{data.month}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Portfolio Score</div>
                <div className="text-2xl md:text-3xl font-bold text-purple-600">88/100</div>
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Market Alignment</div>
                <div className="text-2xl md:text-3xl font-bold text-teal-500">High</div>
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Projected Growth</div>
                <div className="text-2xl md:text-3xl font-bold text-purple-600">+12%</div>
              </div>
            </div>
          </div>

          {/* Skills Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rising Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Rising Skills
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-medium text-gray-900">Python</div><div className="text-xs text-gray-500">Data Science</div></div>
                    <div className="text-green-600 font-semibold">+20%</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-medium text-gray-900">React</div><div className="text-xs text-gray-500">Frontend</div></div>
                    <div className="text-green-600 font-semibold">+15%</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div></div>
                </div>
              </div>
            </div>

            {/* Declining Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                Declining Skills
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-medium text-gray-900">PHP (Legacy)</div><div className="text-xs text-gray-500">Web Dev</div></div>
                    <div className="text-red-600 font-semibold">-15%</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE AI CO-PILOT */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 h-[calc(100vh-theme(spacing.32))] min-h-[500px] flex flex-col">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col h-full overflow-hidden ring-1 ring-black/5">
              
              <div className="p-4 bg-gradient-to-r from-purple-700 to-purple-600 text-white flex items-center gap-3 shadow-md z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-purple-700 rounded-full"></div>
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Vector Co-Pilot</h2>
                  <p className="text-purple-100 text-xs font-medium">Analyzing your chart...</p>
                </div>
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
                {loading && (
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
                    <button key={i} onClick={() => handleSend(prompt)} disabled={loading} className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium hover:bg-purple-100 hover:border-purple-200 transition-colors">
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 relative">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask Vector anything..." className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pl-4" />
                  <button onClick={() => handleSend()} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
      
      <ExportCVRModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </DashboardLayout>
  );
}