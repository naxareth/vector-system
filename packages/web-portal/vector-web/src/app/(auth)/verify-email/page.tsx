'use client';
import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle auto-focusing to the next box
  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return; // Only allow numbers

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    
    if (fullCode.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Verification failed');
      }

      // Success! Route to the login page so they can establish a fresh, verified session.
      router.push('/login?verified=true');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMessage('');
    setError('');
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResendMessage('A new code has been sent to your email.');
    } catch (err: any) {
      setError('Failed to resend code. Please try again later.');
    }
  };

  if (!email) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">No email address provided.</p>
        <Link href="/register" className="text-[#06B4C9] font-semibold hover:underline">Return to Registration</Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-[#06B4C9]/10 text-[#06B4C9] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-600">
          We sent a 6-digit verification code to <br/>
          <span className="font-bold text-gray-900">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 text-center">
          {error}
        </div>
      )}

      {resendMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 text-center">
          {resendMessage}
        </div>
      )}

      <form onSubmit={handleVerify}>
        <div className="flex justify-between gap-2 mb-8">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none transition-all"
            />
          ))}
        </div>

        <button type="submit" disabled={loading} className="w-full bg-[#06B4C9] hover:bg-[#06B4C9]/85 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? 'Verifying...' : 'Verify Account'}
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          Didn't receive the code?{' '}
          <button onClick={handleResend} type="button" className="text-[#06B4C9] font-semibold hover:underline outline-none">
            Resend
          </button>
        </p>
        <p className="mt-4">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-gray-500 hover:text-[#06B4C9] font-medium underline underline-offset-2 text-sm"
          >
            &larr; Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}

// Wrap in Suspense boundary for Next.js App Router (useSearchParams requirement)
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06B4C9]/5 via-white to-[#06B4C9]/10 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#06B4C9] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">VECTOR</span>
          </Link>
        </div>
        
        <Suspense fallback={<div className="text-center p-8 bg-white rounded-2xl shadow-xl">Loading verification...</div>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}