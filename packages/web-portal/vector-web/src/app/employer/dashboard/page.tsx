'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import EmployerLayout from '@/components/dashboard/EmployerLayout';

interface DashboardStats {
  activeJobs: number;
  totalApplicants: number;
  recentApplications: any[];
}

export default function EmployerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ activeJobs: 0, totalApplicants: 0, recentApplications: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // We'll just fetch jobs and tally stats, or in the future create a dedicated stats API
        const res = await fetch('/api/jobs');
        if (res.ok) {
           const data = await res.json();
           const jobs = data.jobs || [];
           setStats({
              activeJobs: jobs.length, // Simplified
              totalApplicants: 0, // Placeholder until applicant API is ready
              recentApplications: [] // Placeholder
           });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <EmployerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome to your employer portal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-[#131825] p-6 rounded-xl border border-gray-200 dark:border-[#1E2536] flex items-center justify-between">
          <div>
             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Job Postings</p>
             <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{loading ? '-' : stats.activeJobs}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
             <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131825] p-6 rounded-xl border border-gray-200 dark:border-[#1E2536] flex items-center justify-between">
          <div>
             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Applicants</p>
             <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{loading ? '-' : stats.totalApplicants}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
             <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-[#1E2536] flex justify-between items-center">
           <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Applications</h2>
           <Link href="/employer/postings" className="text-sm font-medium text-blue-600 hover:underline">View All</Link>
        </div>
        <div className="p-12 text-center">
           <p className="text-gray-500 dark:text-gray-400">No recent applications.</p>
        </div>
      </div>
    </EmployerLayout>
  );
}
