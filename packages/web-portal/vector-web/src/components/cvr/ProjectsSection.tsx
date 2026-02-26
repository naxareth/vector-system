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
  return (
    <div className="pt-6 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
        Projects
        <button
          type="button"
          onClick={onAdd}
          className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/80 font-medium"
        >
          + Add Project
        </button>
      </h2>
      {items.map((proj, index) => (
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
          <div className="grid grid-cols-1 gap-4">
            <input
              placeholder="Project Title"
              className="p-2 border rounded"
              value={proj.title}
              onChange={(e) => onUpdate(index, 'title', e.target.value)}
            />
            <input
              placeholder="Technologies Used"
              className="p-2 border rounded"
              value={proj.technologies}
              onChange={(e) => onUpdate(index, 'technologies', e.target.value)}
            />
            <input
              placeholder="Your Role"
              className="p-2 border rounded"
              value={proj.role}
              onChange={(e) => onUpdate(index, 'role', e.target.value)}
            />
            <textarea
              placeholder="Short description..."
              rows={2}
              className="p-2 border rounded"
              value={proj.description}
              onChange={(e) => onUpdate(index, 'description', e.target.value)}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-gray-500 italic">No projects added yet.</p>
      )}
    </div>
  );
}