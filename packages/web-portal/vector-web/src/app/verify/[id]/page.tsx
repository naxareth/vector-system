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
function formatDate(iso: string) {
  // Uses the visitor's own locale instead of a fixed en-US format,
  // so an employer viewing this outside the US sees a date order they recognize.
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B4C9] focus-visible:ring-offset-2';

// This page is public and sits outside the authenticated app, so its
// light/dark choice is computed directly from local state rather than
// Tailwind's `dark:` variant — the app's <html> element already carries a
// permanent `dark` class from the internal ThemeContext, which would make
// `dark:` styles apply everywhere regardless of what a visitor here picks.
function useVerifyTheme() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vector-verify-theme') : null;
    if (saved === 'light' || saved === 'dark') {
      setIsDark(saved === 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('vector-verify-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const t = isDark
    ? {
      bg: 'bg-[#0B0F19]',
      headerBg: 'bg-[#0E1220]/80',
      border: 'border-[#1E2536]',
      borderSubtle: 'border-[#1E2536]',
      card: 'bg-[#131825]',
      cardMuted: 'bg-black/10',
      text: 'text-white',
      textMuted: 'text-[#CBD5E1]',
      textFaint: 'text-[#94A3B8]',
      textFainter: 'text-[#64748B]',
      inputBg: 'bg-[#0B0F19]',
      inputBorder: 'border-[#283042]',
      hoverBg: 'hover:bg-[#1E2536]',
      ringOffset: 'focus-visible:ring-offset-[#0B0F19]',
      pillVerifiedBg: 'bg-emerald-500/10',
      pillVerifiedText: 'text-emerald-300',
      pillVerifiedBorder: 'border-emerald-500/30',
      pillUnverifiedBg: 'bg-amber-500/10',
      pillUnverifiedText: 'text-amber-300',
      pillUnverifiedBorder: 'border-amber-500/30',
      unverifiedNote: 'text-amber-400/80',
      copiedBg: 'bg-emerald-500/20',
      copiedText: 'text-emerald-400',
      copiedBorder: 'border-emerald-500/30',
      errorIconBg: 'bg-red-500/10',
      errorIconText: 'text-red-400',
    }
    : {
      bg: 'bg-slate-50',
      headerBg: 'bg-white/80',
      border: 'border-slate-200',
      borderSubtle: 'border-slate-100',
      // Plain `bg-white` is globally overridden to a dark navy by this app's
      // legacy .dark-scope shim in globals.css, and <html> always carries
      // that `dark` class — so the light card uses an equivalent hex value
      // that isn't targeted by that override instead.
      card: 'bg-[#ffffff]',
      cardMuted: 'bg-slate-50',
      text: 'text-slate-900',
      textMuted: 'text-slate-600',
      textFaint: 'text-slate-500',
      textFainter: 'text-slate-400',
      inputBg: 'bg-slate-50',
      inputBorder: 'border-slate-200',
      hoverBg: 'hover:bg-slate-100',
      ringOffset: 'focus-visible:ring-offset-white',
      pillVerifiedBg: 'bg-emerald-50',
      pillVerifiedText: 'text-emerald-700',
      pillVerifiedBorder: 'border-emerald-200',
      pillUnverifiedBg: 'bg-amber-50',
      pillUnverifiedText: 'text-amber-700',
      pillUnverifiedBorder: 'border-amber-200',
      unverifiedNote: 'text-amber-700',
      copiedBg: 'bg-emerald-50',
      copiedText: 'text-emerald-700',
      copiedBorder: 'border-emerald-200',
      errorIconBg: 'bg-red-50',
      errorIconText: 'text-red-500',
    };

  return { isDark, toggle, t };
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
  const { isDark, toggle, t } = useVerifyTheme();
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

  const ThemeToggle = () => (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`w-11 h-11 flex items-center justify-center rounded-lg border ${t.border} ${t.textFaint} ${t.hoverBg} transition-colors ${focusRing} ${t.ringOffset}`}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
        <div className="text-center" role="status" aria-live="polite">
          <div className="w-12 h-12 border-4 border-[#06B4C9] border-t-transparent rounded-full animate-spin motion-reduce:animate-none mx-auto mb-4" />
          <p className={`${t.textFaint} text-sm`}>Verifying credential…</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !result) {
    return (
      <div className={`min-h-screen ${t.bg} flex items-center justify-center px-4`}>
        <div className={`${t.card} rounded-2xl border ${t.border} shadow-xl p-10 max-w-md w-full text-center`}>
          <div className={`w-16 h-16 ${t.errorIconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className={`w-8 h-8 ${t.errorIconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className={`text-xl font-bold ${t.text} mb-2`}>Credential Not Found</h1>
          <p className={`${t.textFaint} text-sm`}>{error || 'This credential link is invalid or has been removed.'}</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={`mt-6 inline-block text-sm text-[#06B4C9] hover:underline rounded ${focusRing} ${t.ringOffset}`}>← Return to VECTOR</a>
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
    <div className={`min-h-screen ${t.bg}`}>
      {/* Skip link — first thing a keyboard/screen-reader user encounters */}
      <a
        href="#credential-details"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#06B4C9] focus:text-white focus:text-sm focus:font-medium"
      >
        Skip to credential details
      </a>

      {/* Header */}
      <header className={`border-b ${t.border} ${t.headerBg} backdrop-blur-sm sticky top-0 z-10`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-[#06B4C9] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className={`font-bold ${t.text} text-sm truncate`}>VECTOR</span>
            <span className={`${t.textFainter} text-sm hidden sm:inline`}>/</span>
            <span className={`${t.textFaint} text-sm hidden sm:inline truncate`}>Credential Verification</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-xs ${t.textFainter} hidden md:inline`}>Public Verification Portal</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="credential-details" className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Verified pill — small and immediate, instead of a full-width banner competing with the card below */}
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${isVerified
            ? `${t.pillVerifiedBg} ${t.pillVerifiedText} ${t.pillVerifiedBorder}`
            : `${t.pillUnverifiedBg} ${t.pillUnverifiedText} ${t.pillUnverifiedBorder}`
            }`}
        >
          {isVerified ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {isVerified ? 'Verified by Institution' : 'Verification Unavailable'}
        </div>
        {!isVerified && (
          <p className={`text-sm ${t.unverifiedNote} -mt-4`}>
            {verification.error || 'The verification status could not be confirmed at this time.'}
          </p>
        )}

        {/* Primary card — one clear reading order: what → who → when/by, not four equal-weight boxes */}
        <div className={`${t.card} rounded-xl border ${t.border} overflow-hidden`}>
          <div className={`px-6 sm:px-8 pt-8 pb-6 text-center border-b ${t.borderSubtle}`}>
            <p className="text-[#06B4C9] text-xs font-semibold uppercase tracking-widest mb-2">Verified Skill Credential</p>
            <h1 className={`text-3xl font-bold ${t.text} leading-tight`}>{credential.skillName}</h1>
            <p className={`mt-3 text-lg ${t.textMuted}`}>
              Issued to <span className={`font-bold ${t.text}`}>{student.fullName}</span>
            </p>
            {credential.certificateNumber && (
              <p className={`${t.textFainter} text-xs mt-2`}>#{credential.certificateNumber}</p>
            )}
          </div>

          {/* Secondary metadata — deliberately smaller and quieter than the headline above */}
          <div className={`px-6 sm:px-8 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm ${t.textFaint} ${t.cardMuted}`}>
            <span>
              <span className={t.textFainter}>Issued</span>{' '}
              {credential.issuedAt ? formatDate(credential.issuedAt) : '—'}
            </span>
            {issuedBy.registrarName && (
              <span>
                <span className={t.textFainter}>By</span> {issuedBy.registrarName}
              </span>
            )}
            {issuedBy.batchName && (
              <span>
                <span className={t.textFainter}>Cohort</span> {issuedBy.batchName}
              </span>
            )}
          </div>
        </div>

        {/* Share Section */}
        <div className={`${t.card} rounded-xl border ${t.border} p-6`}>
          <h2 className={`font-semibold ${t.text} mb-1`}>Share This Credential</h2>
          <p className={`text-sm ${t.textFaint} mb-4`}>
            Share this link with employers or institutions to instantly verify this credential.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR code linking to this credential's verification page"
                  className={`w-32 h-32 rounded-xl border ${t.border}`}
                />
                <p className={`text-xs ${t.textFaint} mt-1 text-center`}>Scan to verify</p>
              </div>
            )}

            {/* Copy link */}
            <div className="flex-1 space-y-2 w-full">
              <label htmlFor="verify-link" className="sr-only">Verification link — use this if you can&apos;t scan the QR code</label>
              <div className="flex gap-2">
                <input
                  id="verify-link"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className={`flex-1 min-w-0 text-xs px-3 py-2.5 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.textFaint} font-mono ${focusRing} ${t.ringOffset}`}
                />
                <button
                  onClick={handleCopyLink}
                  aria-label={copied ? 'Link copied to clipboard' : 'Copy verification link'}
                  aria-live="polite"
                  className={`px-4 py-2.5 min-w-[84px] rounded-lg text-sm font-medium transition-all ${focusRing} ${t.ringOffset} ${copied
                    ? `${t.copiedBg} ${t.copiedText} border ${t.copiedBorder}`
                    : 'bg-[#06B4C9] hover:bg-[#06B4C9]/80 text-white'
                    }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className={`text-xs ${t.textFainter}`}>Can&apos;t scan the QR code? Use the link above instead.</p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className={`text-center text-xs ${t.textFaint} pb-6`}>
          Verified by VECTOR · This page is publicly accessible
        </p>
      </main>
    </div>
  );
}
