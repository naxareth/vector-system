'use client';
import { useInView } from '@/hooks/useInView';
import { useEffect, useState } from 'react';

export default function WorkflowSection() {
  const { ref: headerRef, isInView: headerVisible } = useInView();
  const { ref: stepsRef, isInView: stepsVisible } = useInView();
  const { ref: mockupRef, isInView: mockupVisible } = useInView();
  const [relevance, setRelevance] = useState(0);

  useEffect(() => {
    if (!mockupVisible) return;
    let step = 0;
    const target = 92;
    const interval = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / 40, 3);
      setRelevance(Math.round(target * ease));
      if (step >= 40) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [mockupVisible]);

  const steps = [
    {
      number: '01',
      title: 'Issue Credential',
      description: 'Institutions issue securely-signed credentials upon course completion.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
      ),
      accent: '#06B4C9',
    },
    {
      number: '02',
      title: 'Secure Your Credentials',
      description: 'Credentials are permanently verified, creating an unalterable record.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      ),
      accent: '#F54900',
    },
    {
      number: '03',
      title: 'Analyze & Share',
      description: 'AI coaches skill relevance in real-time while verified data confirms CVs instantly.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
      ),
      accent: '#22c55e',
    },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 bg-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full border border-dashed border-gray-100 pointer-events-none animate-spin-very-slow" />
      <div className="absolute bottom-1/4 -left-16 w-60 h-60 rounded-full border border-dashed border-gray-100 pointer-events-none animate-spin-very-slow-reverse" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <div
              ref={headerRef}
              className={`transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#06B4C9]/20 bg-[#06B4C9]/5 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06B4C9] animate-pulse" />
                <span className="text-xs font-medium text-[#06B4C9]">How It Works</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                From Classroom to<br />Career in Three Steps
              </h2>
              <p className="text-gray-500 mb-10 leading-relaxed">
                Seamlessly integrate verification into your existing learning management systems.
              </p>
            </div>

            {/* Steps */}
            <div ref={stepsRef} className="relative">
              <div className="space-y-5">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`group flex gap-4 p-4 rounded-xl border border-gray-200 hover:border-[${step.accent}]/30 bg-gray-50/50 hover:bg-white transition-all duration-500 relative ${
                      stepsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                    }`}
                    style={{ transitionDelay: `${index * 200}ms` }}
                  >
                    <div className="flex-shrink-0 relative z-10">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                        style={{ backgroundColor: `${step.accent}15`, color: step.accent }}
                      >
                        {step.icon}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-wider" style={{ color: step.accent }}>STEP {step.number}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1 text-sm">{step.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                    </div>
                    {/* Arrow indicator */}
                    <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Mockup — Credential Card */}
          <div
            ref={mockupRef}
            className={`lg:pl-4 transition-all duration-700 delay-300 ${mockupVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
          >
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-6 bg-[#06B4C9]/[0.03] rounded-3xl blur-2xl pointer-events-none" />
              
              {/* Floating mini-elements around card */}
              <div className="absolute -top-4 -right-4 w-11 h-11 rounded-xl bg-[#FFEDD4]/70 border border-[#F54900]/20 flex items-center justify-center animate-float-slow shadow-sm">
                <svg className="w-5 h-5 text-[#F54900]/70" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
              </div>
              <div className="absolute -bottom-3 -left-3 w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/25 flex items-center justify-center animate-float-medium shadow-sm">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>

              <div className="relative bg-white rounded-2xl p-8 border border-gray-200 shadow-lg shadow-gray-100/80">
                {/* Credential card */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-4 group hover:border-[#06B4C9]/20 transition-colors">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#06B4C9] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">V</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">VECTOR Credential</div>
                        <div className="text-xs text-gray-400">Issued by PHINMA University</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-semibold rounded-full border border-green-200 flex items-center gap-1">
                      <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                      Verified
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Skill</span>
                      <span className="text-gray-900 font-medium">React.js Development</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Token ID</span>
                      <span className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">#1042</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Network</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#F54900] rounded-full animate-pulse" />
                        <span className="text-gray-900 text-xs">Permanently Verified</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Tx Hash</span>
                      <span className="text-gray-400 font-mono text-[10px]">0x7f3a...c291</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      <span>Securely signed &middot; Tamper-proof</span>
                    </div>
                  </div>
                </div>

                {/* Market relevance bar with animated counter */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      AI Market Relevance
                    </span>
                    <span className="text-xs font-bold text-[#06B4C9]">{relevance}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#06B4C9] to-[#157942] rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${relevance}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Gemini AI analysis based on 12,000+ job postings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}