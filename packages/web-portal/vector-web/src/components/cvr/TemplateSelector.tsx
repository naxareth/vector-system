'use client';

interface TemplateSelectorProps {
  selectedTemplate: string;
  selectedColor: string;
  onTemplateChange: (template: string) => void;
  onColorChange: (color: string) => void;
}

const templates = [
  {
    id: 'professional',
    label: 'Professional',
    description: 'Clean, structured layout best for corporate and enterprise roles.',
    preview: (
      <div className="aspect-[3/4] bg-white p-3 flex flex-col gap-2 relative">
        <div className="w-1/3 h-2 bg-gray-800 rounded-sm mb-2" />
        <div className="w-full h-px bg-gray-200" />
        <div className="flex gap-2">
          <div className="w-2/3 space-y-1">
            <div className="w-full h-1.5 bg-gray-200 rounded-sm" />
            <div className="w-5/6 h-1.5 bg-gray-200 rounded-sm" />
            <div className="w-full h-1.5 bg-gray-200 rounded-sm" />
          </div>
          <div className="w-1/3 space-y-1">
            <div className="w-full h-1.5 bg-gray-300 rounded-sm" />
            <div className="w-3/4 h-1.5 bg-gray-300 rounded-sm" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Creative two-column design with verified skills sidebar.',
    preview: (
      <div className="aspect-[3/4] bg-white flex relative">
        <div className="w-1/3 bg-gray-100 p-2 space-y-2">
          <div className="w-12 h-12 rounded-full bg-gray-300 mx-auto mb-2" />
          <div className="w-full h-1.5 bg-gray-300 rounded-sm" />
          <div className="w-2/3 h-1.5 bg-gray-300 rounded-sm mx-auto" />
        </div>
        <div className="w-2/3 p-2 space-y-2">
          <div className="w-1/2 h-3 bg-[#06B4C9] rounded-sm mb-2" />
          <div className="w-full h-1.5 bg-gray-200 rounded-sm" />
          <div className="w-full h-1.5 bg-gray-200 rounded-sm" />
          <div className="w-5/6 h-1.5 bg-gray-200 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: 'simple',
    label: 'Simple',
    description: 'Traditional, no-frills resume. Clean and ATS-friendly.',
    preview: (
      <div className="aspect-[3/4] bg-white p-4 flex flex-col gap-2 relative">
        <div className="text-center space-y-0.5 mb-1">
          <div className="w-2/3 h-2.5 bg-gray-800 rounded-sm mx-auto" />
          <div className="w-1/2 h-1 bg-gray-300 rounded-sm mx-auto" />
          <div className="w-2/5 h-1 bg-gray-300 rounded-sm mx-auto" />
        </div>
        <div className="w-full h-px bg-gray-800" />
        <div className="space-y-1.5 mt-1">
          <div className="w-2/5 h-1.5 bg-gray-800 rounded-sm" />
          <div className="w-full h-px bg-gray-400" />
          <div className="flex justify-between">
            <div className="w-1/3 h-1 bg-gray-700 rounded-sm" />
            <div className="w-1/4 h-1 bg-gray-400 rounded-sm" />
          </div>
        </div>
      </div>
    ),
  },
];

export default function TemplateSelector({
  selectedTemplate,
  selectedColor,
  onTemplateChange,
  onColorChange,
}: TemplateSelectorProps) {
  return (
    <div className="pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Choose Template</h2>
        <span className="text-sm text-[#06B4C9] font-medium bg-[#06B4C9]/10 px-3 py-1 rounded-full">
          {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} Selected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((tpl) => {
          const isSelected = selectedTemplate === tpl.id;
          return (
            <label key={tpl.id} className="group relative cursor-pointer block">
              <input
                type="radio"
                name="template"
                value={tpl.id}
                checked={isSelected}
                onChange={() => onTemplateChange(tpl.id)}
                className="sr-only"
              />
              <div
                className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'border-[#06B4C9] shadow-md ring-1 ring-[#06B4C9]'
                    : 'border-gray-200 hover:border-[#06B4C9]/50 hover:shadow-sm'
                }`}
              >
                <div className="relative overflow-hidden">
                  {tpl.preview}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#06B4C9]/10 flex items-center justify-center">
                      <div className="bg-[#06B4C9] text-white p-2 rounded-full shadow-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <h3 className="font-bold text-gray-900">{tpl.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{tpl.description}</p>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Color Picker */}
      <div className="mt-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Primary Color</label>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-10 h-8 p-0 border rounded-md"
          aria-label="Choose primary color"
        />
        <input
          type="text"
          value={selectedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm w-28"
          aria-label="Primary color hex"
        />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">Preview</span>
          <span
            className="w-6 h-6 rounded-full border"
            style={{ background: selectedColor }}
          />
        </div>
      </div>
    </div>
  );
}