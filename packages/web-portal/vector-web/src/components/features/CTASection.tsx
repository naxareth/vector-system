'use client';
import { useInView } from '@/hooks/useInView';

export default function CTASection() {
  const { ref, isInView } = useInView();

  return (
    <section id="cta" className="py-28 px-6 bg-gray-50/70 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#06B4C9]/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-400/[0.02] rounded-full blur-[80px] pointer-events-none" />

      {/* Floating decorative elements */}
      <div className="absolute top-12 left-[12%] animate-float-slow opacity-50">
        <div className="w-12 h-12 rounded-xl border border-[#F54900]/20 bg-[#FFEDD4]/60 flex items-center justify-center rotate-12 shadow-sm">
          <svg className="w-5 h-5 text-[#F54900]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </div>
      </div>
      <div className="absolute bottom-16 right-[10%] animate-float-medium opacity-45">
        <div className="w-11 h-11 rounded-xl border border-purple-300/25 bg-purple-50 flex items-center justify-center -rotate-6 shadow-sm">
          <svg className="w-5 h-5 text-purple-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        </div>
      </div>
      <div className="absolute top-20 right-[15%] animate-float-medium opacity-40">
        <div className="w-10 h-10 rounded-xl border border-green-300/25 bg-green-50 flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-green-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
        </div>
      </div>

      {/* Decorative ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-dashed border-gray-200/40 pointer-events-none animate-spin-very-slow" />

      <div
        ref={ref}
        className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#06B4C9]/20 bg-[#06B4C9]/5 mb-6">
          <span className="w-1.5 h-1.5 bg-[#06B4C9] rounded-full animate-pulse" />
          <span className="text-xs font-medium text-[#06B4C9]">Ready to get started?</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Secure the Future<br />of Your Credentials
        </h2>
        <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Join institutions and students building verifiable, AI‑enhanced academic records.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/register"
            className="group px-8 py-4 bg-[#06B4C9] hover:bg-[#06B4C9]/85 !text-white rounded-xl font-semibold transition-all shadow-lg shadow-[#06B4C9]/20 hover:shadow-xl hover:shadow-[#06B4C9]/30 hover:scale-[1.02] flex items-center gap-2.5"
          >
            Create Free Account
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#features"
            className="px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Learn More
          </a>
        </div>

        {/* Mini trust line */}
        <div className="mt-10 flex items-center justify-center gap-6 text-gray-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            AES-256 Encrypted
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            RBAC Protected
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <svg className="w-3.5 h-3.5 text-[#F54900]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
            Secure Network
          </div>
        </div>
      </div>
    </section>
  );
}