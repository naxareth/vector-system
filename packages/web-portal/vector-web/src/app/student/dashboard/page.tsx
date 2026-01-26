'use client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CredentialCard from '@/components/dashboard/CredentialCard';
import RecentActivity from '@/components/dashboard/RecentActivity';

export default function StudentDashboard() {
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-500">Overview of your credentials and market standing</p>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Export CVR
          </button>
        </div>
      </div>

      {/* Skill Decay Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8 flex items-start gap-3">
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
        <button className="text-purple-600 hover:text-purple-700 font-medium text-sm whitespace-nowrap flex items-center gap-1">
          View Upskilling Options
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Verified Micro-Credentials Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Verified Micro-Credentials</h2>
          <button className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
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
