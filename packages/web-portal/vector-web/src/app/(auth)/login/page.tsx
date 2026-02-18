'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { ChallengeMFA } from '@/components/auth/ChallengeMFA'; 

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // MFA State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      setError(result.error.issues[0].message);
      setLoading(false);
      return;
    }

    const cleanData = result.data;

    try {
      // 1. Attempt Login
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: cleanData.email.trim().toLowerCase(),
        password: cleanData.password 
      });

      if (authError || !data.user) {
        throw new Error("Invalid email or password.");
      }

      // 2. Check for MFA Factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactors = factorsData?.totp?.filter(f => f.status === 'verified') ?? [];

      if (totpFactors.length > 0) {
        // MFA Enabled: Stop execution and show challenge
        setMfaFactorId(totpFactors[0].id);
        
        // Pre-fetch role for later redirect
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        setPendingRole(userData?.role || 'student');
        setMfaRequired(true);
        setLoading(false);
        return; // ⛔ STOP HERE. Do not redirect yet.
      }

      // 3. No MFA? Proceed to standard redirect
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (fetchError || !userData) {
        await supabase.auth.signOut();
        throw new Error("Account integrity error. Please contact support.");
      }

      // 🛑 CRITICAL FIX: Refresh router to sync server cookies
      router.refresh();

      // Determine redirect target
      const returnUrl = searchParams.get('redirectTo');
      
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        // 🛑 UPDATED REDIRECT LOGIC FOR SUPER ADMIN
        let target = '/student/dashboard'; // Default
        
        if (userData.role === 'registrar') {
          target = '/registrar/dashboard';
        } else if (userData.role === 'super_admin') {
          target = '/admin/dashboard';
        }
        
        router.push(target);
      }

    } catch (err: any) {
      console.error("Login Error:", err);
      setError('Invalid email or password.');
    } finally {
      // Only stop loading if we hit an error or stopped for MFA.
      // If redirecting, keep loading true to prevent double-clicks.
      if (error || mfaRequired) setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setError('OAuth sign-in failed. Please try again.');
    }
  };

  // MFA Challenge View
  if (mfaRequired && mfaFactorId) {
    return (
      <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 md:p-6 relative">
        <ChallengeMFA 
          factorId={mfaFactorId} 
          onVerified={() => {
             // 🛑 UPDATED REDIRECT LOGIC FOR SUPER ADMIN MFA
             let target = '/student/dashboard';
             if (pendingRole === 'registrar') target = '/registrar/dashboard';
             if (pendingRole === 'super_admin') target = '/admin/dashboard';
             
             // Refresh and Push
             router.refresh();
             router.push(target);
          }} 
          onCancel={() => { 
            setMfaRequired(false); 
            setMfaFactorId('');
            supabase.auth.signOut(); 
          }}
        />
      </main>
    );
  }

  // Standard Login View
  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 md:p-6 relative">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4 text-purple-600 shadow-sm">
             <span className="font-bold text-xl">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 mt-2 text-sm">Sign in to access VECTOR</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
              placeholder="name@university.edu" 
              required 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Link 
                href="/forgot-password" 
                className="text-sm text-purple-600 hover:text-purple-700 font-semibold hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input 
              type="password" 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
              placeholder="••••••••" 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-md hover:shadow-lg transform active:scale-[0.98]"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Signing In...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        {/* OAuth Section */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold transition-all hover:shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
        
        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-purple-600 font-semibold hover:text-purple-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}