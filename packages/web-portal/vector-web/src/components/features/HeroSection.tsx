'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import robotAnimationData from './AiRobotVectorArt.json';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [count3, setCount3] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
    // Animate counters
    const duration = 1800;
    const steps = 40;
    const targets = [12, 87, 8];
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount1(Math.round(targets[0] * ease));
      setCount2(Math.round(targets[1] * ease));
      setCount3(Math.round(targets[2] * ease));
      if (step >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-32 pb-28 px-6 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-white" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#06B4C9]/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#06B4C9]/[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-40 left-10 w-[300px] h-[300px] bg-purple-400/[0.02] rounded-full blur-[80px] pointer-events-none" />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Floating decorative nodes */}
      <div className="absolute top-20 left-[8%] animate-float-slow opacity-0 transition-opacity duration-1000" style={{ animationDelay: '0s', opacity: loaded ? 0.7 : 0 }}>
        <div className="w-14 h-14 rounded-xl border border-[#F54900]/20 bg-[#FFEDD4]/60 flex items-center justify-center rotate-12 shadow-sm">
          <svg className="w-6 h-6 text-[#F54900]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </div>
      </div>
      <div className="absolute top-28 right-[10%] animate-float-medium opacity-0 transition-opacity duration-1000" style={{ animationDelay: '0.5s', opacity: loaded ? 0.65 : 0 }}>
        <div className="w-12 h-12 rounded-xl border border-purple-300/25 bg-purple-50 flex items-center justify-center -rotate-6 shadow-sm">
          <svg className="w-5 h-5 text-purple-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        </div>
      </div>
      <div className="absolute bottom-40 left-[5%] animate-float-medium opacity-0 transition-opacity duration-1000" style={{ animationDelay: '1s', opacity: loaded ? 0.6 : 0 }}>
        <div className="w-12 h-12 rounded-xl border border-green-300/25 bg-green-50 flex items-center justify-center rotate-6 shadow-sm">
          <svg className="w-5 h-5 text-green-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      </div>
      <div className="absolute bottom-44 right-[6%] animate-float-slow opacity-0 transition-opacity duration-1000" style={{ animationDelay: '1.5s', opacity: loaded ? 0.65 : 0 }}>
        <div className="w-13 h-13 rounded-xl border border-[#F54900]/15 bg-[#FFEDD4]/50 flex items-center justify-center -rotate-12 shadow-sm" style={{ width: '3.25rem', height: '3.25rem' }}>
          <svg className="w-5 h-5 text-[#F54900]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Two-column hero: Text left, Robot right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4 items-center mb-16 lg:mb-20">
          {/* Left: Text content */}
          <div className="order-2 lg:order-1">
            {/* Badge */}
            <div className={`flex justify-center lg:justify-start mb-6 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#06B4C9]/20 bg-[#06B4C9]/5">
                <span className="w-1.5 h-1.5 bg-[#06B4C9] rounded-full animate-pulse" />
              </div>
            </div>

            {/* Main Heading */}
            <div className={`text-center lg:text-left mb-5 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 leading-[1.1] tracking-tight">
                Credentials That Are
              </h1>
              <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                <span className="bg-gradient-to-r from-[#06B4C9] via-[#0891a2] to-[#7c3aed] bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">Verified & Intelligent.</span>
              </h1>
            </div>

            {/* Subheading */}
            <p className={`text-base sm:text-lg text-gray-500 text-center lg:text-left max-w-xl mb-8 leading-relaxed transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              The first skills verification system that combines <span className="text-gray-700 font-medium">secure verification</span> with <span className="text-gray-700 font-medium">predictive AI career analytics</span>.
            </p>

            {/* CTA */}
            <div className={`flex justify-center lg:justify-start mb-10 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <a 
                href="/register"
                className="group px-8 py-4 bg-[#06B4C9] hover:bg-[#06B4C9]/85 !text-white rounded-xl font-semibold transition-all flex items-center gap-2.5 shadow-lg shadow-[#06B4C9]/20 hover:shadow-xl hover:shadow-[#06B4C9]/30 hover:scale-[1.02]"
              >
                Start Verifying
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {/* Stats Row */}
            <div className={`grid grid-cols-3 max-w-sm transition-all duration-700 delay-400 mx-auto lg:mx-0 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{count1}+</div>
                <div className="text-xs text-gray-400 mt-1">Skills Verified</div>
              </div>
              <div className="text-center border-x border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-[#06B4C9]">{count2}%</div>
                <div className="text-xs text-gray-400 mt-1">Market Match</div>
              </div>
              <div className="text-center lg:text-right">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{count3}</div>
                <div className="text-xs text-gray-400 mt-1">Verified Records</div>
              </div>
            </div>
          </div>

          {/* Right: AI Robot Lottie */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className={`relative transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              {/* Soft glow behind robot */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#06B4C9]/10 via-purple-300/8 to-transparent rounded-full blur-[60px] scale-110 pointer-events-none" />
              
              {/* Subtle orbiting ring */}
              <div className="absolute inset-[-15%] border border-[#06B4C9]/[0.07] rounded-full animate-spin-very-slow pointer-events-none" />
              <div className="absolute inset-[-8%] border border-purple-300/[0.06] rounded-full animate-spin-very-slow-reverse pointer-events-none" />

              {/* Robot container with gentle float */}
              <div className="relative w-[280px] h-[370px] sm:w-[320px] sm:h-[420px] lg:w-[380px] lg:h-[500px] animate-float-slow">
                <Lottie
                  animationData={robotAnimationData}
                  loop
                  autoplay
                  className="w-full h-full drop-shadow-lg"
                  style={{ filter: 'drop-shadow(0 8px 24px rgba(6, 180, 201, 0.12))' }}
                />
              </div>

              {/* Small floating accent dots */}
              <div className="absolute top-[15%] -left-4 w-3 h-3 rounded-full bg-[#06B4C9]/30 animate-float-medium" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-[25%] -right-3 w-2.5 h-2.5 rounded-full bg-purple-400/25 animate-float-slow" style={{ animationDelay: '1s' }} />
              <div className="absolute top-[40%] -right-5 w-2 h-2 rounded-full bg-[#F54900]/20 animate-float-medium" style={{ animationDelay: '1.5s' }} />
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="relative group">
            {/* Animated border glow */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#06B4C9]/20 via-purple-400/10 to-[#06B4C9]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm pointer-events-none" />
            <div className="absolute -inset-4 bg-gradient-to-b from-[#06B4C9]/5 to-transparent rounded-3xl blur-2xl pointer-events-none" />
            
            <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/50">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-gray-100 rounded-md text-xs text-gray-400 font-mono flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clipRule="evenodd" fillRule="evenodd" /></svg>
                    vector.app/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-[#06B4C9]/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-400">Verified Skills</div>
                      <div className="w-6 h-6 rounded-lg bg-[#06B4C9]/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">12</div>
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      +3 this month
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-[#06B4C9]/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-400">AI Market Score</div>
                      <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#06B4C9]">87%</div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-[87%] bg-gradient-to-r from-[#06B4C9] to-[#157942] rounded-full animate-shimmer" />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-[#06B4C9]/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-400">Verified Records</div>
                      <div className="w-6 h-6 rounded-lg bg-[#FFEDD4] flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#F54900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">8</div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Permanently Verified
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-28">
                    <div className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      AI Skill Performance
                    </div>
                    <div className="flex items-end gap-1.5 h-12">
                      {[40, 65, 50, 80, 70, 90, 75, 85].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-[#06B4C9]/10" style={{ height: `${h}%` }}>
                          <div className="w-full rounded-sm bg-gradient-to-t from-[#06B4C9] to-[#06B4C9]/70 animate-grow-up" style={{ height: `${h}%`, animationDelay: `${i * 80 + 800}ms` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-28">
                    <div className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Recent Activity
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                        <span className="text-xs text-gray-500">React.js Verified</span>
                        <span className="text-[10px] text-gray-300 ml-auto">2m ago</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center"><svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                        <span className="text-xs text-gray-500">AI decay alert: SQL</span>
                        <span className="text-[10px] text-gray-300 ml-auto">1h ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className={`flex flex-wrap items-center justify-center gap-8 mt-14 transition-all duration-700 delay-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-xs text-gray-400 uppercase tracking-widest">Powered by</span>
          <div className="flex items-center gap-2 text-gray-400 hover:text-[#F54900] transition-colors cursor-default">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
            <span className="text-xs font-medium">Polygon</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 hover:text-purple-500 transition-colors cursor-default">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            <span className="text-xs font-medium">Gemini AI</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors cursor-default">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="text-xs font-medium">Tamper-Proof</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors cursor-default">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            <span className="text-xs font-medium">Open Source</span>
          </div>
        </div>
      </div>
    </section>
  );
}