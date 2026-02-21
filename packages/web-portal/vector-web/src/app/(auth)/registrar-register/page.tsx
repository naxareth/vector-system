'use client';

import Link from 'next/link';
import RegistrarRegisterForm from '@/components/auth/RegistrarRegisterForm';

export default function RegistrarRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full flex-grow flex flex-col justify-center">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">VECTOR</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Access</h1>
          <p className="text-gray-600">Secure registration for credential issuers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Main Registrar Form */}
          <RegistrarRegisterForm />
          
          <p className="text-[10px] text-gray-400 text-center mt-6">
            Secure end-to-end verification protected by VECTOR Protocol.
          </p>
        </div>
        
        <div className="text-center mt-6 space-y-2">
          <p className="text-gray-600 text-sm">
            Already have an account? <Link href="/login" className="text-purple-600 hover:text-purple-700 font-bold">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Subtle Student Link at the bottom */}
      <div className="mt-8 text-center pb-8">
        <p className="text-xs text-gray-500">
          Are you a student? <Link href="/register" className="text-purple-600 hover:underline font-medium">Register here</Link>
        </p>
      </div>
    </div>
  );
}