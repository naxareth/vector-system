'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod';

// OWASP Recommended Password Regex
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
);

// Zod Schema
const registerSchema = z.object({
  firstName: z.string().min(2, "First name too short").max(50),
  lastName: z.string().min(2, "Last name too short").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().regex(passwordValidation, {
    message: "Password must be 12+ chars, include uppercase, lowercase, number, and special char.",
  }),
  confirmPassword: z.string(),
  isRegistrar: z.boolean(),
  inviteCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.isRegistrar && !data.inviteCode) return false;
  return true;
}, {
  message: "Registrar Invite Code is required for this role",
  path: ["inviteCode"],
});

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRegistrarMode, setIsRegistrarMode] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '', 
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name] || errors.form) setErrors(prev => ({ ...prev, [name]: '', form: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // 1. Zod Validation (Safe Parse)
    const validationResult = registerSchema.safeParse({
      ...formData,
      isRegistrar: isRegistrarMode
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setLoading(false);
      return; 
    }

    const validData = validationResult.data;

    try {
      // 2. Security Check (Server-Side)
      if (isRegistrarMode) {
        const res = await fetch('/api/verify-registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: validData.inviteCode }),
        });

        const verification = await res.json();

        if (!res.ok || !verification.success) {
          throw new Error(verification.message || "Invalid Registrar Invite Code.");
        }
      }

      // 3. Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validData.email,
        password: validData.password,
        options: {
          data: {
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: isRegistrarMode ? 'registrar' : 'student',
          }
        }
      });

      // 🛑 PHASE 1 FIX: ANTI-ENUMERATION LOGIC
      // If user exists, we pretend it worked to hide this fact from hackers.
      if (authError) {
        if (authError.message.includes("already registered") || authError.status === 400) {
           console.warn("Registration attempt on existing email (Suppressed for security)");
           // Fall through to success logic below without throwing
        } else {
           throw authError; // Throw other real errors (network, system)
        }
      }

      // 4. Create Public Profile (Only run if we actually got a user object)
      // If the user already existed (authError caught above), authData.user might be null or existing.
      // We skip insertion if no NEW user was created to avoid primary key conflicts.
      if (authData.user) {
        const generatedStudentId = `03-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            student_id: isRegistrarMode ? null : generatedStudentId,
            full_name: `${validData.firstName} ${validData.lastName}`,
            role: isRegistrarMode ? 'registrar' : 'student',
            wallet_address: null
          });

        if (dbError) {
            // If duplicate key error (user profile already exists), just ignore it
            if (dbError.code !== '23505') throw dbError; 
        }
      }

      // 5. Success -> Redirect
      // For email confirmation flows, you might redirect to a "Check Email" page instead.
      if (isRegistrarMode) {
        router.push('/registrar/dashboard');
      } else {
        router.push('/student/dashboard');
      }

    } catch (err: any) {
      console.error("Registration Error:", err);
      // 🛑 PHASE 1 FIX: GENERIC ERROR MESSAGE
      setErrors({ form: 'Registration failed. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">VECTOR</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join the secure verification network</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {errors.form && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errors.form}
            </div>
          )}

          {/* Role Toggle Switch */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
              <button 
                type="button"
                onClick={() => setIsRegistrarMode(false)}
                className={`px-4 py-2 rounded-md transition-all ${!isRegistrarMode ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Student
              </button>
              <button 
                type="button"
                onClick={() => setIsRegistrarMode(true)}
                className={`px-4 py-2 rounded-md transition-all ${isRegistrarMode ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Registrar (Admin)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className={`w-full px-3 py-2 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} placeholder="John" />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className={`w-full px-3 py-2 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} placeholder="Doe" />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} placeholder="student@university.edu" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Registrar Invite Code (Conditional) */}
            {isRegistrarMode && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <label className="block text-xs font-bold text-purple-800 uppercase mb-1">Admin Invite Code</label>
                <input 
                  type="password" // Hidden for security
                  name="inviteCode" 
                  value={formData.inviteCode} 
                  onChange={handleInputChange} 
                  className={`w-full px-3 py-2 border ${errors.inviteCode ? 'border-red-500' : 'border-purple-200'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} 
                  placeholder="Enter admin code" 
                />
                <p className="text-xs text-purple-600 mt-1">Required for registrar access.</p>
                {errors.inviteCode && <p className="mt-1 text-xs text-red-600">{errors.inviteCode}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleInputChange} className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} placeholder="12+ chars, symbols, numbers" />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className={`w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 outline-none`} placeholder="••••••••" />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-4">
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Initializing...
                </>
              ) : 'Create Account'}
            </button>
          </form>
          
          <p className="text-xs text-gray-500 text-center mt-6">By creating an account, you agree to our Terms and Privacy Policy.</p>
        </div>
        <div className="text-center mt-6">
          <p className="text-gray-600">Already have an account? <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}