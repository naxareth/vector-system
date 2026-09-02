'use client';

import Link from 'next/link';
import Image from 'next/image';
import EmployerRegisterForm from '@/components/auth/EmployerRegisterForm';

export default function EmployerRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* ── Left column: form ── */}
        <div className="px-10 py-12 md:px-14 lg:px-16 flex flex-col justify-center">
          {/* Logo + branding */}
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <Image src="/logo/VectorLogo.png" alt="Vector Logo" width={40} height={40} className="rounded-full" />
            <span className="text-xl font-bold text-gray-900">Vector for Employers</span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Get Started</h1>
          <p className="text-sm text-gray-500 mb-8">Create your employer account on VECTOR</p>

          {/* Registration form */}
          <EmployerRegisterForm />

          {/* Footer links */}
          <p className="text-sm text-gray-600 text-center mt-10">
            Already have an account?{' '}
            <Link href="/employer-login" className="font-semibold text-gray-900 hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        {/* ── Right column: accent panel ── */}
        <div className="hidden md:flex flex-col justify-center overflow-hidden relative p-10 lg:p-14">
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/auth-bg.jpg" 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#011018]/40 to-[#011018]/75" />
          </div>
          <div className="relative z-10 text-white space-y-8 drop-shadow-lg">
            <div className="bg-black/20 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
              <h2 className="text-3xl font-bold mb-3 drop-shadow-md">Find Verified Talent</h2>
              <p className="text-white/90 text-sm leading-relaxed font-medium">
                Hire candidates with AI-verified credentials directly matched to your job requirements.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 bg-black/30 p-4 rounded-xl backdrop-blur-md border border-white/5 transition-all hover:bg-black/40">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">AI-Verified Credentials</p>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">Every credential is analyzed by AI and confirmed by institutional registrars.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-black/30 p-4 rounded-xl backdrop-blur-md border border-white/5 transition-all hover:bg-black/40">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">Skill-Matched Candidates</p>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">Post jobs and automatically match with students whose skills fit your requirements.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-black/30 p-4 rounded-xl backdrop-blur-md border border-white/5 transition-all hover:bg-black/40">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">Hiring Pipeline Tracker</p>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">Manage applicants from review to interview to offer — all in one dashboard.</p>
                </div>
              </div>
            </div>

            {/* Trust badge */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                <p className="text-white/70 text-[11px] font-medium tracking-wide">Trusted by institutions using VECTOR</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
