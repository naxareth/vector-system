'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import EmployerLayout from '@/components/dashboard/EmployerLayout';
import StatusDropdown from '@/components/dashboard/StatusDropdown';

interface Applicant {
  id: string;
  status: string;
  applied_at: string;
  cover_note: string | null;
  cvr_export_id: string | null;
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  isVerified?: boolean;
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
        <Link href="/employer/postings" className="text-blue-600 dark:text-[#06B4C9] text-sm font-medium hover:underline inline-flex items-center gap-1 mb-4">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           Back to Postings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applicant Tracking</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review candidates for this position, ranked by verified skill alignment.</p>
      </div>

      <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden shadow-sm">
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
                  <th className="px-6 py-4">Skill Match</th>
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
                       <Link href={`/employer/postings/${id}/applicants/${app.id}/resume`} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-[#06B4C9] transition-colors">
                         {app.student.full_name}
                       </Link>
                       <p className="text-xs text-gray-500 mt-0.5">{app.student.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {app.matchScore !== undefined && (
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            app.matchScore >= 0.7 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            app.matchScore >= 0.3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {Math.round(app.matchScore * 100)}%
                          </span>
                        )}
                        {app.isVerified && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{new Date(app.applied_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                       {app.cvr_export_id ? (
                         <Link
                           href={`/employer/postings/${id}/applicants/${app.id}/resume`}
                           className="text-blue-600 dark:text-[#06B4C9] font-medium hover:underline flex items-center gap-1"
                         >
                           <span>View Resume</span>
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
                       <StatusDropdown
                         value={app.status}
                         onChange={(newStatus) => updateStatus(app.id, newStatus)}
                       />
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <Link
                           href={`/employer/postings/${id}/applicants/${app.id}/resume`}
                           className="px-3 py-1.5 text-xs font-semibold bg-[#06B4C9] hover:bg-[#06B4C9]/90 !text-white rounded-lg transition-colors shadow-sm inline-flex items-center gap-1"
                         >
                           Review
                         </Link>
                         <a
                           href={`mailto:${app.student.email}`}
                           title="Email Applicant"
                           className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors inline-flex items-center"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                           </svg>
                         </a>
                       </div>
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
