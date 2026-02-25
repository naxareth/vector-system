'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { ChallengeMFA } from '@/components/auth/ChallengeMFA'; 
import { Eye, EyeOff } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

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
  
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  // Turnstile state and ref
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Check for successful password reset redirect
  const isResetSuccess = searchParams.get('reset') === 'success';

  // MFA State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsOAuthUser(false); // Reset on new attempt

    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      setError(result.error.issues[0].message);
      setLoading(false);
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the human verification check.");
      setLoading(false);
      return;
    }

    const cleanData = result.data;

    try {
      // 🛑 STEP 0: VERIFY CAPTCHA FIRST 🛑
      const captchaResponse = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const captchaResult = await captchaResponse.json();

      if (!captchaResponse.ok || !captchaResult.success) {
        throw new Error('CAPTCHA verification failed. Please try again.');
      }

      // 🛑 STEP 1: CALL THE GATEKEEPER API WITH EMAIL 🛑
      const gateResponse = await fetch('/api/auth/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanData.email.trim().toLowerCase() }),
      });

      // Handle custom gatekeeper rejections (Rate Limits & OAuth-Only accounts)
      if (!gateResponse.ok) {
        const gateData = await gateResponse.json();
        
        // Trigger visual highlight if the account is Google-only
        if (gateData.isOAuthOnly) {
          setIsOAuthUser(true);
        }
        
        throw new Error(gateData.message || "Login check failed.");
      }

      // 🛑 STEP 2: PROCEED TO AUTH 🛑
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: cleanData.email.trim().toLowerCase(),
        password: cleanData.password 
      });

      if (authError || !data.user) {
        throw new Error("Invalid email or password.");
      }

      // 3. Check for MFA Factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactors = factorsData?.totp?.filter(f => f.status === 'verified') ?? [];

      if (totpFactors.length > 0) {
        setMfaFactorId(totpFactors[0].id);
        
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        setPendingRole(userData?.role || 'student');
        setMfaRequired(true);
        setLoading(false); 
        return; 
      }

      // 4. No MFA? Proceed to standard redirect
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (fetchError || !userData) {
        await supabase.auth.signOut();
        throw new Error("Account integrity error. Please contact support.");
      }

      router.refresh();

      const returnUrl = searchParams.get('redirectTo');
      
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        let target = '/student/dashboard'; 
        
        if (userData.role === 'registrar') {
          target = '/registrar/dashboard';
        } else if (userData.role === 'super_admin') {
          target = '/admin/dashboard';
        }
        
        router.push(target);
      }

    } catch (err: any) {
      console.error("Login Error:", err);
      // Only genericize standard Supabase errors; preserve our custom Gatekeeper and CAPTCHA messages
      const isCustomError = err.message.includes("Too many") || err.message.includes("Google") || err.message.includes("CAPTCHA");
      setError(isCustomError ? err.message : 'Invalid email or password.');
      setLoading(false);
      
      // Reset Turnstile on error so they can try again
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  const handleGoogleLogin = async () => {
    // OAuth providers handle their own bot mitigation, so we bypass Turnstile here.
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
              let target = '/student/dashboard';
              if (pendingRole === 'registrar') target = '/registrar/dashboard';
              if (pendingRole === 'super_admin') target = '/admin/dashboard';
              
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
    <main className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-4 md:p-6 relative">
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

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-sm text-gray-500 mb-8" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>Sign in to access VECTOR</p>

          {/* Success Message for Password Reset */}
          {isResetSuccess && !error && (
            <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Password reset successful! You can now sign in.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-3 text-sm rounded-lg border flex items-start gap-3 ${
              error.includes("Google") 
                ? "bg-blue-50 text-blue-700 border-blue-200" 
                : (error.includes("Too many") || error.includes("CAPTCHA"))
                  ? "bg-orange-50 text-orange-700 border-orange-200" 
                  : "bg-red-50 text-red-600 border-red-200"
            }`}>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {error.includes("Google") ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (error.includes("Too many") || error.includes("CAPTCHA")) ? (
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                onKeyDown={(e) => e.key === ' ' && e.preventDefault()}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#011018] focus:border-transparent outline-none transition-all" 
                required 
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600">Password</label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-gray-500 hover:text-gray-900 font-medium hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  onKeyDown={(e) => e.key === ' ' && e.preventDefault()}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#011018] focus:border-transparent outline-none transition-all hide-password-toggle" 
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile Widget */}
            <div className="flex justify-center py-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setError("CAPTCHA failed to load. Please refresh the page.")}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: 'light' }}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading || !turnstileToken} 
              className="w-full bg-[#011018] hover:bg-[#02202f] text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center active:scale-[0.98]"
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
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400">or continue with</span>
            </div>
          </div>

          {/* Highlighted Google Button when isOAuthUser is true */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
              isOAuthUser 
                ? 'border-blue-400 bg-blue-50/50 hover:bg-blue-100 ring-2 ring-blue-100 shadow-md' 
                : 'border-gray-300 bg-white hover:bg-gray-50 hover:shadow-sm text-gray-700'
            } font-medium text-sm`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          
          <p className="text-sm text-gray-500 text-center mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-gray-900 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* ── Right column: accent image panel ── */}
        <div className="hidden md:flex rounded-2xl m-3 bg-[#011018] items-center justify-center">
          <span className="text-gray-400 text-sm tracking-wide">Image Here</span>
        </div>
      </div>
    </main>
  );
}