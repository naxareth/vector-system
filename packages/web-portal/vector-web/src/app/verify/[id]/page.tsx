'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VerificationResult {
  credential: {
    id: string;
    skillName: string;
    issuedAt: string;
    certificateNumber: string | null;
    issuerDid: string | null;
    schemaUrl: string | null;
  };
  student: {
    fullName: string;
  };
  issuedBy: {
    batchName: string | null;
    registrarName: string | null;
  };
  verification: {
    verified: boolean;
    error: string | null;
  };
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Fetch verification data
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/verify/${id}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Credential not found.'); return; }
        setResult(data);
      } catch {
        setError('Failed to connect to verification service.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Generate QR code for this page's URL
  useEffect(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: '#06B4C9', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(console.error);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#06B4C9] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#94A3B8] text-sm">Verifying credential…</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !result) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center px-4">
        <div className="bg-[#131825] rounded-2xl border border-[#1E2536] shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Credential Not Found</h1>
          <p className="text-[#94A3B8] text-sm">{error || 'This credential link is invalid or has been removed.'}</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="mt-6 inline-block text-sm text-[#06B4C9] hover:underline">← Return to VECTOR</a>
        </div>
      </div>
    );
  }

  const { credential, student, issuedBy, verification } = result;
  const isVerified = verification.verified;

  // ---------------------------------------------------------------------------
  // Verified page
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0B0F19]">
      {/* Header */}
      <header className="border-b border-[#1E2536] bg-[#0E1220]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#06B4C9] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">VECTOR</span>
            <span className="text-[#283042] text-sm">/</span>
            <span className="text-[#94A3B8] text-sm">Credential Verification</span>
          </div>
          <span className="text-xs text-[#64748B]">Public Verification Portal</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Status Banner */}
        <div className={`rounded-xl p-6 flex items-start gap-5 border ${isVerified
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
          }`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isVerified ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            }`}>
            {isVerified ? (
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <h1 className={`text-lg font-bold mb-1 ${isVerified ? 'text-emerald-300' : 'text-amber-300'}`}>
              {isVerified ? 'Credential Verified by Institution' : 'Verification Unavailable'}
            </h1>
            <p className={`text-sm ${isVerified ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
              {isVerified
                ? `This credential is authentic and confirmed by the issuing institution's database.`
                : verification.error || 'The verification status could not be confirmed at this time.'}
            </p>
          </div>
        </div>

        {/* Credential Details Card */}
        <div className="bg-[#131825] rounded-xl border border-[#1E2536] overflow-hidden">
          <div className="bg-gradient-to-r from-[#06B4C9]/20 to-[#0E1220] px-6 py-5 border-b border-[#1E2536]">
            <p className="text-[#06B4C9] text-xs font-medium uppercase tracking-widest mb-1">Verified Skill Credential</p>
            <h2 className="text-2xl font-bold text-white">{credential.skillName}</h2>
            {credential.certificateNumber && (
              <p className="text-[#94A3B8] text-xs mt-1">#{credential.certificateNumber}</p>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Student */}
            <div className="space-y-1">
              <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Awarded To</p>
              <p className="font-semibold text-[#E2E8F0]">{student.fullName}</p>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Issue Date</p>
              <p className="font-semibold text-[#E2E8F0]">
                {credential.issuedAt ? formatDate(credential.issuedAt) : '—'}
              </p>
            </div>

            {/* Issuer */}
            {(issuedBy.registrarName || issuedBy.batchName) && (
              <div className="space-y-1">
                <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Issued By</p>
                {issuedBy.registrarName && (
                  <p className="font-semibold text-[#E2E8F0]">{issuedBy.registrarName}</p>
                )}
                {issuedBy.batchName && (
                  <p className="text-sm text-[#94A3B8]">{issuedBy.batchName}</p>
                )}
              </div>
            )}


          </div>
        </div>



        {/* Share Section */}
        <div className="bg-[#131825] rounded-xl border border-[#1E2536] p-6">
          <h3 className="font-semibold text-[#E2E8F0] mb-4">Share This Credential</h3>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR code for this credential"
                  className="w-32 h-32 rounded-xl border border-[#1E2536]"
                />
                <p className="text-xs text-[#64748B] mt-1 text-center">Scan to verify</p>
              </div>
            )}

            {/* Copy link */}
            <div className="flex-1 space-y-3">
              <p className="text-sm text-[#94A3B8]">
                Share this link with employers or institutions to instantly verify this credential.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 text-xs px-3 py-2 bg-[#0B0F19] border border-[#283042] rounded-lg text-[#94A3B8] font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#06B4C9] hover:bg-[#06B4C9]/80 text-white'
                    }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#64748B] pb-6">
          Verified by VECTOR · This page is publicly accessible
        </p>
      </main>
    </div>
  );
}