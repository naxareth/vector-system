'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

// Define the shape of our dynamic schema builder state
interface SchemaField {
  id: string;
  keyName: string; // The JSON key (e.g., 'hours_completed')
  displayName: string; // The human-readable label (e.g., 'Hours Completed')
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
}

export default function SchemaBuilder() {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addField = () => {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        keyName: '',
        displayName: '',
        type: 'string',
        required: true,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const generateJsonSchema = () => {
    const schemaProperties: Record<string, any> = {};
    const requiredFields: string[] = [];

    fields.forEach((field) => {
      // Ensure valid JSON keys (lowercase, no spaces)
      const safeKey = field.keyName.trim().toLowerCase().replace(/\s+/g, '_');
      if (!safeKey) return;

      schemaProperties[safeKey] = {
        type: field.type,
        title: field.displayName,
      };

      if (field.required) {
        requiredFields.push(safeKey);
      }
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

    setIsSubmitting(true);

    try {
      const finalSchema = generateJsonSchema();

      const response = await fetch('/api/schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          json_schema: finalSchema,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish schema');
      }

      setSuccess(true);
      setTitle('');
      setFields([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Credential Template Builder</h2>
        <p className="text-sm text-gray-500 mt-1">
          Design the custom fields that will be attached to this verifiable credential.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Schema Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name (e.g., Bootcamp Completion Certificate)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter template name..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>

        {/* Dynamic Fields List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Custom Fields</h3>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border-2 border-dashed rounded-lg text-gray-400">
              No fields added yet. Click "Add Field" to start building your template.
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={field.displayName}
                        onChange={(e) => updateField(field.id, { displayName: e.target.value, keyName: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        placeholder="e.g., Course Link"
                        className="w-full px-3 py-1.5 text-sm border rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Data Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white"
                      >
                        <option value="string">Text (String)</option>
                        <option value="number">Number</option>
                        <option value="boolean">Yes/No (Boolean)</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-center pt-5">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        Required Field
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-4"
                    title="Remove field"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 rounded-lg bg-green-50 text-green-700 flex items-center gap-2 text-sm">
            Template published to the W3C registry successfully!
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-4 border-t flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || fields.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Publish Schema Template
          </button>
        </div>
      </form>
    </div>
  );
}