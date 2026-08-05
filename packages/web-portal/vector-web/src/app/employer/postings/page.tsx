'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import EmployerLayout from '@/components/dashboard/EmployerLayout';
import { supabase } from '@/lib/supabaseClient';

interface JobPosting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  _count?: {
    applications: number;
  };
}

export default function JobPostingsManagement() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Job Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    job_type: 'Full-time',
    salary_range: '',
    required_skills: '',
    preferred_skills: ''
  });

  useEffect(() => {
    const fetchPostings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const res = await fetch(`/api/jobs?employer_id=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setPostings(data.jobs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchPostings();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    try {
      const csrfToken = typeof document !== 'undefined'
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
        : '';

      const payload = {
         ...formData,
         required_skills: formData.required_skills.split(',').map(s => s.trim()).filter(Boolean),
         preferred_skills: formData.preferred_skills.split(',').map(s => s.trim()).filter(Boolean),
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create job');
      }

      setShowCreateModal(false);
      setFormData({
        title: '', description: '', location: '', job_type: 'Full-time', salary_range: '', required_skills: '', preferred_skills: ''
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const refreshedPostingsResponse = await fetch(`/api/jobs?employer_id=${user.id}`);
        if (refreshedPostingsResponse.ok) {
          const refreshedData = await refreshedPostingsResponse.json();
          setPostings(refreshedData.jobs || []);
        }
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <EmployerLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Postings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and manage your job listings.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Post New Job
        </button>
      </div>

      <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
        {loading ? (
           <div className="py-12 text-center text-sm text-gray-500">Loading postings...</div>
        ) : postings.length === 0 ? (
           <div className="p-12 text-center">
             <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
               <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
               </svg>
             </div>
             <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No job postings yet</p>
             <p className="text-xs text-gray-500">Click &quot;Post New Job&quot; to get started.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-[#1A2030] border-b border-gray-200 dark:border-[#1E2536] text-gray-700 dark:text-gray-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Job Title</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Posted Date</th>
                  <th className="px-6 py-4">Applicants</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1E2536]">
                {postings.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{job.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${job.status === 'open' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                         {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(job.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">{job._count?.applications || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/employer/postings/${job.id}/applicants`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
                      >
                        View Applicants
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="bg-white dark:bg-[#131825] rounded-xl w-full max-w-2xl shadow-2xl my-auto">
            <div className="p-6 border-b border-gray-100 dark:border-[#1E2536] flex justify-between items-center sticky top-0 bg-white dark:bg-[#131825] rounded-t-xl z-10">
               <h2 className="text-xl font-bold text-gray-900 dark:text-white">Post New Job</h2>
               <button onClick={() => !creating && setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            
            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
               {createError && (
                 <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                   {createError}
                   {createError === 'Employer profile required' && (
                     <div className="mt-2">
                       <Link href="/employer/profile" className="font-semibold underline">
                         Complete your company profile first
                       </Link>
                     </div>
                   )}
                 </div>
               )}

               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                 <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white" />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                 <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location <span className="text-gray-400 font-normal">(Optional)</span></label>
                   <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Type</label>
                   <select value={formData.job_type} onChange={e => setFormData({...formData, job_type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white">
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                   </select>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Range <span className="text-gray-400 font-normal">(Optional)</span></label>
                 <input type="text" placeholder="e.g. $80,000 - $100,000" value={formData.salary_range} onChange={e => setFormData({...formData, salary_range: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white" />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required Skills <span className="text-gray-400 font-normal">(Comma separated)</span></label>
                 <input type="text" placeholder="e.g. React, Node.js, TypeScript" value={formData.required_skills} onChange={e => setFormData({...formData, required_skills: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white" />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Skills <span className="text-gray-400 font-normal">(Comma separated)</span></label>
                 <input type="text" placeholder="e.g. GraphQL, Docker" value={formData.preferred_skills} onChange={e => setFormData({...formData, preferred_skills: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white" />
               </div>

               <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#131825]">
                 <button type="button" onClick={() => setShowCreateModal(false)} disabled={creating} className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">Cancel</button>
                 <button type="submit" disabled={creating} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50">{creating ? 'Posting...' : 'Post Job'}</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
}
