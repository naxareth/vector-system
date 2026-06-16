'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  required_skills: string[];
  created_at: string;
  employer: {
    company_name: string;
    logo_url: string | null;
  };
}

export default function JobBoard() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const JOBS_PER_PAGE = 20;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('location', search); // Example: search by location
      params.set('page', page.toString());
      params.set('limit', JOBS_PER_PAGE.toString());

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / JOBS_PER_PAGE)));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function Pagination() {
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

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/student/dashboard" className="hover:text-[#06B4C9] transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">Job Board</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Job Board</h1>
          <p className="text-sm text-gray-400 mt-0.5">Discover roles matching your verified skills.</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by location..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B4C9] placeholder:text-gray-400 bg-white"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">No jobs found matching your criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-600 mt-0.5">
                       {job.employer.company_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{job.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {job.employer.company_name}
                        </span>
                        {job.job_type && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                            {job.job_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {job.location && (
                      <span className="flex-shrink-0 text-xs font-medium text-gray-500">{job.location}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {job.required_skills.slice(0, 5).map(tag => (
                    <span key={tag} className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50">
                      {tag}
                    </span>
                  ))}
                  {job.required_skills.length > 5 && (
                    <span className="text-xs text-gray-400 px-1 py-0.5">+{job.required_skills.length - 5}</span>
                  )}
                </div>

                <div className="flex justify-between items-center mt-auto pt-2">
                   <span className="text-[10px] text-gray-400">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                   </span>
                  <Link
                    href={`/student/jobs/${job.id}`}
                    className="text-xs font-semibold text-[#06B4C9] border border-[#06B4C9]/20 rounded-lg px-3 py-1.5 hover:bg-[#06B4C9]/5 transition-colors inline-flex items-center gap-1"
                  >
                    View Details
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination />
        </>
      )}
    </DashboardLayout>
  );
}
