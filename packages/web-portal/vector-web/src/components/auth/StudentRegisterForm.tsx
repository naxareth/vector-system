'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabaseClient';
import { studentSchema, type StudentRegisterData } from '@/lib/schemas/auth';
import { Eye, EyeOff } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export default function StudentRegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Turnstile state and ref
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentRegisterData>({
    resolver: zodResolver(studentSchema),
    mode: 'onChange',
  });

  const onSubmit = async (validData: StudentRegisterData) => {
    setServerError(null);

    // 1. Ensure CAPTCHA is completed
    if (!turnstileToken) {
      setServerError("Please complete the human verification check.");
      return;
    }

    try {
      // 2. Verify the CAPTCHA token securely on the server before creating the user
      const captchaResponse = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const captchaResult = await captchaResponse.json();

      if (!captchaResponse.ok || !captchaResult.success) {
        throw new Error('CAPTCHA verification failed. Please try again.');
      }

      // 3. Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validData.email,
        password: validData.password,
        options: {
          data: {
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: 'student',
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

      // 4. Create Public Profile
      if (authData.user) {
        const generatedStudentId = `03-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            student_id: generatedStudentId,
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: 'student',
            email: validData.email,
          });

        if (dbError && dbError.code !== '23505') {
          console.error("Database Insert Warning:", dbError.message);
        }
      }

      // 5. Trigger Verification Email API
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validData.email }),
      });

      router.refresh();
      router.push(`/verify-email?email=${encodeURIComponent(validData.email)}`);

    } catch (err: any) {
      console.error("Registration Error:", err);
      setServerError(err.message || 'Registration failed. Please try again.');
      // Reset Turnstile widget so the user can generate a fresh token to try again
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-center gap-2 animate-pulse">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">First Name</label>
          <input 
            {...register('firstName')} 
            className={`w-full px-3 py-2 border ${errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all`} 
            placeholder="John" 
          />
          {errors.firstName && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Last Name</label>
          <input 
            {...register('lastName')} 
            className={`w-full px-3 py-2 border ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all`} 
            placeholder="Doe" 
          />
          {errors.lastName && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email</label>
        <input 
          {...register('email')} 
          type="email"
          className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all`} 
          placeholder="student@university.edu" 
        />
        {errors.email && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
        <div className="relative">
          <input 
            {...register('password')} 
            type={showPassword ? "text" : "password"}
            className={`w-full px-3 py-2 pr-10 border ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all`} 
            placeholder="12+ chars, symbols, numbers" 
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
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Confirm Password</label>
        <div className="relative">
          <input 
            {...register('confirmPassword')} 
            type={showConfirmPassword ? "text" : "password"}
            className={`w-full px-3 py-2 pr-10 border ${errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all`} 
            placeholder="••••••••" 
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

      {/* Cloudflare Turnstile Widget */}
      <div className="flex justify-center py-2">
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
          onSuccess={(token) => setTurnstileToken(token)}
          onError={() => setServerError("CAPTCHA failed to load. Please refresh the page.")}
          onExpire={() => setTurnstileToken(null)}
          options={{ theme: 'light' }}
        />
      </div>

      <button type="submit" disabled={isSubmitting || !turnstileToken} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-4">
        {isSubmitting ? 'Processing...' : 'Create Student Account'}
      </button>
    </form>
  );
}