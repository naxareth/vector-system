'use client';

import Link from 'next/link';
import Image from 'next/image';
import EmployerRegisterForm from '@/components/auth/EmployerRegisterForm';
import employerImg from './employer.jpg';
import { ShieldCheck, UserCheck, BarChart3 } from 'lucide-react';

export default function EmployerRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* ── Left column: form ── */}
        <div className="px-10 py-12 md:px-14 lg:px-16 flex flex-col justify-center">
          {/* Logo + branding */}
          <Link href="/" className="inline-flex items-center gap-3 mb-10">
            <Image src="/logo/VectorLogo.png" alt="Vector Logo" width={40} height={40} className="rounded-full" />
            <span className="text-xl font-bold text-gray-900">Vector for Employers</span>
          </Link>

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

        {/* ── Right column: accent panel with employer image & feature cards ── */}
        <div className="hidden md:flex flex-col justify-center overflow-hidden relative p-8">
          <Image
            src={employerImg}
            alt="Employer working with team"
            fill
            className="object-cover brightness-50"
            priority
          />
          <div className="absolute inset-0 bg-black/40 backdrop-brightness-75 z-0" />

          {/* Cards container */}
          <div className="relative z-10 space-y-3.5 max-w-md mx-auto w-full">
            {/* Header Card */}
            <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-white shadow-xl">
              <h2 className="text-2xl lg:text-3xl font-bold mb-2 tracking-tight">Find Verified Talent</h2>
              <p className="text-sm text-gray-300 leading-relaxed font-normal">
                Hire candidates with AI-verified credentials directly matched to your job requirements.
              </p>
            </div>

            {/* Feature 1 */}
            <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-white shadow-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-cyan-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white mb-1">AI-Verified Credentials</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Every credential is analyzed by AI and confirmed by institutional registrars.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-white shadow-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-cyan-400">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white mb-1">Skill-Matched Candidates</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Post jobs and automatically match with students whose skills fit your requirements.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-white shadow-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-cyan-400">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white mb-1">Hiring Pipeline Tracker</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Manage applicants from review to interview to offer — all in one dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
