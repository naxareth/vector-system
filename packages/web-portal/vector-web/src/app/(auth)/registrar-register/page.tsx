'use client';

import Link from 'next/link';
import RegistrarRegisterForm from '@/components/auth/RegistrarRegisterForm';

export default function RegistrarRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* ── Left column: form ── */}
        <div className="px-10 py-12 md:px-14 lg:px-16 flex flex-col justify-center">
          {/* Logo + branding */}
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#011018] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Vector</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Institution Access</h1>
          <p className="text-sm text-gray-500 mb-8" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Create Registrar Account</p>

          {/* Registrar registration form */}
          <RegistrarRegisterForm />

          {/* Sign-in redirect */}
          <p className="text-sm text-gray-500 text-center mt-8">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-gray-900 hover:underline">
              Sign In
            </Link>
          </p>

          <p className="text-xs text-gray-400 text-center mt-3">
            Are you a student?{' '}
            <Link href="/register" className="font-medium text-gray-600 hover:underline">
              Register here
            </Link>
          </p>
        </div>

        {/* ── Right column: accent image panel ── */}
        <div className="hidden md:flex rounded-2xl m-3 bg-[#011018] items-center justify-center">
          <span className="text-gray-400 text-sm tracking-wide">Image Here</span>
        </div>
      </div>
    </div>
  );
}