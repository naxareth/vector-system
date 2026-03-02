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
    transactionHash: string | null;
  };
  student: {
    fullName: string;
    // 🛡️ studentId removed — no longer returned by API (Checkpoint #2 PII redaction)
    walletAddress: string | null;
  };
  issuedBy: {
    batchName: string | null;
    registrarName: string | null;
  };
  onChain: {
    verified: boolean;
    balance: number | null;
    tokenId: string | null;
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
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Verifying credential on-chain…</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Credential Not Found</h1>
          <p className="text-gray-500 text-sm">{error || 'This credential link is invalid or has been removed.'}</p>
          <a href="/" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">← Return to VECTOR</a>
        </div>
      </div>
    );
  }

  const { credential, student, issuedBy, onChain } = result;
  const isVerified = onChain.verified;
  const polygonscanUrl = credential.transactionHash
    ? `https://amoy.polygonscan.com/tx/${credential.transactionHash}`
    : null;

  // ---------------------------------------------------------------------------
  // Verified page
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
            <span className="text-slate-500 text-sm">Credential Verification</span>
          </div>
          <span className="text-xs text-slate-400">Public Verification Portal</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Status Banner */}
        <div className={`rounded-2xl p-6 flex items-start gap-5 shadow-sm border ${isVerified
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
          }`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isVerified ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
            {isVerified ? (
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
            <h1 className={`text-lg font-bold mb-1 ${isVerified ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isVerified ? 'Credential Verified on Polygon Amoy' : 'Chain Status Unavailable'}
            </h1>
            <p className={`text-sm ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isVerified
                ? `Token #${onChain.tokenId} confirmed in wallet. This credential is authentic and tamper-proof.`
                : onChain.error || 'The on-chain status could not be confirmed at this time.'}
            </p>
          </div>
        </div>

        {/* Credential Details Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest mb-1">Verified Skill Credential</p>
            <h2 className="text-2xl font-bold text-white">{credential.skillName}</h2>
            {credential.certificateNumber && (
              <p className="text-indigo-300 text-xs mt-1">#{credential.certificateNumber}</p>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Student */}
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Awarded To</p>
              <p className="font-semibold text-slate-800">{student.fullName}</p>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Issue Date</p>
              <p className="font-semibold text-slate-800">
                {credential.issuedAt ? formatDate(credential.issuedAt) : '—'}
              </p>
            </div>

            {/* Issuer */}
            {(issuedBy.registrarName || issuedBy.batchName) && (
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Issued By</p>
                {issuedBy.registrarName && (
                  <p className="font-semibold text-slate-800">{issuedBy.registrarName}</p>
                )}
                {issuedBy.batchName && (
                  <p className="text-sm text-slate-500">{issuedBy.batchName}</p>
                )}
              </div>
            )}

            {/* Wallet */}
            {student.walletAddress && (
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Student Wallet</p>
                <p className="font-mono text-sm text-slate-700 break-all">
                  {truncate(student.walletAddress)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* On-Chain Details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
              <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
              <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
            </svg>
            Blockchain Record
          </h3>

          <div className="space-y-3">
            {/* Token ID */}
            {onChain.tokenId && (
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">Token ID</span>
                <span className="font-mono text-sm text-slate-800">#{onChain.tokenId}</span>
              </div>
            )}

            {/* Transaction hash */}
            {credential.transactionHash && (
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">Transaction</span>
                <a
                  href={polygonscanUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  {truncate(credential.transactionHash)}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Issuer DID */}
            {credential.issuerDid && (
              <div className="flex items-start justify-between py-2 border-b border-slate-50 gap-4">
                <span className="text-sm text-slate-500 flex-shrink-0">Issuer DID</span>
                <span className="font-mono text-xs text-slate-600 text-right break-all">{credential.issuerDid}</span>
              </div>
            )}

            {/* Network */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Network</span>
              <span className="flex items-center gap-1.5 text-sm text-slate-800">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                Polygon Amoy Testnet
              </span>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Share This Credential</h3>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex-shrink-0">
                <img
                  src={qrDataUrl}
                  alt="QR code for this credential"
                  className="w-32 h-32 rounded-xl border border-slate-100"
                />
                <p className="text-xs text-slate-400 mt-1 text-center">Scan to verify</p>
              </div>
            )}

            {/* Copy link */}
            <div className="flex-1 space-y-3">
              <p className="text-sm text-slate-500">
                Share this link with employers or institutions to instantly verify this credential.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 pb-6">
          Verified by VECTOR · Powered by Polygon Amoy · This page is publicly accessible
        </p>
      </main>
    </div>
  );
}