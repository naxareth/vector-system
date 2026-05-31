'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, Loader2, AlertCircle, BookOpen, Award, Code, FileText, Lock } from 'lucide-react';
import HelpTip from '@/components/shared/HelpTip';

interface SchemaField {
  id: string;
  keyName: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
}

// The skill_tags field is injected into every template — it's the source of truth
// for skill matching. Registrar must explicitly declare the marketable skills
// the credential represents, separate from the credential title.
const SKILL_TAGS_FIELD = {
  keyName: 'skill_tags',
  displayName: 'Skills (comma-separated)',
  type: 'string' as const,
  required: true,
};

const PRESET_TEMPLATES = [
  {
    id: 'academic_degree',
    name: 'Academic Degree',
    icon: BookOpen,
    description: 'Standard university degree or diploma',
    defaultTitle: 'Bachelor of Science in Information Technology',
    fields: [
      { keyName: 'degree_name', displayName: 'Degree Name', type: 'string', required: true },
      { keyName: 'major', displayName: 'Major / Specialization', type: 'string', required: true },
      { keyName: 'graduation_date', displayName: 'Graduation Date', type: 'date', required: true },
      { keyName: 'gpa', displayName: 'Final GPA', type: 'number', required: false },
      { keyName: 'honors', displayName: 'Latin Honors', type: 'string', required: false },
      SKILL_TAGS_FIELD,
    ]
  },
  {
    id: 'bootcamp_cert',
    name: 'Bootcamp Certificate',
    icon: Code,
    description: 'Technical skills or coding bootcamp',
    defaultTitle: 'Full-Stack Web Development Bootcamp',
    fields: [
      { keyName: 'program_name', displayName: 'Program Name', type: 'string', required: true },
      { keyName: 'hours_completed', displayName: 'Hours Completed', type: 'number', required: true },
      { keyName: 'capstone_url', displayName: 'Capstone Project URL', type: 'string', required: false },
      { keyName: 'passed_with_distinction', displayName: 'Passed with Distinction', type: 'boolean', required: false },
      SKILL_TAGS_FIELD,
    ]
  },
  {
    id: 'event_badge',
    name: 'Event / Hackathon Badge',
    icon: Award,
    description: 'Participation or placement in an event',
    defaultTitle: 'Regional Hackathon 2026',
    fields: [
      { keyName: 'event_name', displayName: 'Event Name', type: 'string', required: true },
      { keyName: 'track_category', displayName: 'Track / Category', type: 'string', required: true },
      { keyName: 'placement', displayName: 'Placement (e.g., 1 for 1st)', type: 'number', required: false },
      { keyName: 'project_name', displayName: 'Project Name', type: 'string', required: false },
      SKILL_TAGS_FIELD,
    ]
  }
];

export default function SchemaBuilder() {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<SchemaField[]>([{ id: crypto.randomUUID(), ...SKILL_TAGS_FIELD }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>('custom');

  const loadTemplate = (templateId: string) => {
    setActiveTemplate(templateId);
    setError(null);
    setSuccess(false);

    if (templateId === 'custom') {
      setTitle('');
      // Custom always starts with the skill_tags field pre-added so it's never forgotten
      setFields([{ id: crypto.randomUUID(), ...SKILL_TAGS_FIELD }]);
      return;
    }

    const template = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setTitle(template.defaultTitle);
      setFields(template.fields.map(f => ({
        id: crypto.randomUUID(),
        keyName: f.keyName,
        displayName: f.displayName,
        type: f.type as 'string' | 'number' | 'boolean' | 'date',
        required: f.required
      })));
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      { id: crypto.randomUUID(), keyName: '', displayName: '', type: 'string', required: true },
    ]);
  };

  const removeField = (id: string) => {
    // Protect the skill_tags field from being deleted
    const field = fields.find(f => f.id === id);
    if (field?.keyName === 'skill_tags') return;
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const generateJsonSchema = () => {
    const schemaProperties: Record<string, { type: string; title: string }> = {};
    const requiredFields: string[] = [];

    fields.forEach((field) => {
      const safeKey = field.keyName || field.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (!safeKey) return;

      schemaProperties[safeKey] = {
        type: field.type,
        title: field.displayName,
      };

      if (field.required) requiredFields.push(safeKey);
    });

    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: schemaProperties,
      required: requiredFields,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) {
      setError("Please provide a title for this credential template.");
      return;
    }
    if (fields.length === 0) {
      setError("You must add at least one field to the schema.");
      return;
    }
    if (!fields.some(f => f.keyName === 'skill_tags')) {
      setError("Every template must include a 'Skills' field so students can be matched to opportunities.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSchema = generateJsonSchema();
      const response = await fetch('/api/schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, json_schema: finalSchema }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to publish schema');

      setSuccess(true);
      setTitle('');
      setFields([{ id: crypto.randomUUID(), ...SKILL_TAGS_FIELD }]);
      setActiveTemplate('custom');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish schema');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0E1220] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-[#1E2536] max-w-5xl mx-auto">
      <div className="mb-8 border-b dark:border-[#1E2536] pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Certificate Template Builder <HelpTip text="Templates define the structure of your certificates — what fields appear, what type of data each field accepts, and which are required. Once saved, templates become available in the 'Issue Certificate' and 'Bulk Upload' tabs. You can choose from presets or build a custom one from scratch." /></h2>
        <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-1">
          Choose what information appears on the certificate and how it&apos;s labeled.
        </p>
      </div>

      {/* Template Selector */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Choose a preset or start from scratch
        </label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => loadTemplate('custom')}
            className={`flex flex-col items-start p-4 border rounded-xl transition-all text-left ${
              activeTemplate === 'custom'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500'
                : 'border-gray-200 dark:border-[#283042] hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <FileText className={`w-6 h-6 mb-2 ${activeTemplate === 'custom' ? 'text-blue-600' : 'text-gray-400 dark:text-[#64748B]'}`} />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Custom Template</span>
            <span className="text-xs text-gray-500 dark:text-[#94A3B8] mt-1">Start with a blank template</span>
          </button>

          {PRESET_TEMPLATES.map((preset) => {
            const Icon = preset.icon;
            const isActive = activeTemplate === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadTemplate(preset.id)}
                className={`flex flex-col items-start p-4 border rounded-xl transition-all text-left ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-[#283042] hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-blue-600' : 'text-gray-400 dark:text-[#64748B]'}`} />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{preset.name}</span>
                <span className="text-xs text-gray-500 dark:text-[#94A3B8] mt-1 line-clamp-2">{preset.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Title */}
        <div className="bg-gray-50 dark:bg-[#131825] p-6 rounded-xl border border-gray-100 dark:border-[#1E2536]">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Template Name (visible on certificate) <HelpTip text="This is the main title that will appear on every certificate issued using this template. Students will see it on their dashboard. Use clear, official names like 'Bachelor of Science in Information Technology' or 'Full-Stack Web Development Bootcamp'." />
          </label>
          <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-3">This title appears on the student&apos;s certificate details.</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Web Development Masterclass"
            className="w-full px-4 py-3 border border-gray-300 dark:border-[#283042] rounded-lg focus:ring-2 focus:ring-[#06B4C9] focus:border-[#06B4C9] outline-none transition-shadow bg-white dark:bg-[#0E1220] dark:text-white"
            required
          />
        </div>

        {/* Dynamic Fields List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b dark:border-[#1E2536] pb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Template Fields <HelpTip text="Each field becomes a piece of information the registrar fills in when issuing a certificate. For example: GPA, Honours, Graduation Date, Program Name. The 'Skills' field is always required — it determines what skill tags appear on the student's profile. You can add, remove, and reorder fields as needed." /></h3>
              <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Choose the pieces of information to show on the certificate.</p>
            </div>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-2 text-sm bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/15 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-[#131825] border-2 border-dashed border-gray-200 dark:border-[#283042] rounded-xl text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-[#64748B]" />
              <p className="text-sm font-medium text-gray-600 dark:text-[#94A3B8]">No fields added yet.</p>
              <p className="text-xs mt-1">Click "Add Field" or pick a preset to start.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isSkillTags = field.keyName === 'skill_tags';
                return (
                  <div
                    key={field.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border shadow-sm transition-colors group ${
                      isSkillTags
                        ? 'bg-accent-10 border-accent'
                        : 'bg-white dark:bg-[#131825] border-gray-200 dark:border-[#283042] hover:border-blue-300'
                    }`}
                  >
                    <div className="pt-2 text-gray-400 font-mono text-xs w-6 text-center">
                      {index + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-5">
                        <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                          {isSkillTags ? <><Lock className="w-3 h-3 flex-shrink-0" /> Skills Field (Required)</> : 'What should this field be called?'}
                        </label>
                        <input
                          type="text"
                          value={field.displayName}
                          onChange={(e) => !isSkillTags && updateField(field.id, {
                            displayName: e.target.value,
                            keyName: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_')
                          })}
                          readOnly={isSkillTags}
                          placeholder="e.g., Final Grade"
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none ${
                            isSkillTags ? 'bg-accent-10 text-accent font-semibold cursor-not-allowed' : 'focus:ring-1 focus:ring-accent'
                          }`}
                          required
                        />
                        {isSkillTags && (
                          <p className="text-[10px] text-accent mt-1 flex items-start gap-1">
                            This field is locked and required for specifying the skills earned by the student.
                          </p>
                        )}
                        {!isSkillTags && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            This is the label registrars will see when filling in the certificate form.
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Field Type <HelpTip size={12} text="Controls what kind of input this field accepts: 'Text' for names and descriptions, 'Number' for grades or hours, 'Date' for dates with a calendar picker, or 'Yes/No' for simple toggles like 'Passed with Distinction'." /></label>
                        <select
                          value={field.type}
                          onChange={(e) => !isSkillTags && updateField(field.id, { type: e.target.value as SchemaField['type'] })}
                          disabled={isSkillTags}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white outline-none ${
                            isSkillTags ? 'opacity-60 cursor-not-allowed' : 'focus:ring-1 focus:ring-blue-500'
                          }`}
                        >
                          <option value="string">Text (names, descriptions)</option>
                          <option value="number">Number (grades, hours)</option>
                          <option value="boolean">Yes / No (distinctions)</option>
                          <option value="date">Date (with calendar picker)</option>
                        </select>
                      </div>
                      <div className="md:col-span-3 flex items-center pt-6">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => !isSkillTags && updateField(field.id, { required: e.target.checked })}
                              disabled={isSkillTags}
                              className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                            />
                          <span className="font-medium">Required</span>
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      disabled={isSkillTags}
                      className={`p-2 rounded-lg transition-all mt-4 ${
                        isSkillTags
                          ? 'text-gray-200 cursor-not-allowed'
                          : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                      }`}
                      title={isSkillTags ? 'Skill Tags field cannot be removed' : 'Remove field'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 flex items-center gap-3 text-sm font-medium">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            Template saved and available to issue certificates.
          </div>
        )}

        <div className="pt-6 border-t flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || fields.length === 0}
            className="flex items-center gap-2 bg-[#06B4C9] text-white disabled:opacity-30 px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:opacity-90 active:scale-95"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Template
          </button>
        </div>
      </form>
    </div>
  );
}