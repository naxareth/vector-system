'use client';

interface EducationItem {
  degree: string;
  school: string;
  location: string;
  year: string;
  honors: string;
}

interface EducationSectionProps {
  items: EducationItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string) => void;
}

export default function EducationSection({
  items,
  onAdd,
  onRemove,
  onUpdate,
}: EducationSectionProps) {
  return (
    <div className="pt-6 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
        Education
        <button
          type="button"
          onClick={onAdd}
          className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/80 font-medium"
        >
          + Add Education
        </button>
      </h2>
      {items.map((edu, index) => (
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
              placeholder="Degree (e.g. BS Information Technology)"
              className="p-2 border rounded"
              value={edu.degree}
              onChange={(e) => onUpdate(index, 'degree', e.target.value)}
            />
            <input
              placeholder="School Name"
              className="p-2 border rounded"
              value={edu.school}
              onChange={(e) => onUpdate(index, 'school', e.target.value)}
            />
            <input
              placeholder="Location"
              className="p-2 border rounded"
              value={edu.location}
              onChange={(e) => onUpdate(index, 'location', e.target.value)}
            />
            <input
              placeholder="Graduation Year/Date"
              className="p-2 border rounded"
              value={edu.year}
              onChange={(e) => onUpdate(index, 'year', e.target.value)}
            />
            <input
              placeholder="Academic Honors (Optional)"
              className="md:col-span-2 p-2 border rounded"
              value={edu.honors}
              onChange={(e) => onUpdate(index, 'honors', e.target.value)}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-gray-500 italic">No education added yet.</p>
      )}
    </div>
  );
}