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
            <Image src="/logo/VectorLogo.png" alt="Vector Logo" width={40} height={40} className="rounded-full" style={{ width: 'auto', height: 'auto' }} />
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

          {/* Registrar CTA removed from student registration */}
        </div>

        {/* ── Right column: accent image panel ── */}
        <div className="hidden md:flex rounded-2xl m-3 items-center justify-center overflow-hidden relative" style={{ background: 'radial-gradient(circle at 50% 100%, #06B4C9 0%, #033a44 35%, #011018 70%)' }}>
          <Image
            src={mockupImg}
            alt="Vector platform preview"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-2 drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </div>
  );
}