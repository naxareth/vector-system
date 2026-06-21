'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Application {
  id: string;
  status: string;
  applied_at: string;
  job_posting: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    employer: {
      company_name: string;
      logo_url: string | null;
    };
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  REVIEWING: 'bg-blue-100 text-blue-800 border-blue-200',
  INTERVIEW: 'bg-purple-100 text-purple-800 border-purple-200',
  OFFERED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
};

function Pagination({ totalPages, page, setPage }: { totalPages: number, page: number, setPage: (p: number | ((prev: number) => number)) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        className="px-2 py-1 rounded border text-xs font-medium disabled:opacity-40"
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
      >
        Prev
      </button>
      <span className="text-xs text-gray-500">
        Page {page} of {totalPages}
      </span>
      <button
        className="px-2 py-1 rounded border text-xs font-medium disabled:opacity-40"
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
      >
        Next
      </button>
    </div>
  );
}

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const APPS_PER_PAGE = 20;

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await fetch(`/api/student/applications?page=${page}&limit=${APPS_PER_PAGE}`);
        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
          setTotalPages(Math.max(1, Math.ceil((data.total || 0) / APPS_PER_PAGE)));
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchApplications();
  }, [page]);

  // Pagination component moved outside

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/student/dashboard" className="hover:text-[#06B4C9] transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">My Applications</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Applications</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track the status of your job applications.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
               <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
               </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">No applications yet</p>
            <Link href="/student/jobs" className="text-xs text-[#06B4C9] hover:underline mt-2 inline-block">Browse Job Board</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Job Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Applied</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="font-semibold text-gray-900">{app.job_posting.title}</div>
                       <div className="text-xs text-gray-500 mt-0.5">{app.job_posting.employer.company_name}</div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                         {app.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Link 
                         href={`/student/jobs/${app.job_posting.id}`}
                         className="text-xs font-semibold text-[#06B4C9] hover:underline"
                       >
                         View Job
                       </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination totalPages={totalPages} page={page} setPage={setPage} />
    </DashboardLayout>
  );
}
