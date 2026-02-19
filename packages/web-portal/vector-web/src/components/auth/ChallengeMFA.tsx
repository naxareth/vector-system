'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function ChallengeMFA({ factorId, onVerified, onCancel }: { factorId: string, onVerified: () => void, onCancel: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Challenge + Verify in one step helper
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      setError('Invalid code. Please try again.');
      setLoading(false);
    } else {
      onVerified(); // Triggers the redirect in the parent component
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center relative z-50">
      <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
      <p className="text-sm text-gray-500 mb-6">Enter the code from your authenticator app.</p>
      
      <form onSubmit={handleVerify}>
        <input 
          type="text" 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full text-center text-2xl tracking-[0.5em] font-mono border-gray-300 rounded-lg py-3 mb-4 focus:ring-purple-500 focus:border-purple-500"
          placeholder="000000"
          maxLength={6}
          autoFocus
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
      <button onClick={onCancel} className="mt-4 text-sm text-gray-500 hover:text-gray-800">Cancel</button>
    </div>
  );
}