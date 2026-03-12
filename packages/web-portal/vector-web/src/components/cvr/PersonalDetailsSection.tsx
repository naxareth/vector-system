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
}

export default function PersonalDetailsSection({
  formData,
  errors,
  onChange,
}: PersonalDetailsSectionProps) {
  const inputClass = (field: string) =>
    `w-full px-3 py-2 text-sm text-gray-900 border rounded-lg focus:outline-none focus:ring-2 placeholder:text-gray-400 ${
      errors[field]
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:ring-[#06B4C9]'
    }`;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
              className={inputClass('fullName')}
              placeholder="John Doe"
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Professional Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onChange('title', e.target.value)}
              className={inputClass('title')}
              placeholder="Full-Stack Developer"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              className={inputClass('email')}
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B4C9] placeholder:text-gray-400"
              placeholder="+63 912 345 6789"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LinkedIn Profile (Optional)
          </label>
          <input
            type="url"
            value={formData.linkedin}
            onChange={(e) => onChange('linkedin', e.target.value)}
            className={inputClass('linkedin')}
            placeholder="https://linkedin.com/in/johndoe"
          />
          {errors.linkedin && <p className="text-xs text-red-500 mt-1">{errors.linkedin}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio/Website (GitHub for Devs)
          </label>
          <input
            type="url"
            value={formData.portfolio}
            onChange={(e) => onChange('portfolio', e.target.value)}
            className={inputClass('portfolio')}
            placeholder="https://github.com/johndoe"
          />
          {errors.portfolio && <p className="text-xs text-red-500 mt-1">{errors.portfolio}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Professional Summary
          </label>
          <p className="text-xs text-gray-500 mb-2">
            A short 2–4 sentence paragraph summarizing who you are, your key skills, career goals,
            and the value you bring.
          </p>
          <textarea
            value={formData.summary}
            onChange={(e) => onChange('summary', e.target.value.slice(0, 500))}
            rows={4}
            maxLength={500}
            style={{ resize: 'none' }}
            className={inputClass('summary')}
            placeholder="e.g., Diligent Computer Science student with a passion for blockchain technology..."
          />
          <p className={`text-xs mt-1 text-right ${(formData.summary?.length ?? 0) >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
            {formData.summary?.length ?? 0}/500
          </p>
          {errors.summary && <p className="text-xs text-red-500 mt-1">{errors.summary}</p>}
        </div>
      </div>
    </div>
  );
}