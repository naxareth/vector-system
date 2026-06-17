'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/lib/supabaseClient';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  required_skills: string[];
  preferred_skills: string[];
  status: string;
  created_at: string;
  employer: {
    company_name: string;
    industry: string | null;
    company_size: string | null;
    website: string | null;
    logo_url: string | null;
    description: string | null;
  };
}

interface CVRExport {
  id: string;
  generated_at: string;
}

export default function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [job, setJob] = useState<JobPosting | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Application Modal State
  const [showModal, setShowModal] = useState(false);
  const [cvrExports, setCvrExports] = useState<CVRExport[]>([]);
  const [selectedCvr, setSelectedCvr] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error('Job not found');
      const data = await res.json();
      setJob(data);

      const matchRes = await fetch(`/api/jobs/match?jobId=${id}&ai=true`);
      if (matchRes.ok) {
        const mData = await matchRes.json();
        if (mData.matches && mData.matches.length > 0) {
          setMatchData(mData.matches[0]);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const loadCvrExports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('cvr_exports')
      .select('id, generated_at')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false });
    
    if (data) setCvrExports(data);
  };

  const handleApplyClick = () => {
    loadCvrExports();
    setShowModal(true);
  };

  const submitApplication = async () => {
    setApplying(true);
    setApplyError('');
    try {
      const res = await fetch(`/api/jobs/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvr_export_id: selectedCvr || null,
          cover_note: coverNote || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply');

      setApplySuccess(true);
      setTimeout(() => {
         setShowModal(false);
         router.push('/student/applications');
      }, 2000);
    } catch (e: any) {
      setApplyError(e.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center text-sm text-gray-500">Loading job details...</div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center text-red-500">{error || 'Job not found'}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/student/jobs" className="text-[#06B4C9] text-sm font-medium hover:underline inline-flex items-center gap-1 mb-4">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           Back to Jobs
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden">
            {matchData && (
              <div className="absolute top-0 right-0 bg-green-100 text-green-800 border-b border-l border-green-200 px-4 py-1.5 rounded-bl-xl font-bold text-sm flex items-center gap-1.5 shadow-sm">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {Math.round(matchData.matchScore * 100)}% Match
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2 mt-2">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
              <span className="flex items-center gap-1.5 font-medium">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                {job.employer.company_name}
              </span>
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {job.location}
                </span>
              )}
              {job.job_type && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {job.job_type}
                </span>
              )}
              {job.salary_range && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {job.salary_range}
                </span>
              )}
            </div>

            <div className="flex gap-3 mt-2">
               <button
                 onClick={handleApplyClick}
                 className="px-6 py-2 bg-[#06B4C9] hover:bg-[#059eb0] text-white font-semibold rounded-lg transition-colors"
               >
                 Apply Now
               </button>
            </div>
          </div>

          {matchData && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 border-l-4 border-l-[#06B4C9]">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Skills Gap Analysis
              </h2>
              
              {matchData.aiInsight && (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-5 leading-relaxed">
                  <strong>AI Insight:</strong> {matchData.aiInsight}
                </div>
              )}

              <div className="space-y-4">
                {matchData.missingSkills && matchData.missingSkills.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Missing Required Skills:</h3>
                    <ul className="space-y-2">
                      {matchData.missingSkills.map((skill: string) => (
                        <li key={skill} className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                          <span className="flex items-center gap-2 text-sm text-red-700 font-medium">
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            {skill}
                          </span>
                          <Link href={`/student/explore-courses?search=${encodeURIComponent(skill)}`} className="text-xs text-blue-600 font-semibold hover:underline">
                            Learn this &rarr;
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    You have all the required skills for this role!
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Job Description</h2>
             <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
               {job.description}
             </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Required Skills</h2>
             <div className="flex flex-wrap gap-2 mb-6">
                {job.required_skills.map(skill => (
                   <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200">
                     {skill}
                   </span>
                ))}
                {job.required_skills.length === 0 && <span className="text-sm text-gray-500">Not specified</span>}
             </div>

             <h2 className="text-lg font-bold text-gray-900 mb-4">Preferred Skills</h2>
             <div className="flex flex-wrap gap-2">
                {job.preferred_skills.map(skill => (
                   <span key={skill} className="px-3 py-1 bg-gray-50 text-gray-500 text-sm rounded-full border border-gray-100">
                     {skill}
                   </span>
                ))}
                {job.preferred_skills.length === 0 && <span className="text-sm text-gray-500">Not specified</span>}
             </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">About the Employer</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
                 {job.employer.company_name.charAt(0)}
              </div>
              <div>
                 <p className="font-semibold text-gray-900">{job.employer.company_name}</p>
                 {job.employer.industry && <p className="text-xs text-gray-500">{job.employer.industry}</p>}
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-gray-600 mt-6">
               {job.employer.company_size && (
                 <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 w-24">Size:</span>
                    <span>{job.employer.company_size}</span>
                 </div>
               )}
               {job.employer.website && (
                 <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 w-24">Website:</span>
                    <a href={job.employer.website.startsWith('http') ? job.employer.website : `https://${job.employer.website}`} target="_blank" rel="noreferrer" className="text-[#06B4C9] hover:underline truncate">
                       {job.employer.website}
                    </a>
                 </div>
               )}
            </div>

            {job.employer.description && (
               <p className="text-xs text-gray-500 mt-4 leading-relaxed line-clamp-4">
                 {job.employer.description}
               </p>
            )}
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h2 className="text-xl font-bold text-gray-900">Apply for {job.title}</h2>
               <button onClick={() => !applying && setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className="p-6 space-y-4">
               {applySuccess ? (
                 <div className="p-4 bg-green-50 text-green-700 rounded-lg text-center border border-green-200">
                   <svg className="w-10 h-10 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <p className="font-bold">Application Submitted Successfully!</p>
                   <p className="text-sm mt-1">Redirecting to your applications...</p>
                 </div>
               ) : (
                 <>
                   {applyError && (
                     <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                       {applyError}
                     </div>
                   )}
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attach Vector Resume (CVR) <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <select 
                        value={selectedCvr} 
                        onChange={e => setSelectedCvr(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#06B4C9] focus:border-[#06B4C9] text-sm"
                      >
                         <option value="">-- Do not attach CVR --</option>
                         {cvrExports.map(cvr => (
                            <option key={cvr.id} value={cvr.id}>
                               CVR Export - {new Date(cvr.generated_at).toLocaleString()}
                            </option>
                         ))}
                      </select>
                      {cvrExports.length === 0 && (
                        <p className="text-xs text-orange-500 mt-1">You haven&apos;t generated any CVRs yet.</p>
                      )}
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cover Note <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <textarea 
                        value={coverNote}
                        onChange={e => setCoverNote(e.target.value)}
                        rows={4}
                        placeholder="Why are you a great fit for this role?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#06B4C9] focus:border-[#06B4C9] text-sm"
                      />
                   </div>
                 </>
               )}
            </div>
            {!applySuccess && (
               <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                  <button 
                    onClick={() => setShowModal(false)}
                    disabled={applying}
                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                  >
                     Cancel
                  </button>
                  <button 
                    onClick={submitApplication}
                    disabled={applying}
                    className="px-6 py-2 bg-[#06B4C9] hover:bg-[#059eb0] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                     {applying ? 'Submitting...' : 'Submit Application'}
                  </button>
               </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
