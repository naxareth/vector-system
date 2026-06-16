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

        {/* ── Right column: accent panel ── */}
        <div className="hidden md:flex items-center justify-center overflow-hidden relative p-0 bg-blue-900">
           <div className="text-center p-12 relative z-10 text-white">
              <h2 className="text-3xl font-bold mb-4">Find Verified Talent</h2>
              <p className="text-blue-100 text-lg">
                 Hire candidates with verified credentials directly mapped to your job requirements.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
