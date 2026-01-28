'use client';
import { useState } from 'react';
import ConnectWalletModal from '@/components/shared/ConnectWalletModal';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false); // For Wallet
  
  // NEW: Email Login State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check role to redirect correctly
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userData?.role === 'registrar') {
        router.push('/dashboard/registrar');
      } else {
        router.push('/student/dashboard');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 md:p-6 relative">
      <div className="max-w-5xl w-full mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10 md:mb-14 space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-xl shadow-sm mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Welcome to VECTOR
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto font-medium">
            The secure blockchain-based micro-credential platform for verified
            academic achievements.
          </p>
        </div>

        {/* Split Options Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Option A: Student Access */}
          <div className="group relative bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Student Access
            </h2>
            <p className="text-gray-600 mb-8 flex-grow">
              Connect your digital wallet to view, manage, and share your
              verified credentials securely on the blockchain.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all duration-200 flex items-center justify-center gap-2 group-hover:gap-3"
              aria-label="Connect Wallet for Student Access"
            >
              Connect Wallet
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            
            {/* Added: Link for Student Email Login */}
            <button 
              onClick={() => setIsEmailModalOpen(true)} 
              className="mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium underline"
            >
              Or sign in with Email
            </button>
          </div>

          {/* Option B: Registrar Access */}
          <div className="group relative bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-400 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Registrar Access
            </h2>
            <p className="text-gray-600 mb-8 flex-grow">
              Login with your institutional credentials to issue, revoke, and
              manage student micro-credentials.
            </p>

            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="Login with Email for Registrar Access"
            >
              Login with Email
            </button>
          </div>
        </div>

        {/* Footer / Trust Indicators */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400 font-medium">
            Secured by Blockchain Technology • 256-bit Encryption
          </p>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* NEW: Email Login Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
            <button 
              onClick={() => setIsEmailModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h2>
            
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
            
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                  placeholder="Enter email" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" 
                  placeholder="Enter password" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <Link href="/register" className="text-sm text-purple-600 hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}