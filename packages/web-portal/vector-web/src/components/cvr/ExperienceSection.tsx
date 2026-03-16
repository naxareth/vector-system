'use client';

interface ExperienceItem {
  title: string;
  company: string;
  dates: string;
  description: string;
}

interface ExperienceSectionProps {
  items: ExperienceItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string) => void;
}

export default function ExperienceSection({
  items,
  onAdd,
  onRemove,
  onUpdate,
}: ExperienceSectionProps) {
  return (
    <div className="pt-6 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
        Experience
        <button
          type="button"
          onClick={onAdd}
          className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/80 font-medium"
        >
          + Add Experience
        </button>
      </h2>
      {items.map((exp, index) => (
        <div
          key={index}
          className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 relative"
        >
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
          >
            ×
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Job Title (e.g. Frontend Developer)"
              className="p-2 border rounded"
              value={exp.title}
              onChange={(e) => onUpdate(index, 'title', e.target.value)}
            />
            <input
              placeholder="Company Name"
              className="p-2 border rounded"
              value={exp.company}
              onChange={(e) => onUpdate(index, 'company', e.target.value)}
            />
            <input
              placeholder="Dates (e.g. Jan 2024 - Present)"
              className="md:col-span-2 p-2 border rounded"
              value={exp.dates}
              onChange={(e) => onUpdate(index, 'dates', e.target.value)}
            />
            <textarea
              placeholder="Description of responsibilities"
              className="md:col-span-2 p-2 border rounded"
              rows={3}
              value={exp.description}
              onChange={(e) => onUpdate(index, 'description', e.target.value)}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-gray-500 italic">No experience added yet.</p>
      )}
    </div>
  );
}