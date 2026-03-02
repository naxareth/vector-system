'use client';
import { useEffect, useState } from 'react';

// --- Types (mirrors market-insights/route.ts) ---

interface LocationDemand {
  location: string;
  count: number;
}

interface SalaryInsights {
  min: number | null;
  max: number | null;
  avg: number | null;
  currency: string;
}

interface SkillInsight {
  skill_name: string;
  latest_job_count: number;
  salary: SalaryInsights;
  top_locations: LocationDemand[];
  last_updated: string;
  history: { date: string; job_count: number }[];
}

interface Props {
  userId: string;
}

// --- Sparkline SVG ---

function Sparkline({ history, color }: { history: SkillInsight['history']; color: string }) {
  if (history.length < 2) {
    return (
      <div className="h-8 flex items-center">
        <span className="text-xs text-gray-400 italic">No trend data yet</span>
      </div>
    );
  }

  const counts = history.map(h => h.job_count);
  const max = Math.max(...counts) || 1;
  const min = Math.min(...counts);
  const range = (max - min) || 1;
  const w = 80;
  const h = 32;

  const points = counts
    .map((c, i) => {
      const x = (i / (counts.length - 1)) * w;
      const y = h - ((c - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Salary Bar ---

function SalaryBar({ salary }: { salary: SalaryInsights }) {
  if (salary.avg === null) {
    return <span className="text-xs text-gray-400 italic">No salary data</span>;
  }

  const fmt = (n: number | null) =>
    n != null ? `$${(n / 1000).toFixed(0)}k` : '—';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{fmt(salary.min)}</span>
        <span className="font-semibold text-gray-800">avg {fmt(salary.avg)}</span>
        <span>{fmt(salary.max)}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
          style={{
            marginLeft: `${((salary.min ?? 0) / (salary.max ?? 1)) * 40}%`,
            width: '60%',
          }}
        />
      </div>
    </div>
  );
}

// --- Trend Badge ---

function TrendBadge({ history }: { history: SkillInsight['history'] }) {
  if (history.length < 2) return null;

  const first = history[0].job_count;
  const last = history[history.length - 1].job_count;
  const delta = first > 0 ? ((last - first) / first) * 100 : 0;
  const isUp = delta >= 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isUp
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-600 border border-red-200'
      }`}
    >
      {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
    </span>
  );
}

// --- Location Bars ---
// Adzuna returns locations as a plain string array with no count values.
// We use rank-based widths: 1st = 100%, 2nd = 80%, 3rd = 60%, 4th = 45%, 5th = 30%
// This gives a natural descending visual without needing real count data.

const RANK_WIDTHS = [100, 80, 60, 45, 30];

function LocationBars({
  locations,
  color,
}: {
  locations: LocationDemand[];
  color: string;
}) {
  if (locations.length === 0) return null;

  // Normalize: handle both string arrays and {location, count} objects from Adzuna
  const normalized = locations.map((loc) =>
    typeof loc === 'string' ? { location: loc, count: 0 } : loc
  );

  // If all counts are identical (including 0), fall back to rank-based widths
  const counts = normalized.map((l) => l.count);
  const allSame = counts.every((c) => c === counts[0]);
  const maxCount = Math.max(...counts) || 1;

  return (
    <div className="space-y-1.5">
      {normalized.map((loc, j) => {
        const width = allSame
          ? RANK_WIDTHS[j] ?? 20
          : Math.round((loc.count / maxCount) * 100);

        return (
          <div key={j} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-36 truncate" title={loc.location}>
              {loc.location}
            </span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${width}%`,
                  backgroundColor: color,
                  opacity: 0.75,
                }}
              />
            </div>
            {/* Only show count if it's meaningful (non-zero) */}
            {loc.count > 0 && (
              <span className="text-xs text-gray-400 w-8 text-right">{loc.count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main Component ---

export default function MarketInsightsPanel({ userId }: Props) {
  const [insights, setInsights] = useState<SkillInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchInsights = async () => {
      try {
        const res = await fetch(`/api/student/market-insights?userId=${userId}`);
        const json = await res.json();
        if (json.status === 'success') {
          setInsights(json.data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [userId]);

  const colors = ['#9333ea', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4'];

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Rich Market Intelligence</h2>
            <p className="text-xs text-gray-500">Salary & location demand per skill</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-sm text-gray-400 text-center py-6">Could not load market intelligence.</p>
      </div>
    );
  }

  const withData = insights.filter(s => s.latest_job_count > 0);
  const noData = insights.filter(s => s.latest_job_count === 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Rich Market Intelligence</h2>
          <p className="text-xs text-gray-500">Salary & regional demand for your skills</p>
        </div>
        <span className="text-xs text-gray-400">
          {withData.length} skill{withData.length !== 1 ? 's' : ''} tracked
        </span>
      </div>

      {/* Skill Rows */}
      <div className="divide-y divide-gray-50">
        {withData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">No market intelligence yet</p>
            <p className="text-xs text-gray-400">Data populates after the first daily market scan</p>
          </div>
        )}

        {withData.map((skill, i) => {
          const color = colors[i % colors.length];
          const isOpen = expanded === skill.skill_name;

          return (
            <div key={skill.skill_name}>
              {/* Summary Row */}
              <button
                onClick={() => setExpanded(isOpen ? null : skill.skill_name)}
                className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{skill.skill_name}</span>
                      <TrendBadge history={skill.history} />
                    </div>
                    <span className="text-xs text-gray-400">
                      {skill.latest_job_count.toLocaleString()} open jobs
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <Sparkline history={skill.history} color={color} />
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Detail */}
              {isOpen && (
                <div className="px-6 pb-5 pt-1 bg-gray-50 border-t border-gray-100 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Salary Range
                    </p>
                    <SalaryBar salary={skill.salary} />
                  </div>

                  {skill.top_locations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Top Hiring Locations
                      </p>
                      <LocationBars locations={skill.top_locations} color={color} />
                    </div>
                  )}

                  {skill.last_updated && (
                    <p className="text-xs text-gray-400">
                      Last updated:{' '}
                      {new Date(skill.last_updated).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {noData.length > 0 && (
          <div className="px-6 py-3">
            <p className="text-xs text-gray-400">
              {noData.map(s => s.skill_name).join(', ')} — awaiting first market scan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}