'use client';

import Link from 'next/link';
import Image from 'next/image';
import StudentRegisterForm from '@/components/auth/StudentRegisterForm';
import mockupImg from '../login/mockup.png';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* ── Left column: form ── */}
        <div className="px-10 py-12 md:px-14 lg:px-16 flex flex-col justify-center">
          {/* Logo + branding */}
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#011018] rounded-full flex items-center justify-center">
              <span className="text-[#06B4C9] font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Vector</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Vector</h1>
          <p className="text-sm text-gray-500 mb-8" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Create Student Account</p>

          {/* Registration form (all logic preserved inside) */}
          <StudentRegisterForm />

          {/* Sign-in redirect */}
          <p className="text-sm text-gray-500 text-center mt-8">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-gray-900 hover:underline">
              Sign In
            </Link>
          </p>

          <p className="text-xs text-gray-400 text-center mt-4">
            Registering your institution?{' '}
            <Link href="/registrar-register" className="font-semibold text-[#06B4C9] hover:underline">
              Register as a Registrar
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