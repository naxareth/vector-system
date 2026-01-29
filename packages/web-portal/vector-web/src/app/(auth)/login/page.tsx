'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("No user found");

      // 2. Fetch User Profile & Role (Strict Check)
      // We use .single() to force an error if the profile is missing (Ghost User)
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (fetchError || !userData) {
        console.error("👻 Ghost User Detected:", fetchError);
        // Security: Sign them out if their DB profile is broken/missing
        await supabase.auth.signOut();
        throw new Error("Profile data not found. Please register again.");
      }

      // 3. Redirect based on Role
      if (userData.role === 'registrar') {
        router.push('/registrar/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

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
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
              placeholder="name@university.edu" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
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
        
        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-purple-600 font-semibold hover:text-purple-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}