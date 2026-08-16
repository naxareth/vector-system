'use client';

// ---------------------------------------------------------------------------
// Live Preview Panel — Shows a real-time mini resume preview on the right
// side of the form, updating as the user types. Matches the dark card
// design from the reference image.
// ---------------------------------------------------------------------------

interface LivePreviewPanelProps {
  formData: {
    fullName: string;
    email: string;
    phone: string;
    portfolio: string;
    linkedin: string;
    title: string;
    summary: string;
    projects: { title: string; description: string; technologies: string; role: string }[];
    certifications: { name: string; issuer: string; date: string; verified: boolean; id?: string }[];
  };
  selectedSkillIds: string[];
  availableSkills: { id: string; name: string; verified: boolean }[];
  score: number;
  onPreview: () => void;
}

/* ── Score Ring ──────────────────────────────────────────────────────── */
function PreviewScoreRing({ score, size = 38 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700 dark:text-gray-200">
        {score}%
      </span>
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────────── */
export default function LivePreviewPanel({
  formData,
  selectedSkillIds,
  availableSkills,
  score,
  onPreview,
}: LivePreviewPanelProps) {
  const verifiedCerts = formData.certifications.filter((c) => c.verified);
  const selectedSkills = availableSkills.filter((s) => selectedSkillIds.includes(s.id));

  // Contact info line
  const contactParts = [formData.email, formData.phone, formData.linkedin, formData.portfolio].filter(Boolean);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Live Preview</h3>
        <PreviewScoreRing score={score} size={36} />
      </div>

      {/* Resume preview card (Light mode: clean white card with border/shadow; Dark mode: #0F172A) */}
      <div className="bg-white border border-gray-200 shadow-sm text-gray-900 dark:bg-[#0F172A] dark:border-gray-800 dark:text-white rounded-xl p-5 transition-colors">
        {/* Name */}
        <h2 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
          {formData.fullName || 'Your Name'}
        </h2>

        {/* Title */}
        <p className={`text-sm mt-0.5 ${formData.title ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'}`}>
          {formData.title || 'Add a professional title'}
        </p>

        {/* Contact */}
        {contactParts.length > 0 && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2.5 leading-relaxed break-all">
            {contactParts.join('  ·  ')}
          </p>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700/60 my-3.5" />

        {/* Summary */}
        <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1">
          Summary
        </h4>
        <p
          className={`text-[11px] leading-relaxed ${
            formData.summary ? 'text-gray-700 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600 italic'
          }`}
        >
          {formData.summary ||
            'No summary yet — add one so recruiters know who you are at a glance.'}
        </p>

        {/* Projects */}
        <div className="mt-3.5">
          <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1">
            Projects
          </h4>
          {formData.projects.length > 0 ? (
            <div className="space-y-1.5">
              {formData.projects.slice(0, 3).map((p, i) => (
                <div key={i}>
                  <p className="text-[11px] text-gray-800 dark:text-gray-300 font-medium">
                    {p.title || 'Untitled Project'}
                  </p>
                  {p.technologies && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">{p.technologies}</p>
                  )}
                </div>
              ))}
              {formData.projects.length > 3 && (
                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                  +{formData.projects.length - 3} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 dark:text-gray-600 italic">
              Nothing added yet — this section stays hidden on your PDF until you add one.
            </p>
          )}
        </div>

        {/* Skills */}
        {selectedSkills.length > 0 && (
          <div className="mt-3.5">
            <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Skills
            </h4>
            <div className="flex flex-wrap gap-1">
              {selectedSkills.slice(0, 8).map((s) => (
                <span
                  key={s.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    s.verified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {s.name}
                </span>
              ))}
              {selectedSkills.length > 8 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-500 self-center">
                  +{selectedSkills.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Verified credentials count */}
        {verifiedCerts.length > 0 && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700/60 my-3.5" />
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {verifiedCerts.length} credential{verifiedCerts.length !== 1 ? 's' : ''} on this
              resume {verifiedCerts.length !== 1 ? 'are' : 'is'} verified
            </p>
          </>
        )}

        {/* Download button */}
        <button
          type="button"
          onClick={onPreview}
          className="w-full mt-4 py-2.5 bg-[#0F172A] hover:bg-[#1e293b] text-white dark:bg-[#1e293b] dark:hover:bg-[#334155] text-xs font-semibold rounded-lg border border-transparent dark:border-gray-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download PDF
        </button>
      </div>
    </div>
  );
}
