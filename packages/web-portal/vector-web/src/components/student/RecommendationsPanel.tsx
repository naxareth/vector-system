'use client';

export interface CourseRecommendation {
  courseId: string;
  courseTitle: string;
  provider: string | null;
  link: string | null;
  relevanceScore: number;
  reason: string;
  reasonType: 'gap' | 'decay' | 'growth' | 'complement';
}

interface Props {
  recommendations: CourseRecommendation[];
  loading?: boolean;
}

const REASON_CONFIG = {
  gap: {
    label: 'Skill Gap',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
  },
  decay: {
    label: 'Urgent Upgrade',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
  growth: {
    label: 'Rising Demand',
    color: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
  },
  complement: {
    label: 'Builds On Skills',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
    bar: 'bg-blue-400',
  },
};

export default function RecommendationsPanel({ recommendations, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recommended Actions</h2>
            <p className="text-xs text-gray-500">AI-powered course suggestions based on market data</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recommended Actions</h2>
            <p className="text-xs text-gray-500">AI-powered course suggestions based on market data</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
          <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-sm font-medium">No recommendations yet — check back after more market data accumulates.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recommended Actions</h2>
          <p className="text-xs text-gray-500">Ranked by market urgency — gap fills first, then upgrades</p>
        </div>
        <span className="text-xs text-gray-400">{recommendations.length} suggestion{recommendations.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Course Cards */}
      <div className="divide-y divide-gray-50">
        {recommendations.map((rec, i) => {
          const config = REASON_CONFIG[rec.reasonType];
          return (
            <div key={rec.courseId} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Rank number */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 mt-0.5">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title + badge */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 leading-tight">
                        {rec.courseTitle}
                      </p>
                      {rec.provider && (
                        <p className="text-xs text-gray-400 mt-0.5">{rec.provider}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${config.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                      {config.label}
                    </span>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {rec.reason}
                  </p>

                  {/* Relevance bar + CTA */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                        style={{ width: `${rec.relevanceScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {rec.relevanceScore}% match
                    </span>
                    {rec.link && (
                      <a
                        href={rec.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}