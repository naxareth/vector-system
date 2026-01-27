'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import CVRSuccessModal from '@/components/dashboard/CVRSuccessModal';

export default function CVRPage() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    title: '',
    summary: '',
  });

  // Available verified skills
  const availableSkills = [
    { id: '1', name: 'Advanced SQL Querying' },
    { id: '2', name: 'React Application Development' },
    { id: '3', name: 'Data Structures & Algorithms' },
    { id: '4', name: 'Java OOP' },
  ];

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim()) {
      setSelectedSkills(prev => [...prev, `custom-${customSkill}`]);
      setCustomSkill('');
    }
  };

  const handleGenerateCVR = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store CVR data as sample
    const cvrData = {
      ...formData,
      template: selectedTemplate,
      skills: selectedSkills,
      generatedAt: new Date().toISOString(),
    };
    
    // Save to localStorage as sample
    localStorage.setItem('sampleCVRData', JSON.stringify(cvrData));
    console.log('CVR Sample Saved:', cvrData);
    
    // Set pending CVR flag in localStorage
    localStorage.setItem('pendingCVR', 'true');
    
    // Update state to show generated CVR
    setGeneratedData(cvrData);
    setIsGenerated(true);
    
    // Show success modal
    setIsSuccessModalOpen(true);
  };

  const handleCreateNew = () => {
    setIsGenerated(false);
    setGeneratedData(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      portfolio: '',
      title: '',
      summary: '',
    });
    setSelectedSkills([]);
    setSelectedTemplate('professional');
  };

  const handleDownload = () => {
    setIsSuccessModalOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {isGenerated ? 'Credential Verified Resume (CVR)' : 'Generate CVR'}
        </h1>
        <p className="text-sm md:text-base text-gray-500">
          {isGenerated 
            ? 'Your blockchain-verified resume preview' 
            : 'Create your blockchain-verified resume with verified skills'}
        </p>
      </div>

      {!isGenerated ? (
      <form onSubmit={handleGenerateCVR} className="max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6">
          {/* Personal Details Section */}
          <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Full-Stack Developer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+63 912 345 6789"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio/Website
                </label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://portfolio.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Summary
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief professional summary..."
                />
              </div>
            </div>
          </div>

          {/* Skills Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Skills</h2>
            
            {/* Verified Skills */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Your Verified Skills</p>
              <div className="space-y-2">
                {availableSkills.map((skill) => (
                  <label key={skill.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => handleSkillToggle(skill.id)}
                      className="mr-3 w-4 h-4 text-purple-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{skill.name}</span>
                    </div>
                    <svg className="w-5 h-5 text-green-600 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </label>
                ))}
              </div>
            </div>

            {/* Add Custom Skill */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Add Custom Skill</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter skill name"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium"
                >
                  Add
                </button>
              </div>
              {selectedSkills.filter(s => s.startsWith('custom-')).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSkills
                    .filter(s => s.startsWith('custom-'))
                    .map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {skill.replace('custom-', '')}
                        <button
                          type="button"
                          onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skill))}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Template Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['professional', 'modern', 'minimal'].map((template) => (
                <label
                  key={template}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template}
                    checked={selectedTemplate === template}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 capitalize">{template}</span>
                    {selectedTemplate === template && (
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {template === 'professional' && 'Classic layout for corporate roles'}
                    {template === 'modern' && 'Creative design for tech positions'}
                    {template === 'minimal' && 'Clean and simple format'}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate CVR
            </button>
          </div>
        </div>
      </form>
      ) : (
        /* Generated CVR Display */
        <div className="w-full">
      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6">
            {/* Header Section */}
            <div className="text-center border-b border-gray-200 pb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{generatedData.fullName}</h2>
              <p className="text-xl text-purple-600 font-medium mb-4">{generatedData.title}</p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {generatedData.email}
                </div>
                {generatedData.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {generatedData.phone}
                  </div>
                )}
                {generatedData.portfolio && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <a href={generatedData.portfolio} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                      Portfolio
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {generatedData.summary && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Summary</h3>
                <p className="text-gray-700 leading-relaxed">{generatedData.summary}</p>
              </div>
            )}

            {/* Verified Skills Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedData.skills.map((skillId: string, index: number) => {
                  const verifiedSkill = availableSkills.find(s => s.id === skillId);
                  const isVerified = !!verifiedSkill;
                  const skillName = verifiedSkill?.name || skillId.replace('custom-', '');
                  
                  return (
                    <div key={index} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      {isVerified ? (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className="font-medium text-gray-900">{skillName}</span>
                      {isVerified && (
                        <span className="ml-auto text-xs text-green-600 font-medium">Verified</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Template & Generated Date */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span>Template: <span className="capitalize font-medium">{generatedData.template}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Generated: {new Date(generatedData.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CVR
              </button>
              <button
                onClick={handleCreateNew}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New CVR
              </button>
            </div>
          </div>
        </div>
      )}
      <CVRSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onDownload={handleDownload}
      />

      {/* Export CVR Modal */}
      <ExportCVRModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
