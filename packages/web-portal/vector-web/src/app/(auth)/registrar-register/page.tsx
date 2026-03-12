'use client';

import Link from 'next/link';
import Image from 'next/image';
import RegistrarRegisterForm from '@/components/auth/RegistrarRegisterForm';
import registrarImg from './registrar.jpg';

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

          {/* Registration form */}
          <RegistrarRegisterForm />

          {/* Footer links */}
          <p className="text-sm text-gray-600 text-center mt-10">
            Already have an account?{' '}
            <Link href="/registrar-login" className="font-semibold text-gray-900 hover:underline">
              Sign In
            </Link>
          </p>

        </div>

        {/* ── Right column: accent image panel (full-bleed for registrar) ── */}
        <div className="hidden md:flex items-center justify-center overflow-hidden relative p-0">
          <Image
            src={registrarImg}
            alt="Registrar portal preview"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}