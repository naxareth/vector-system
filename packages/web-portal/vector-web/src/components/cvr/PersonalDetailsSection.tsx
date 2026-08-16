'use client';

interface PersonalDetailsSectionProps {
  formData: {
    fullName: string;
    email: string;
    phone: string;
    portfolio: string;
    linkedin: string;
    title: string;
    summary: string;
  };
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  syncedFields?: Set<string>;
}

/* ── Synced Badge ────────────────────────────────────────────────────── */
function SyncedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 ml-1.5">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Synced
    </span>
  );
}

export default function PersonalDetailsSection({
  formData,
  errors,
  onChange,
  syncedFields,
}: PersonalDetailsSectionProps) {
  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 text-sm text-gray-900 border rounded-lg focus:outline-none focus:ring-2 placeholder:text-gray-400 bg-white ${
      errors[field]
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-200 focus:ring-[#06B4C9]'
    }`;

  const isSynced = (field: string) => syncedFields?.has(field) || false;

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900">Personal details</h2>
        <a
          href="/student/profile"
          className="text-sm font-medium text-[#06B4C9] hover:text-[#06B4C9]/80 transition-colors"
        >
          Update in Profile →
        </a>
      </div>

      <div className="space-y-4">
        {/* Row 1: Full name + Professional title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full name <span className="text-red-500">*</span>
              {isSynced('fullName') && <SyncedBadge />}
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
              className={inputClass('fullName')}
              placeholder="John Doe"
            />
            {errors.fullName && (
              <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Professional title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onChange('title', e.target.value)}
              className={inputClass('title')}
              placeholder="Full-Stack Developer"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
          </div>
        </div>

        {/* Row 2: Email + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address <span className="text-red-500">*</span>
              {isSynced('email') && <SyncedBadge />}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              className={inputClass('email')}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone number
              {isSynced('phone') && <SyncedBadge />}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              className={inputClass('phone')}
              placeholder="+63 912 345 6789"
            />
          </div>
        </div>

        {/* Row 3: LinkedIn + Portfolio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              LinkedIn profile
              {isSynced('linkedin') && <SyncedBadge />}
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => onChange('linkedin', e.target.value)}
              className={inputClass('linkedin')}
              placeholder="linkedin.com/in/johndoe"
            />
            {errors.linkedin && (
              <p className="text-xs text-red-500 mt-1">{errors.linkedin}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Portfolio / GitHub
              {isSynced('portfolio') && <SyncedBadge />}
            </label>
            <input
              type="url"
              value={formData.portfolio}
              onChange={(e) => onChange('portfolio', e.target.value)}
              className={inputClass('portfolio')}
              placeholder="github.com/johndoe"
            />
            {errors.portfolio && (
              <p className="text-xs text-red-500 mt-1">{errors.portfolio}</p>
            )}
          </div>
        </div>

        {/* Professional Summary (full width) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Professional summary
          </label>
          <p className="text-xs text-gray-500 mb-2">
            A short 2–4 sentence paragraph on who you are and the value you bring.
          </p>
          <textarea
            value={formData.summary}
            onChange={(e) => onChange('summary', e.target.value.slice(0, 500))}
            rows={4}
            maxLength={500}
            style={{ resize: 'vertical' }}
            className={inputClass('summary')}
            placeholder="e.g., Diligent Computer Science student with a passion for software engineering and AI..."
          />
          <p
            className={`text-xs mt-1 text-right ${
              (formData.summary?.length ?? 0) >= 500 ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {formData.summary?.length ?? 0}/500
          </p>
          {errors.summary && (
            <p className="text-xs text-red-500 mt-1">{errors.summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}