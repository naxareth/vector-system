'use client';

import Link from 'next/link';
import Image from 'next/image';
import RegistrarRegisterForm from '@/components/auth/RegistrarRegisterForm';
import mockupImg from '../login/mockup.png';

export default function RegistrarRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* ── Left column: form ── */}
        <div className="px-10 py-12 md:px-14 lg:px-16 flex flex-col justify-center">
          {/* Logo + branding */}
          <Link href="/" className="inline-flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#011018] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Vector</span>
          </Link>

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Registrar Account</h1>
            <p className="text-sm text-gray-500">Register your institution to issue and manage verified credentials</p>
          </div>

          {/* Registration form */}
          <RegistrarRegisterForm />

          {/* Footer links */}
          <p className="text-sm text-gray-600 text-center mt-10">
            Already have an account?{' '}
            <Link href="/login?role=registrar" className="font-semibold text-gray-900 hover:underline">
              Sign In
            </Link>
          </p>

          <p className="text-xs text-gray-400 text-center mt-4">
            Are you a student?{' '}
            <Link href="/register" className="font-semibold text-gray-600 hover:underline">
              Create Student Account
            </Link>
          </p>
        </div>

        {/* ── Right column: accent image panel ── */}
        <div className="hidden md:flex rounded-2xl m-3 items-center justify-center overflow-hidden relative" style={{ background: 'radial-gradient(circle at 50% 100%, #06B4C9 0%, #033a44 35%, #011018 70%)' }}>
          <Image
            src={mockupImg}
            alt="Vector platform preview"
            fill
            className="object-contain p-2 drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </div>
  );
}