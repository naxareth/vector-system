'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import EmployerLayout from '@/components/dashboard/EmployerLayout';

interface Applicant {
  id: string;
  status: string;
  applied_at: string;
  cover_note: string | null;
  cvr_export_id: string | null;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function JobApplicants({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const res = await fetch(`/api/jobs/${id}/applicants`);
        if (res.ok) {
          const data = await res.json();
          setApplicants(data.applications || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchApplicants();
  }, [id]);

  const updateStatus = async (application_id: string, new_status: string) => {
    try {
      const csrfToken = typeof document !== 'undefined'
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
        : '';

      const res = await fetch(`/api/jobs/${id}/applicants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ application_id, status: new_status })
      });
      if (res.ok) {
        setApplicants(apps => apps.map(app => 
          app.id === application_id ? { ...app, status: new_status } : app
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <EmployerLayout>
      <div className="mb-6">
        <Link href="/employer/postings" className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1 mb-4">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           Back to Postings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applicant Tracking</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review candidates for this position.</p>
      </div>

      <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
        {loading ? (
           <div className="py-12 text-center text-sm text-gray-500">Loading applicants...</div>
        ) : applicants.length === 0 ? (
           <div className="p-12 text-center">
             <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
               <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
               </svg>
             </div>
             <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No applications yet</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-[#1A2030] border-b border-gray-200 dark:border-[#1E2536] text-gray-700 dark:text-gray-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Applicant</th>
                  <th className="px-6 py-4">Applied Date</th>
                  <th className="px-6 py-4">CVR</th>
                  <th className="px-6 py-4">Cover Note</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                {applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                       <p className="font-semibold text-gray-900 dark:text-white">{app.student.full_name}</p>
                       <p className="text-xs text-gray-500 mt-0.5">{app.student.email}</p>
                    </td>
                    <td className="px-6 py-4">{new Date(app.applied_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                       {app.cvr_export_id ? (
                         <Link href={`/verify/cvr/${app.cvr_export_id}`} target="_blank" className="text-blue-600 hover:underline">
                           View CVR
                         </Link>
                       ) : (
                         <span className="text-gray-400">Not provided</span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                       {app.cover_note ? (
                         <div className="max-w-[200px] truncate" title={app.cover_note}>{app.cover_note}</div>
                       ) : (
                         <span className="text-gray-400">None</span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        className="text-xs bg-gray-50 dark:bg-[#0E1220] border border-gray-200 dark:border-[#283042] rounded-md px-2 py-1 focus:ring-blue-500"
                      >
                         <option value="pending">Pending</option>
                         <option value="reviewing">Reviewing</option>
                         <option value="interview">Interview</option>
                         <option value="offered">Offered</option>
                         <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Can add more actions here like Send Email */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EmployerLayout>
  );
}
