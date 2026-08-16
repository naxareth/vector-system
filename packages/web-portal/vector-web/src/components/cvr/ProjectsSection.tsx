'use client';

interface ProjectItem {
  title: string;
  description: string;
  technologies: string;
  role: string;
}

interface ProjectsSectionProps {
  items: ProjectItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string) => void;
}

export default function ProjectsSection({
  items,
  onAdd,
  onRemove,
  onUpdate,
}: ProjectsSectionProps) {
  const inputClass =
    'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B4C9] text-gray-900 bg-white placeholder:text-gray-400';

  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-4">Projects</h2>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((proj, index) => (
            <div
              key={index}
              className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group"
            >
              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  placeholder="Project Title"
                  className={inputClass}
                  value={proj.title}
                  onChange={(e) => onUpdate(index, 'title', e.target.value)}
                />
                <input
                  placeholder="Technologies Used"
                  className={inputClass}
                  value={proj.technologies}
                  onChange={(e) => onUpdate(index, 'technologies', e.target.value)}
                />
              </div>
              <input
                placeholder="Your Role"
                className={`${inputClass} mt-3`}
                value={proj.role}
                onChange={(e) => onUpdate(index, 'role', e.target.value)}
              />
              <textarea
                placeholder="Short description..."
                rows={2}
                className={`${inputClass} mt-3`}
                style={{ resize: 'vertical' }}
                value={proj.description}
                onChange={(e) => onUpdate(index, 'description', e.target.value)}
              />
            </div>
          ))}

          {/* Add another button (below items) */}
          <button
            type="button"
            onClick={onAdd}
            className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/80 font-medium flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add another project
          </button>
        </div>
      ) : (
        /* ── Empty State ──────────────────────────────────────────────── */
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 px-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No projects added yet</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-xs">
            Add a project to show recruiters what you&apos;ve actually built.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-2 bg-[#0F172A] hover:bg-[#1e293b] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add project
          </button>
        </div>
      )}
    </div>
  );
}