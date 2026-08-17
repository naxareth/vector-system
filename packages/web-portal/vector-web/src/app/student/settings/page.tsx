'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import HelpTip from '@/components/shared/HelpTip';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [mfa2faEnabled, setMfa2faEnabled] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [sendingPassword, setSendingPassword] = useState(false);

  useEffect(() => {
    const checkUserAndMfa = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.filter(f => f.status === 'verified') ?? [];
      setMfa2faEnabled(verified.length > 0);
      setLoading(false);
    };

    checkUserAndMfa();
  }, [router]);

  const handlePasswordReset = async () => {
    setSendingPassword(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData.session?.user?.email;

    if (userEmail) {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (!error) {
        setPasswordSent(true);
      } else {
        alert(error.message);
      }
    }
    setSendingPassword(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#06B4C9]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your account preferences, notifications, and security options
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Preferences Column ──────────────────────────────────── */}
          <div className="space-y-6">

            {/* Appearance Card */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Appearance
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Customize how Vector looks on your device
              </p>

              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Theme Preference
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`px-4 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all text-sm font-medium ${
                    theme === 'light'
                      ? 'border-[#06B4C9] bg-[#06B4C9]/10 text-[#06B4C9]'
                      : 'border-gray-200 dark:border-[#1E2536] bg-white dark:bg-[#131825] text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`px-4 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all text-sm font-medium ${
                    theme === 'dark'
                      ? 'border-[#06B4C9] bg-[#06B4C9]/10 text-[#06B4C9]'
                      : 'border-gray-200 dark:border-[#1E2536] bg-white dark:bg-[#131825] text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </button>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Notifications
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Choose what alerts and updates you receive
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Email Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Receive updates about credentials and activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-[#1E2536] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06B4C9]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#1E2536] pt-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                      Skill Expiry Alerts
                      <HelpTip text="Some certificates have expiration dates. This notifies you before they expire so you can renew them." size={12} />
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Get notified when credentials are about to expire</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-[#1E2536] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06B4C9]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#1E2536] pt-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                      Market Updates
                      <HelpTip text="A weekly AI-generated summary of how your skills are trending in the job market." size={12} />
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Weekly summary of skill market trends</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-[#1E2536] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06B4C9]"></div>
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* ── Security Column ─────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Password Security */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Password
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Update your password to keep your account secure
              </p>

              {passwordSent ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-400">
                  ✓ Password reset link sent to your email address.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={sendingPassword}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1e293b] dark:bg-[#1E2536] dark:hover:bg-[#283042] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {sendingPassword ? 'Sending reset link...' : 'Send Password Reset Link'}
                </button>
              )}
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                Two-Factor Authentication
                <HelpTip text="An extra security step that requires a code from an app like Google Authenticator or Authy when you log in." size={14} />
                {mfa2faEnabled && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    ✓ Enabled
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {mfa2faEnabled
                  ? 'Your account is protected with an authenticator app.'
                  : 'Add an extra layer of security using TOTP authenticator'}
              </p>
              <button
                type="button"
                onClick={() => router.push('/student/profile/security')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  mfa2faEnabled
                    ? 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    : 'bg-[#06B4C9] text-white hover:bg-[#06B4C9]/80'
                }`}
              >
                {mfa2faEnabled ? 'Manage 2FA' : 'Enable 2FA'}
              </button>
            </div>

            {/* Active Sessions */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1">
                Active Sessions
                <HelpTip text="Devices or browsers where you're currently logged in." size={14} />
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Devices where you&apos;re currently logged in
              </p>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#131825] rounded-lg">
                <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Current Session</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">This device &middot; Active now</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-red-200 dark:border-red-500/20 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">
                Delete Account
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                    alert("Account deletion request logged.");
                  }
                }}
                className="px-4 py-2 border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Delete Account
              </button>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
