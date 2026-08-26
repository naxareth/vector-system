'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import EmployerLayout from '@/components/dashboard/EmployerLayout';
import StatusDropdown from '@/components/dashboard/StatusDropdown';
import ResumeDocumentRenderer from '@/components/cvr/ResumeDocumentRenderer';
import { CVRData } from '@/lib/schemas/cvr';

interface ApplicantData {
  application: {
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
  };
  jobTitle: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  isVerified: boolean;
  cvrExport: {
    id: string;
    template: string | null;
    credential_ids: string[];
    snapshot: CVRData;
    generated_at: string;
  } | null;
}

export default function ApplicantResumePage({
  params
}: {
  params: Promise<{ id: string; appId: string }>;
}) {
  const { id, appId } = use(params);
  const [data, setData] = useState<ApplicantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchApplicantResume = async () => {
      try {
        const res = await fetch(`/api/jobs/${id}/applicants/${appId}`);
        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Failed to load applicant data');
        } else {
          const result = await res.json();
          setData(result);
        }
      } catch (e) {
        console.error(e);
        setError('Network error loading applicant resume');
      } finally {
        setLoading(false);
      }
    };
    fetchApplicantResume();
  }, [id, appId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!data) return;
    setUpdatingStatus(true);
    try {
      const csrfToken =
        typeof document !== 'undefined'
          ? document.cookie
              .split('; ')
              .find((row) => row.startsWith('vector-csrf-token='))
              ?.split('=')[1] || ''
          : '';

      const res = await fetch(`/api/jobs/${id}/applicants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ application_id: appId, status: newStatus }),
      });

      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                application: { ...prev.application, status: newStatus },
              }
            : null
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getTemplateLabel = (tpl?: string | null) => {
    switch (tpl) {
      case 'modern':
        return 'Modern Dark';
      case 'simple':
        return 'Technical Mono';
      case 'two-column':
        return 'Two-Column Split';
      default:
        return 'ATS Minimal';
    }
  };

  if (loading) {
    return (
      <EmployerLayout>
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#06B4C9] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading applicant resume...</p>
        </div>
      </EmployerLayout>
    );
  }

  if (error || !data) {
    return (
      <EmployerLayout>
        <div className="max-w-xl mx-auto py-12 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Resume Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || 'Unable to retrieve resume details.'}</p>
          <Link
            href={`/employer/postings/${id}/applicants`}
            className="px-4 py-2 bg-[#06B4C9] text-white font-medium rounded-lg hover:bg-[#06B4C9]/90 transition-colors text-sm"
          >
            Back to Applicants
          </Link>
        </div>
      </EmployerLayout>
    );
  }

  const { application, jobTitle, matchScore, matchedSkills, isVerified, cvrExport } = data;
  const matchPct = Math.round(matchScore * 100);

  return (
    <EmployerLayout>
      {/* Top Header & Actions */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <Link
            href={`/employer/postings/${id}/applicants`}
            className="text-sm font-medium text-blue-600 dark:text-[#06B4C9] hover:underline flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Applicants
          </Link>

          {cvrExport && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-[#1E2536] text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-[#283042] transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Resume
              </button>
              <Link
                href={`/verify/cvr/${cvrExport.id}`}
                target="_blank"
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/30 rounded-lg hover:bg-[#06B4C9]/20 transition-colors flex items-center gap-1.5"
              >
                Public Verification Portal
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Applicant Overview Banner */}
        <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {application.student.full_name}
                </h1>
                {isVerified && (
                  <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 px-2 py-0.5 rounded-full font-semibold">
                    ✓ Verified Credentials
                  </span>
                )}
                {cvrExport && (
                  <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                    {getTemplateLabel(cvrExport.template)} Format
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Applied for <span className="font-semibold text-gray-700 dark:text-gray-300">{jobTitle}</span> on{' '}
                {new Date(application.applied_at).toLocaleDateString()}
              </p>
            </div>

            {/* Right side: Match score & Status Selector */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] uppercase font-semibold tracking-wider text-gray-400">Skill Match</p>
                <span
                  className={`inline-block px-3 py-1 mt-0.5 text-sm font-extrabold rounded-full ${
                    matchScore >= 0.7
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                      : matchScore >= 0.3
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {matchPct}% Match
                </span>
              </div>

              <div className="border-l border-gray-200 dark:border-[#283042] pl-4">
                <p className="text-[11px] uppercase font-semibold tracking-wider text-gray-400 mb-1">Status</p>
                <StatusDropdown
                  value={application.status}
                  disabled={updatingStatus}
                  onChange={(newStatus) => handleStatusChange(newStatus)}
                />
              </div>
            </div>
          </div>

          {/* Matched skills summary */}
          {matchedSkills.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#1E2536] flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-500 font-medium">Matched Required Skills:</span>
              {matchedSkills.map((s, i) => (
                <span
                  key={i}
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded text-[11px] font-semibold"
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          )}

          {application.cover_note && (
            <div className="mt-3 text-xs bg-gray-50 dark:bg-[#0E1220] p-3 rounded-lg border border-gray-100 dark:border-[#1E2536]">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Cover Note: </span>
              <span className="text-gray-600 dark:text-gray-400">{application.cover_note}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Resume Paper Display Container */}
      {cvrExport && cvrExport.snapshot ? (
        <div className="py-6 bg-gray-100 dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-[#1E2536] overflow-x-auto">
          <div className="mx-auto max-w-[850px]">
            <div className="bg-white text-gray-900 shadow-2xl rounded-md overflow-hidden min-h-[1000px]">
              <ResumeDocumentRenderer data={cvrExport.snapshot} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl p-12 text-center max-w-lg mx-auto my-8">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Standard Application Submitted</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This applicant submitted a general profile application without attaching a specific CVR template snapshot.
          </p>
        </div>
      )}
    </EmployerLayout>
  );
}
