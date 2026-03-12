'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EnrollMFA from '@/components/auth/EnrollMFA';
import { supabase } from '@/lib/supabaseClient';

export default function SecuritySettings() {
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const checkMfaStatus = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.filter(f => f.status === 'verified') ?? [];
    if (verified.length > 0) {
      setMfaEnabled(true);
      setFactorId(verified[0].id);
    } else {
      setMfaEnabled(false);
      setFactorId(null);
    }
    setLoading(false);
  };

  useEffect(() => { checkMfaStatus(); }, []);

  const handleRemove = async () => {
    if (!factorId) return;
    setRemoving(true);
    setRemoveError('');
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setRemoveError(error.message);
      setRemoving(false);
    } else {
      setMfaEnabled(false);
      setFactorId(null);
      setConfirmRemove(false);
      setRemoving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Security Settings</h1>

        <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Two-Factor Authentication
                {!loading && mfaEnabled && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Enabled
                  </span>
                )}
              </h2>
              <p className="text-gray-500 dark:text-[#94A3B8] text-sm mt-1">
                {mfaEnabled
                  ? 'Your account is protected with an authenticator app.'
                  : 'Add an extra layer of security to your account by requiring a code when logging in.'}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 dark:border-[#1E2536] pt-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
                <div className="w-4 h-4 border-2 border-[#06B4C9] border-t-transparent rounded-full animate-spin" />
                Checking status…
              </div>
            ) : mfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">2FA is active</p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                      You'll be asked for a verification code each time you sign in.
                    </p>
                  </div>
                </div>

                {!confirmRemove ? (
                  <button
                    onClick={() => setConfirmRemove(true)}
                    className="px-4 py-2 border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    Remove 2FA
                  </button>
                ) : (
                  <div className="border border-red-200 dark:border-red-500/30 rounded-lg p-4 bg-red-50 dark:bg-red-500/10 space-y-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Are you sure you want to remove two-factor authentication?
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Your account will only be protected by your password after this.
                    </p>
                    {removeError && (
                      <p className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 px-3 py-2 rounded-lg">{removeError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleRemove}
                        disabled={removing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                      >
                        {removing ? 'Removing…' : 'Yes, remove 2FA'}
                      </button>
                      <button
                        onClick={() => { setConfirmRemove(false); setRemoveError(''); }}
                        className="px-4 py-2 border border-gray-300 dark:border-[#283042] text-gray-700 dark:text-[#CBD5E1] text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : showEnroll ? (
              <EnrollMFA onComplete={() => {
                setShowEnroll(false);
                checkMfaStatus();
              }} />
            ) : (
              <button
                onClick={() => setShowEnroll(true)}
                className="bg-[#06B4C9] hover:bg-[#06B4C9]/80 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Enable 2FA
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}