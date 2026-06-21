'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

interface VerifiedCredential {
  id: string;
  skill_name: string;
  issued_at?: string;
  certificate_number?: string;
  credential_data?: Record<string, unknown>;
}

interface Submission {
  id: string;
  file_name: string;
  extracted_data?: Record<string, unknown>;
  status: string;
  fraud_score?: number;
  reviewer_notes?: string;
  created_at: string;
}

export default function CredentialsPage() {
  const [verified, setVerified] = useState<VerifiedCredential[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [vRes, sRes] = await Promise.all([
          fetch('/api/student/credentials'),
          fetch('/api/credentials/submissions')
        ]);
        
        if (vRes.ok) {
          const vData = await vRes.json();
          // Map or filter verified data
          setVerified(vData);
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          setSubmissions(sData);
        }
      } catch (err) {
        console.error('Error fetching credentials data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-full text-xs font-semibold">Pending AI Review</span>;
      case 'ai_reviewed': return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full text-xs font-semibold">Under Review</span>;
      case 'approved': return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full text-xs font-semibold">Approved</span>;
      case 'rejected': return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-full text-xs font-semibold">Rejected</span>;
      default: return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-1 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">My Credentials</h1>
          <p className="text-sm text-[#94A3B8]">Manage your verified skills and pending submissions</p>
        </div>
        <Link 
          href="/student/credentials/upload" 
          className="bg-[#06B4C9] hover:bg-[#0598A9] text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload New Credential
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-[#131825] rounded-xl animate-pulse"></div>
          <div className="h-32 bg-[#131825] rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Section 1: Verified Credentials */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Verified Credentials</h2>
            {verified.length === 0 ? (
              <div className="bg-[#131825] border border-[#1E2536] rounded-xl p-8 text-center">
                <p className="text-[#94A3B8]">No verified credentials yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {verified.map((cred) => (
                  <div key={cred.id} className="bg-[#131825] border border-[#1E2536] rounded-xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                      <div className="bg-green-500/20 text-green-400 p-1 rounded-full">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 truncate pr-8">{cred.skill_name}</h3>
                    {cred.credential_data?.institution_name && (
                      <p className="text-sm text-[#94A3B8] mb-3 truncate">{cred.credential_data.institution_name}</p>
                    )}
                    <div className="text-xs text-[#64748B] flex flex-col gap-1">
                      {cred.issued_at && <span>Issued: {new Date(cred.issued_at).toLocaleDateString()}</span>}
                      {cred.certificate_number && <span>ID: {cred.certificate_number}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Pending Submissions */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Pending Submissions</h2>
            {submissions.length === 0 ? (
              <div className="bg-[#131825] border border-[#1E2536] rounded-xl p-8 text-center">
                <p className="text-[#94A3B8]">No pending submissions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-[#131825] border border-[#1E2536] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">
                          {sub.extracted_data?.credential_type || 'Credential Document'}
                        </h3>
                        {getStatusBadge(sub.status)}
                      </div>
                      <p className="text-sm text-[#94A3B8] truncate mb-1">
                        {sub.extracted_data?.institution_name || sub.file_name}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Submitted: {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                      
                      {sub.status === 'rejected' && sub.reviewer_notes && (
                        <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                          <strong>Rejection Reason:</strong> {sub.reviewer_notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
