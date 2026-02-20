'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabaseClient';
import { registrarSchema, type RegistrarRegisterData } from '@/lib/schemas/auth';
import { Eye, EyeOff } from 'lucide-react';

export default function RegistrarRegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // Visibility states
  const [showCode, setShowCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarRegisterData>({
    resolver: zodResolver(registrarSchema),
    mode: 'onChange', // Instant validation feedback
  });

  const onSubmit = async (validData: RegistrarRegisterData) => {
    setServerError(null);

    try {
      // 1. Security Check (Server-Side)
      const res = await fetch('/api/verify-registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validData.inviteCode }),
      });

      const verification = await res.json();

      if (!res.ok || !verification.success) {
        throw new Error(verification.message || "Invalid Authorization Code.");
      }

      // 2. Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validData.email,
        password: validData.password,
        options: {
          data: {
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: 'registrar',
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

      // 3. Create Public Profile
      if (authData.user) {
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            student_id: null, // Registrars don't get a student_id
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: 'registrar',
          });

        if (dbError && dbError.code !== '23505') {
          console.error("Database Insert Warning:", dbError.message);
        }
      }

      // 4. Trigger Verification Email API
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
            className={`w-full px-3 py-2 border ${errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} 
            placeholder="Jane" 
          />
          {errors.firstName && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Last Name</label>
          <input 
            {...register('lastName')} 
            className={`w-full px-3 py-2 border ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} 
            placeholder="Smith" 
          />
          {errors.lastName && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Institution Email</label>
        <input 
          {...register('email')} 
          type="email"
          className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} 
          placeholder="admin@university.edu" 
        />
        {errors.email && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.email.message}</p>}
      </div>

      {/* Registrar Specific Field */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
        <label className="block text-xs font-bold text-purple-800 uppercase mb-1">Authorization Code</label>
        <div className="relative">
          <input 
            {...register('inviteCode')} 
            type={showCode ? "text" : "password"}
            className={`w-full px-3 py-2 pr-10 border ${errors.inviteCode ? 'border-red-500 bg-red-50' : 'border-purple-200'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} 
            placeholder="Enter authorization code" 
          />
          <button 
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 focus:outline-none"
          >
            {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-[10px] text-purple-600 mt-1 font-medium">Network verification required for issuer access.</p>
        {errors.inviteCode && <p className="mt-1 text-[10px] text-red-600 font-bold">{errors.inviteCode.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
        <div className="relative">
          <input 
            {...register('password')} 
            type={showPassword ? "text" : "password"}
            className={`w-full px-3 py-2 pr-10 border ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} 
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
            className={`w-full px-3 py-2 pr-10 border ${errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} 
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

      <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-4">
        {isSubmitting ? 'Verifying...' : 'Create Registrar Account'}
      </button>
    </form>
  );
}