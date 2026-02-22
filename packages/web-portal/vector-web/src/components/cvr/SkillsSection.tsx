'use client';
import { useState } from 'react';

export interface SkillItem {
  id: string;
  name: string;
  verified: boolean;
}

interface SkillsSectionProps {
  availableSkills: SkillItem[];
  selectedSkillIds: string[];
  onToggle: (skillId: string) => void;
  onAddCustom: (skill: SkillItem) => void;
}

export default function SkillsSection({
  availableSkills,
  selectedSkillIds,
  onToggle,
  onAddCustom,
}: SkillsSectionProps) {
  const [customSkill, setCustomSkill] = useState('');

  const handleAdd = () => {
    if (!customSkill.trim()) return;
    onAddCustom({ id: `custom-${Date.now()}`, name: customSkill.trim(), verified: false });
    setCustomSkill('');
  };

  const verifiedSkills = availableSkills.filter((s) => s.verified);
  const customSkills = availableSkills.filter((s) => !s.verified);

  return (
    <div className="pt-6 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Skills</h2>

      {/* Verified Skills */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
          Your Verified Skills
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Blockchain Synced
          </span>
        </p>
        {verifiedSkills.length > 0 ? (
          <div className="space-y-2">
            {verifiedSkills.map((skill) => (
              <label
                key={skill.id}
                className="flex items-center p-3 border border-green-200 bg-green-50/30 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSkillIds.includes(skill.id)}
                  onChange={() => onToggle(skill.id)}
                  className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1 flex justify-between items-center">
                  <span className="font-medium text-gray-900">{skill.name}</span>
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic p-3 border border-dashed border-gray-200 rounded-lg">
            No verified skills found in wallet. Mint some tokens to see them here!
          </div>
        )}
      </div>

      {/* Custom Skills */}
      <div>
        <p className="text-sm text-gray-600 mb-3">Add Custom Skills</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            placeholder="Enter skill name"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium"
          >
            Add
          </button>
        </div>
        {customSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {customSkills.map((skill) => (
              <span
                key={skill.id}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border transition-all ${
                  selectedSkillIds.includes(skill.id)
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSkillIds.includes(skill.id)}
                  onChange={() => onToggle(skill.id)}
                  className="mr-1 w-3 h-3 text-purple-600 rounded-sm cursor-pointer"
                />
                {skill.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}