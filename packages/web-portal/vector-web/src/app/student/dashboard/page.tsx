'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CredentialCard from '@/components/dashboard/CredentialCard';
import RecentActivity from '@/components/dashboard/RecentActivity';

export default function StudentDashboard() {
  const router = useRouter();
  const [hasPendingCVR, setHasPendingCVR] = useState(false);

  useEffect(() => {
    // Check if there's a pending CVR from localStorage
    const pending = localStorage.getItem('pendingCVR');
    if (pending === 'true') {
      setHasPendingCVR(true);
    }
  }, []);

  const handleClosePendingCard = () => {
    setHasPendingCVR(false);
    localStorage.removeItem('pendingCVR');
  };

  const credentials = [
    {
      category: 'Database Management',
      title: 'Advanced SQL Querying',
      issueDate: 'Jun 14, 2024',
      marketRelevance: 92,
      verified: true,
    },
    {
      category: 'Frontend Engineering',
      title: 'React Application Development',
      issueDate: 'Apr 28, 2024',
      marketRelevance: 88,
      verified: true,
    },
    {
      category: 'Backend Engineering',
      title: 'Java Object-Oriented Programming',
      issueDate: 'Feb 10, 2024',
      marketRelevance: 65,
      verified: true,
    },
    {
      category: 'Computer Science Core',
      title: 'Data Structures & Algorithms',
      issueDate: 'Jan 5, 2024',
      marketRelevance: 95,
      verified: true,
    },
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-500">Overview of your credentials and market standing</p>
      </div>

      {/* Pending CVR Verification Card */}
      {hasPendingCVR && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 md:mb-8">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 mt-0.5">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Pending Credential Verification</h3>
              <p className="text-blue-700 text-sm">
                Your CVR is currently being verified by the registrar. You'll be notified once the blockchain verification is complete and your credential is ready for download.
              </p>
            </div>
            <button 
              onClick={handleClosePendingCard}
              className="text-blue-400 hover:text-blue-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Skill Decay Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 md:mb-8">
        <div className="flex items-start gap-3 mb-3 md:mb-0">
          <div className="text-orange-500 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-1">Skill Decay Detected</h3>
            <p className="text-orange-700 text-sm">
              Your Java proficiency relevance has dropped 8% due to market shifts towards Kotlin and Rust
            </p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/student/coach')}
          className="w-full md:w-auto md:ml-auto md:mt-0 mt-3 text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center justify-center md:justify-start gap-1"
        >
          View Upskilling Options
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Verified Micro-Credentials Section */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Verified Micro-Credentials</h2>
          <button 
            onClick={() => router.push('/student/skills')}
            className="w-full md:w-auto text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center justify-center md:justify-start gap-1"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {credentials.map((credential, index) => (
            <CredentialCard key={index} {...credential} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </DashboardLayout>
  );
}
