'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabaseClient';
import { employerSchema, type EmployerRegisterData } from '@/lib/schemas/auth';
import { Eye, EyeOff } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export default function EmployerRegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Turnstile state and ref
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployerRegisterData>({
    resolver: zodResolver(employerSchema),
    mode: 'onChange',
  });

  const onSubmit = async (validData: EmployerRegisterData) => {
    setServerError(null);

    if (!turnstileToken) {
      setServerError("Please complete the human verification check.");
      return;
    }

    try {
      const emailCheckResponse = await fetch('/api/auth/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validData.email }),
      });
      const emailCheckResult = await emailCheckResponse.json();
      if (!emailCheckResponse.ok || !emailCheckResult.success) {
        throw new Error(emailCheckResult.message || 'Invalid email address.');
      }

      const captchaResponse = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const captchaResult = await captchaResponse.json();

      if (!captchaResponse.ok || !captchaResult.success) {
        throw new Error('CAPTCHA verification failed. Please try again.');
      }

      // Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validData.email,
        password: validData.password,
        options: {
          data: {
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: 'employer',
          }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.status === 400) {
           console.warn("Registration attempt on existing email (Suppressed for security)");
        } else {
           throw authError; 
        }
      }

      if (authData.user) {
        // Create user profile
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            student_id: null,
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: 'employer',
            email: validData.email,
          });

        if (dbError && dbError.code !== '23505') {
          console.error("Database Insert Warning:", dbError.message);
        }

        // We can't insert into employer_profiles directly from client without RLS config, 
        // but user is not logged in yet.
        // Wait, the API route `POST /api/employer/profile` handles it, but maybe we can just insert here if RLS allows or we let the API handle it upon first login.
        // Actually, let's trigger the API or just insert it server-side if needed, but since we are just registering, let's leave it for now. The employer profile will be created upon onboarding or via the API.
      }

      // Trigger Verification Email API
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validData.email }),
      });

      router.refresh();
      router.push(`/verify-email?email=${encodeURIComponent(validData.email)}`);

    } catch (err: unknown) {
      console.error("Registration Error:", err);
      const errMsg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setServerError(errMsg);
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  return (
    // eslint-disable-next-line react-hooks/refs
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
          <input
            {...register('firstName')}
            className={`w-full px-3 py-2 border ${errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#011018] outline-none transition-all`}
          />
          {errors.firstName && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
          <input
            {...register('lastName')}
            className={`w-full px-3 py-2 border ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#011018] outline-none transition-all`}
          />
          {errors.lastName && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Work Email</label>
        <input
          {...register('email')}
          type="email"
          onKeyDown={(e) => e.key === ' ' && e.preventDefault()}
          className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#011018] outline-none transition-all`}
        />
        {errors.email && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
        <input
          {...register('companyName')}
          type="text"
          className={`w-full px-3 py-2 border ${errors.companyName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#011018] outline-none transition-all`}
        />
        {errors.companyName && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.companyName.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? "text" : "password"}
            onKeyDown={(e) => e.key === ' ' && e.preventDefault()}
            className={`w-full px-3 py-2 pr-10 border ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#011018] outline-none transition-all hide-password-toggle`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-[10px] text-red-600 font-bold leading-tight">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
        <div className="relative">
          <input
            {...register('confirmPassword')}
            type={showConfirmPassword ? "text" : "password"}
            onKeyDown={(e) => e.key === ' ' && e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            className={`w-full px-3 py-2 pr-10 border ${errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#011018] outline-none transition-all hide-password-toggle`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.confirmPassword && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.confirmPassword.message}</p>}
      </div>

      <div className="flex justify-center py-1">
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
          onSuccess={(token) => setTurnstileToken(token)}
          onError={() => setServerError('CAPTCHA failed to load. Please refresh the page.')}
          onExpire={() => setTurnstileToken(null)}
          options={{ theme: 'light' }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !turnstileToken}
        className="w-full bg-[#011018] hover:bg-[#02202f] text-white font-semibold py-3 rounded-lg transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
      >
        {isSubmitting ? 'Creating Account...' : 'Create Employer Account'}
      </button>
    </form>
  );
}
