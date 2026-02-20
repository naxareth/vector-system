'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react'; // <-- Added Import

// --- ZOD SCHEMAS ---

const emailSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Numbers only"),
});

// Strong Password Policy
const passwordSchema = z.object({
  password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/, {
    message: "Password must be 12+ chars, include uppercase, lowercase, number, and special char.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// --- COMPONENT ---

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  // UI States
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- HANDLERS ---

  // Step 1: Send Recovery Code (Calls Custom API)
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanData = emailSchema.parse({ email });
      const sanitizedEmail = cleanData.email.trim().toLowerCase();

      // 🚀 Call your Custom API
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitizedEmail }),
      });

      if (!res.ok) {
        throw new Error("Could not send code. Please try again.");
      }

      setEmail(sanitizedEmail);
      setStep('otp');
      setSuccessMsg(`Code sent to ${sanitizedEmail}`);

    } catch (err: any) {
      setError(err instanceof z.ZodError ? err.errors[0].message : err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Format (Client-Side Check)
  // Note: We verify the actual code + password together in Step 3 to save an API call
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      otpSchema.parse({ otp });
      // If format is valid, move to reset step
      setStep('reset');
      setSuccessMsg("Identity checks out. Set your new password.");
    } catch (err: any) {
      setError(err instanceof z.ZodError ? err.errors[0].message : "Invalid code format");
    }
  };

  // Step 3: Reset Password (Calls Custom API)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanData = passwordSchema.parse({ 
        password: newPassword, 
        confirmPassword 
      });

      // 🚀 Call your Custom API to Verify Code AND Reset Password
      const res = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          code: otp, 
          password: cleanData.password 
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password.");
      }

      // Success! Redirect to login
      router.push('/login?reset=success');

    } catch (err: any) {
      setError(err instanceof z.ZodError ? err.errors[0].message : err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 text-blue-600 shadow-sm">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {step === 'email' && 'Forgot Password?'}
            {step === 'otp' && 'Verify Identity'}
            {step === 'reset' && 'Reset Password'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {step === 'email' && "Enter your email to receive a recovery code."}
            {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
            {step === 'reset' && "Create a secure new password for your account."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {successMsg && !error && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {successMsg}
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                placeholder="name@university.edu" 
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? 'Sending...' : 'Send Recovery Code'}
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Security Code</label>
              <input 
                type="text" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest font-mono" 
                placeholder="000000" 
                maxLength={6}
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
            >
              Next Step
            </button>
            <button 
              type="button" 
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}
              className="w-full text-gray-500 text-sm hover:text-gray-700 mt-4 underline"
            >
              Start over
            </button>
          </form>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Secure password" 
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Repeat password" 
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? 'Updating...' : 'Update Password & Sign In'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Remembered it?{' '}
            <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
              Back to Login
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}