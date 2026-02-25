'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OnChain {
  verified: boolean;
  balance: number | null;
  error: string | null;
}

interface VerifiedCredential {
  id: string;
  skillName: string;
  tokenId: string;
  transactionHash: string | null;
  issuedAt: string;
  certificateNumber: string | null;
  batchName: string | null;
  registrarName: string | null;
  onChain: OnChain;
}

interface CVRVerificationResult {
  cvrExport: {
    id: string;
    generatedAt: string;
    template: string | null;
  };
  student: {
    fullName: string;
    studentId: string | null;
    walletAddress: string | null;
  };
  credentials: VerifiedCredential[];
  snapshot: any;
  isLatest: boolean;
  newerExportDate: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function truncate(str: string, start = 6, end = 4) {
  if (!str || str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function VerifyCVRPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<CVRVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/verify/cvr/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setResult(data);
      })
      .catch(() => setError('Failed to connect to verification service.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(console.error);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Verifying resume on-chain…</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-100 shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">CVR Not Found</h1>
          <p className="text-gray-500 text-sm">{error || 'This CVR link is invalid or has been removed.'}</p>
          <a href="/" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">← Return to VECTOR</a>
        </div>
      </div>
    );
  }

  const { cvrExport, student, credentials, snapshot, isLatest, newerExportDate } = result;
  const allVerified = credentials.length > 0 && credentials.every((c) => c.onChain.verified);
  const someVerified = credentials.some((c) => c.onChain.verified);
  const polygonscanBase = 'https://amoy.polygonscan.com/tx/';

  const snapshotSkills: any[] = snapshot?.skills || [];
  const verifiedSkillNames = new Set(credentials.map((c) => c.skillName.toLowerCase()));
  const unverifiedSnapshotSkills = snapshotSkills.filter(
    (s) => !s.verified && !verifiedSkillNames.has(s.name.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-sm">VECTOR</span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-slate-500 text-sm">CVR Verification</span>
          </div>
          <span className="text-xs text-slate-400">Public Verification Portal</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ⚠️ Outdated warning — visible to employers scanning an old PDF */}
        {!isLatest && newerExportDate && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex gap-4 items-start shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-800 text-sm">This is not the most recent resume</p>
              <p className="text-amber-700 text-xs mt-1">
                {student.fullName} generated a newer version on{' '}
                <strong>{formatDateTime(newerExportDate)}</strong>.
                Ask them to share their latest CVR link for the most up-to-date credentials.
              </p>
            </div>
          </div>
        )}

        {/* ✅ Latest confirmation */}
        {isLatest && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 items-center shadow-sm">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-emerald-800 text-sm font-medium">
              This is the most recent resume from {student.fullName}.
            </p>
          </div>
        )}

        {/* Credential status banner */}
        <div className={`rounded-2xl p-6 flex items-start gap-5 shadow-sm border ${
          allVerified ? 'bg-emerald-50 border-emerald-200'
          : someVerified ? 'bg-blue-50 border-blue-200'
          : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
            allVerified ? 'bg-emerald-100' : someVerified ? 'bg-blue-100' : 'bg-amber-100'
          }`}>
            {allVerified ? (
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <h1 className={`text-lg font-bold mb-1 ${allVerified ? 'text-emerald-800' : someVerified ? 'text-blue-800' : 'text-amber-800'}`}>
              {allVerified ? 'All Credentials Verified on Polygon Amoy'
               : someVerified ? 'Partially Verified — Some credentials confirmed on-chain'
               : credentials.length === 0 ? 'No Blockchain Credentials on this Resume'
               : 'Chain Status Unavailable'}
            </h1>
            <p className={`text-sm ${allVerified ? 'text-emerald-600' : someVerified ? 'text-blue-600' : 'text-amber-600'}`}>
              {credentials.length} blockchain credential{credentials.length !== 1 ? 's' : ''} included •
              Generated {formatDate(cvrExport.generatedAt)}
            </p>
          </div>
        </div>

        {/* Student identity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest mb-1">Credential Verified Resume</p>
            <h2 className="text-2xl font-bold text-white">{student.fullName}</h2>
            {snapshot?.title && <p className="text-indigo-300 text-sm mt-1">{snapshot.title}</p>}
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {student.studentId && (
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Student ID</p>
                <p className="font-semibold text-slate-800">{student.studentId}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Export Date</p>
              <p className="font-semibold text-slate-800">{formatDate(cvrExport.generatedAt)}</p>
            </div>
            {student.walletAddress && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Wallet Address</p>
                <p className="font-mono text-sm text-slate-700">{truncate(student.walletAddress, 10, 6)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Credentials on this resume */}
        {credentials.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                </svg>
                Credentials on this Resume ({credentials.length})
              </h3>
              <span className="text-xs text-slate-400">Selected by student</span>
            </div>
            <div className="divide-y divide-slate-50">
              {credentials.map((cred) => (
                <div key={cred.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cred.onChain.verified ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <p className="font-semibold text-slate-800">{cred.skillName}</p>
                      {cred.onChain.verified && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ On-Chain
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 ml-4">
                      {cred.issuedAt && <span>Issued {formatDate(cred.issuedAt)}</span>}
                      {cred.registrarName && <span>By {cred.registrarName}</span>}
                      {cred.batchName && <span>{cred.batchName}</span>}
                      {cred.tokenId && <span className="font-mono">Token #{cred.tokenId}</span>}
                    </div>
                  </div>
                  {cred.transactionHash && (
                    <a
                      href={`${polygonscanBase}${cred.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-mono"
                    >
                      {truncate(cred.transactionHash)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Self-reported skills */}
        {unverifiedSnapshotSkills.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Additional Skills on Resume</h3>
            <p className="text-xs text-slate-400 mb-4">Self-reported by student — not blockchain verified</p>
            <div className="flex flex-wrap gap-2">
              {unverifiedSnapshotSkills.map((skill: any, i: number) => (
                <span key={i} className="px-3 py-1 rounded-full text-sm font-medium border bg-slate-50 text-slate-600 border-slate-200">
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* No credentials note */}
        {credentials.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">No blockchain credentials on this resume</p>
              <p className="text-xs text-amber-600 mt-0.5">The student may hold verified credentials that were not included in this particular export.</p>
            </div>
          </div>
        )}

        {/* Network info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full" />
            Network
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Blockchain</span>
              <span className="text-slate-800 font-medium">Polygon Amoy Testnet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">CVR Export ID</span>
              <span className="font-mono text-xs text-slate-600">{truncate(cvrExport.id, 8, 8)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Resume Status</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isLatest
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isLatest ? 'Latest Version' : 'Outdated Version'}
              </span>
            </div>
          </div>
        </div>

        {/* Share section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Share This Resume</h3>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {qrDataUrl && (
              <div className="flex-shrink-0">
                <img src={qrDataUrl} alt="QR code" className="w-32 h-32 rounded-xl border border-slate-100" />
                <p className="text-xs text-slate-400 mt-1 text-center">Scan to verify</p>
              </div>
            )}
            <div className="flex-1 space-y-3">
              <p className="text-sm text-slate-500">Share this link with employers to instantly verify all credentials on this resume.</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-6">
          Verified by VECTOR · Powered by Polygon Amoy · This page is publicly accessible
        </p>
      </main>
    </div>
  );
}