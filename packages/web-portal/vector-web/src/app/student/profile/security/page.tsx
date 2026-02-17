'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EnrollMFA from '@/components/auth/EnrollMFA';

export default function SecuritySettings() {
  const [showEnroll, setShowEnroll] = useState(false);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
              <p className="text-gray-500 text-sm mt-1">
                Add an extra layer of security to your account by requiring a code when logging in.
              </p>
            </div>
            {/* You can add logic here to check if already enabled using mfa.listFactors */}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            {!showEnroll ? (
              <button 
                onClick={() => setShowEnroll(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Enable 2FA
              </button>
            ) : (
              <EnrollMFA onComplete={() => {
                alert("2FA Enabled Successfully!");
                setShowEnroll(false);
              }} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}