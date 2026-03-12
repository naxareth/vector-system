'use client';
import { useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/shared/Pagination';
import HelpTip from '@/components/shared/HelpTip';

export interface CourseRecommendation {
  courseId: string;
  courseTitle: string;
  provider: string | null;
  link: string | null;
  relevanceScore: number;
  reason: string;
  reasonType: 'gap' | 'decay' | 'growth' | 'complement' | 'explore';
}

interface Props {
  recommendations: CourseRecommendation[];
  loading?: boolean;
}

const REASON_CONFIG = {
  gap: {
    label: 'Skill Gap',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    tip: "You're missing a skill that employers frequently look for.",
  },
  decay: {
    label: 'Urgent Upgrade',
    color: 'bg-red-50 text-red-600 border-red-200',
    tip: 'A skill you have is losing market relevance — upgrading it can keep you competitive.',
  },
  growth: {
    label: 'Rising Demand',
    color: 'bg-green-50 text-green-700 border-green-200',
    tip: 'Job postings for this skill are growing fast — a great opportunity to get ahead.',
  },
  complement: {
    label: 'Builds On Skills',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    tip: 'This course complements skills you already have, making your profile stronger.',
  },
  explore: {
    label: 'Explore',
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    tip: 'Outside your current field but high-demand — an opportunity to broaden your skill set.',
  },
};

const FALLBACK_CONFIG = {
  label: 'Suggested',
  color: 'bg-gray-100 text-gray-500 border-gray-200',
  tip: 'A suggested course to help improve your profile.',
};

// Give each provider a distinct pill color
const PROVIDER_COLOR: Record<string, string> = {
  udemy:              'bg-purple-100 text-purple-700',
  coursera:           'bg-blue-100 text-blue-700',
  edx:                'bg-slate-100 text-slate-700',
  'linkedin learning':'bg-sky-100 text-sky-700',
  pluralsight:        'bg-orange-100 text-orange-700',
  codecademy:         'bg-green-100 text-green-700',
};

function providerClass(provider: string | null) {
  if (!provider) return 'bg-[#06B4C9]/10 text-[#06B4C9]';
  return PROVIDER_COLOR[provider.toLowerCase()] ?? 'bg-[#06B4C9]/10 text-[#06B4C9]';
}

// Extract up to 3 meaningful keyword tags from the course title
function extractTags(title: string): string[] {
  const stop = new Set(['and','the','of','in','for','to','a','an','with','on','at','by',
    'i','ii','iii','iv','introduction','advanced','fundamentals','complete','guide',
    'course','bootcamp','certification','essentials','mastery','professional']);
  return title
    .replace(/[():,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w.toLowerCase()))
    .slice(0, 3);
}

// Rank badge color: gold → silver → bronze → teal for the rest
function rankBadgeClass(rank: number) {
  if (rank === 1) return 'bg-amber-400 text-white';
  if (rank === 2) return 'bg-gray-300 text-gray-700';
  if (rank === 3) return 'bg-orange-300 text-white';
  return 'bg-gray-100 text-gray-500';
}

export default function RecommendationsPanel({ recommendations, loading }: Props) {
  const ITEMS_PER_PAGE = 5;
  const [recPage, setRecPage] = useState(1);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Recommended Actions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ranked by market urgency — gap fills first, then upgrades</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Recommended Actions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ranked by market urgency — gap fills first, then upgrades</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">No recommendations yet</p>
          <p className="text-xs text-gray-400 text-center max-w-xs">Suggestions will appear once more market data is available for your credentials.</p>
        </div>
      </div>
    );
  }

  const allExplore = recommendations.every(r => r.reasonType === 'explore');
  const hasExplore  = recommendations.some(r => r.reasonType === 'explore');
  const hasTier1    = recommendations.some(r => r.reasonType !== 'explore');

  const paginatedRecs = recommendations.slice((recPage - 1) * ITEMS_PER_PAGE, recPage * ITEMS_PER_PAGE);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
            Recommended Actions
            <HelpTip text="AI-suggested courses ranked by how urgently they can improve your job prospects. Skill gaps and urgent upgrades appear first." size={14} />
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Ranked by market urgency — gap fills first, then upgrades</p>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold text-[#06B4C9] bg-[#06B4C9]/10 border border-[#06B4C9]/20 px-3 py-1 rounded-full mt-0.5">
          {recommendations.length} suggestion{recommendations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Explore-only banner ── */}
      {allExplore && (
        <div className="mx-6 mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-4 py-3">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>No field-specific courses found for your credentials yet — showing high-demand courses to expand your skill set.</span>
        </div>
      )}

      {/* ── Mixed Tier 1 + Tier 2 banner ── */}
      {hasTier1 && hasExplore && (
        <div className="mx-6 mb-4 flex items-start gap-2.5 bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded-lg px-4 py-3">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span><span className="font-semibold text-gray-600">Explore</span> cards are outside your current field — suggested as expansion opportunities.</span>
        </div>
      )}

      {/* ── Course Cards ── */}
      <div className="px-6 pb-4 space-y-3">
        {paginatedRecs.map((rec, i) => {
          const config = REASON_CONFIG[rec.reasonType] ?? FALLBACK_CONFIG;
          const globalRank = (recPage - 1) * ITEMS_PER_PAGE + i + 1;
          const tags = extractTags(rec.courseTitle);

          return (
            <div
              key={rec.courseId}
              className="rounded-xl border border-gray-200 bg-white hover:shadow-sm hover:border-gray-300 transition-all p-4"
            >
              <div className="flex items-start gap-3">
                {/* Rank badge */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${rankBadgeClass(globalRank)}`}>
                  #{globalRank}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row: title + match % */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-sm text-gray-900 leading-snug">{rec.courseTitle}</p>
                    <span className="flex-shrink-0 text-sm font-bold text-[#06B4C9]">
                      {rec.relevanceScore}% match
                    </span>
                  </div>

                  {/* Provider pill + reason */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {rec.provider && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${providerClass(rec.provider)}`}>
                        {rec.provider}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 leading-relaxed">{rec.reason}</span>
                  </div>

                  {/* Tags + CTA row */}
                  <div className="flex items-center justify-between gap-3 mt-2.5 flex-wrap">
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <span key={tag} className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50">
                          {tag}
                        </span>
                      ))}
                      {/* Reason-type badge */}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.color} flex items-center gap-1`}>
                        {config.label}
                        <HelpTip text={config.tip} size={10} />
                      </span>
                    </div>

                    {rec.link && (
                      <a
                        href={rec.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#06B4C9] hover:text-[#06B4C9] transition-colors bg-white"
                      >
                        Take Course
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 pb-4 pt-2 flex items-center justify-between gap-4 border-t border-gray-50">
        <Link
          href="/student/explore-courses"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#06B4C9] hover:text-[#06B4C9]/70 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          Explore More Courses
        </Link>
        <Pagination currentPage={recPage} totalItems={recommendations.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setRecPage} />
      </div>
    </div>
  );
}