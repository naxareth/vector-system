'use client';
import { useState, useRef } from 'react';

interface TemplateSelectorProps {
  selectedTemplate: string;
  selectedColor: string;
  onTemplateChange: (template: string) => void;
  onColorChange: (color: string) => void;
}

/* ── Preset Color Swatches ─────────────────────────────────────────────── */
const colorPresets = [
  { hex: '#06B4C9', label: 'Cyan' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#7C3AED', label: 'Purple' },
  { hex: '#059669', label: 'Emerald' },
  { hex: '#DC2626', label: 'Red' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#0F172A', label: 'Slate' },
  { hex: '#4B5563', label: 'Gray' },
];

/* ── Template Miniature Previews ───────────────────────────────────────── */
const ProfessionalPreview = ({ color }: { color: string }) => (
  <div className="h-full bg-white dark:bg-[#1A2030] p-3 flex flex-col gap-1.5">
    <div className="w-2/5 h-1.5 rounded-sm" style={{ backgroundColor: color }} />
    <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
    <div className="flex gap-2 flex-1">
      <div className="w-2/3 space-y-1">
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-sm" />
        <div className="w-5/6 h-1 bg-gray-200 dark:bg-gray-700 rounded-sm" />
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-sm" />
      </div>
      <div className="w-1/3 space-y-1">
        <div className="w-full h-1 bg-gray-100 dark:bg-gray-700/60 rounded-sm" />
        <div className="w-3/4 h-1 bg-gray-100 dark:bg-gray-700/60 rounded-sm" />
      </div>
    </div>
  </div>
);

const ModernPreview = ({ color }: { color: string }) => (
  <div className="h-full bg-white dark:bg-[#1A2030] flex">
    <div className="w-1/3 p-2 space-y-1.5" style={{ backgroundColor: `${color}10` }}>
      <div className="w-8 h-8 rounded-full mx-auto" style={{ backgroundColor: `${color}30` }} />
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-sm" />
      <div className="w-2/3 h-1 bg-gray-200 dark:bg-gray-600 rounded-sm mx-auto" />
    </div>
    <div className="w-2/3 p-2 space-y-1.5">
      <div className="w-1/2 h-2 rounded-sm" style={{ backgroundColor: color }} />
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-sm" />
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-sm" />
      <div className="w-5/6 h-1 bg-gray-200 dark:bg-gray-700 rounded-sm" />
    </div>
  </div>
);

const SimplePreview = ({ color }: { color: string }) => (
  <div className="h-full bg-white dark:bg-[#1A2030] p-3 flex flex-col gap-1.5">
    <div className="text-center space-y-0.5 mb-0.5">
      <div className="w-2/3 h-1.5 rounded-sm mx-auto" style={{ backgroundColor: color }} />
      <div className="w-1/2 h-1 bg-gray-200 dark:bg-gray-600 rounded-sm mx-auto" />
    </div>
    <div className="w-full h-px" style={{ backgroundColor: color }} />
    <div className="space-y-1 flex-1">
      <div className="w-2/5 h-1 rounded-sm" style={{ backgroundColor: `${color}80` }} />
      <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
      <div className="flex justify-between">
        <div className="w-1/3 h-1 bg-gray-300 dark:bg-gray-600 rounded-sm" />
        <div className="w-1/4 h-1 bg-gray-200 dark:bg-gray-700 rounded-sm" />
      </div>
    </div>
  </div>
);

const templates = [
  {
    id: 'professional',
    label: 'Professional',
    description: 'Clean, structured layout for corporate roles.',
    Preview: ProfessionalPreview,
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Two-column design with skills sidebar.',
    Preview: ModernPreview,
  },
  {
    id: 'simple',
    label: 'Simple',
    description: 'Traditional, ATS-friendly and minimal.',
    Preview: SimplePreview,
  },
];

export default function TemplateSelector({
  selectedTemplate,
  selectedColor,
  onTemplateChange,
  onColorChange,
}: TemplateSelectorProps) {
  const [hexInput, setHexInput] = useState(selectedColor);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onColorChange(value);
    }
  };

  const handlePresetClick = (hex: string) => {
    setHexInput(hex);
    onColorChange(hex);
  };

  // Keep hex input in sync when parent changes color
  if (selectedColor !== hexInput && /^#[0-9A-Fa-f]{6}$/.test(selectedColor)) {
    setHexInput(selectedColor);
  }

  return (
    <div className="pt-6 border-t border-gray-200 dark:border-[#1E2536]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Choose Template</h2>
        <span className="text-xs font-semibold tracking-wide uppercase text-[#06B4C9] bg-[#06B4C9]/10 px-3 py-1 rounded-full">
          {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
        </span>
      </div>

      {/* Template Cards — compact row */}
      <div className="grid grid-cols-3 gap-3">
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
                className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'border-[#06B4C9] ring-1 ring-[#06B4C9]/30'
                    : 'border-gray-200 dark:border-[#1E2536] hover:border-[#06B4C9]/40'
                }`}
              >
                {/* Miniature preview — short height */}
                <div className="relative h-24 overflow-hidden">
                  <tpl.Preview color={selectedColor} />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#06B4C9]/8 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="bg-[#06B4C9] text-white p-1.5 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                {/* Label */}
                <div className="px-3 py-2.5 border-t border-gray-100 dark:border-[#1E2536] bg-gray-50/60 dark:bg-[#131825]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tpl.label}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{tpl.description}</p>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* ── Color Picker ──────────────────────────────────────────────────── */}
      <div className="mt-5 p-4 rounded-xl bg-gray-50/80 dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536]">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Accent Color</span>
        </div>

        {/* Preset Swatches */}
        <div className="flex items-center gap-2 flex-wrap">
          {colorPresets.map((preset) => {
            const isActive = selectedColor.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                title={preset.label}
                onClick={() => handlePresetClick(preset.hex)}
                className={`w-8 h-8 rounded-full transition-all duration-150 flex items-center justify-center ${
                  isActive
                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#131825] scale-110'
                    : 'hover:scale-110'
                }`}
                style={{
                  backgroundColor: preset.hex,
                  ...(isActive ? { ringColor: preset.hex } : {}),
                }}
              >
                {isActive && (
                  <svg className="w-3.5 h-3.5 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Custom color picker trigger */}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#06B4C9] transition-colors flex items-center justify-center group"
            title="Custom color"
          >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#06B4C9] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={selectedColor}
            onChange={(e) => { onColorChange(e.target.value); setHexInput(e.target.value); }}
            className="sr-only"
            aria-label="Custom color picker"
          />

          {/* Hex input + live preview */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 font-mono">#</span>
              <input
                type="text"
                value={hexInput.replace('#', '')}
                onChange={(e) => handleHexChange('#' + e.target.value)}
                maxLength={6}
                className="!w-20 pl-6 pr-2 py-1.5 text-xs font-mono rounded-lg border border-gray-200 dark:!border-[#283042] dark:!bg-[#1A2030] dark:!text-gray-200 text-gray-700 focus:outline-none focus:border-[#06B4C9] transition-colors"
                aria-label="Hex color value"
              />
            </div>
            <div
              className="w-7 h-7 rounded-lg border border-gray-200 dark:border-[#283042] shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}