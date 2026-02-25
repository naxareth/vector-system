'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SkillStrength = {
  strong: string[];
  moderate: string[];
  weak: string[];
};

type MarketAlignment = {
  score: number;
  insight: string;
};

export type CVRAnalysis = {
  overallScore: number;
  summary: string;
  skillStrength: SkillStrength;
  marketAlignment: MarketAlignment;
  missingKeywords: string[];
  recommendations: string[];
};

type Props = {
  snapshot: Record<string, any>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;

  const color =
    score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={7}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeDasharray={`${filled} ${gap}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  );
}

function SkillChip({
  label,
  variant,
}: {
  label: string;
  variant: 'strong' | 'moderate' | 'weak';
}) {
  const styles = {
    strong: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    weak: 'bg-red-50 text-red-700 border-red-200',
  };
  const dots = {
    strong: 'bg-emerald-500',
    moderate: 'bg-amber-500',
    weak: 'bg-red-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${styles[variant]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dots[variant]}`} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CVRAnalysisPanel({ snapshot }: Props) {
  const [analysis, setAnalysis] = useState<CVRAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/cvr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setHasRun(true);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const alignmentColor =
    (analysis?.marketAlignment.score ?? 0) >= 70
      ? '#10b981'
      : (analysis?.marketAlignment.score ?? 0) >= 45
      ? '#f59e0b'
      : '#ef4444';

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (!hasRun && !loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">AI CVR Analysis</h2>
              <p className="text-xs text-gray-400">
                Powered by Gemini · Skill strength, market alignment &amp; gap analysis
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
          <p className="text-sm text-gray-500 max-w-sm">
            Get instant AI feedback on your skills&apos; market value, alignment with
            current job demand, and the gaps that matter most to employers.
          </p>
          <button
            onClick={handleAnalyze}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Analyze My CVR
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 flex flex-col items-center gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-purple-100" />
          <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-600 font-medium">Analyzing your CVR with AI&hellip;</p>
        <p className="text-xs text-gray-400">Checking market alignment and skill health data</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Analysis failed</p>
            <p className="text-xs text-gray-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={handleAnalyze}
            className="text-xs text-purple-600 hover:text-purple-800 font-medium flex-shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  // ── Results ───────────────────────────────────────────────────────────────
  const allSkills = [
    ...analysis.skillStrength.strong.map((s) => ({ name: s, variant: 'strong' as const })),
    ...analysis.skillStrength.moderate.map((s) => ({ name: s, variant: 'moderate' as const })),
    ...analysis.skillStrength.weak.map((s) => ({ name: s, variant: 'weak' as const })),
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">AI CVR Analysis</h2>
            <p className="text-xs text-gray-400">Powered by Gemini · Live market data</p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          className="text-xs text-gray-400 hover:text-purple-600 transition-colors flex items-center gap-1"
          title="Re-run analysis"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Re-analyze
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Score row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Overall Score */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <ScoreRing score={analysis.overallScore} size={72} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold text-gray-800">
                  {analysis.overallScore}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Overall Score
              </p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">
                {analysis.overallScore >= 70
                  ? 'Strong Profile'
                  : analysis.overallScore >= 45
                  ? 'Developing Profile'
                  : 'Needs Improvement'}
              </p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {analysis.summary}
              </p>
            </div>
          </div>

          {/* Market Alignment */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Market Alignment
            </p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-800">
                {analysis.marketAlignment.score}
              </span>
              <span className="text-sm text-gray-400 mb-1">/ 100</span>
            </div>
            <ScoreBar score={analysis.marketAlignment.score} color={alignmentColor} />
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              {analysis.marketAlignment.insight}
            </p>
          </div>
        </div>

        {/* ── Skill Strength ── */}
        {allSkills.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Skill Strength</h3>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Strong
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Weak
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((s) => (
                <SkillChip key={s.name} label={s.name} variant={s.variant} />
              ))}
            </div>
          </div>
        )}

        {/* ── Missing Keywords ── */}
        {analysis.missingKeywords.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Missing High-Demand Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.missingKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Recommendations ── */}
        {analysis.recommendations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Recommendations
            </h3>
            <ol className="space-y-2.5">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-600 leading-relaxed">{rec}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}