'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import CVRSuccessModal from '@/components/dashboard/CVRSuccessModal';

// Type for our dynamic skills
interface SkillItem {
  id: string;
  name: string;
  verified: boolean;
}

export default function CVRPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  
  // Dynamic Data States
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    linkedin: '',
    title: '',
    summary: '',
    education: [] as {
      degree: string;
      school: string;
      location: string;
      year: string;
      honors: string;
    }[],
    experience: [] as {
      title: string;
      company: string;
      dates: string;
      description: string;
    }[],
    projects: [] as {
      title: string;
      description: string;
      technologies: string;
      role: string;
    }[],
    certifications: [] as {
      name: string;
      issuer: string;
      date: string;
      verified: boolean;
    }[],
    awards: [] as {
      title: string;
      description: string;
    }[],
  });

  // Helper to add empty items
  const addEducation = () => setFormData(prev => ({ 
    ...prev, education: [...prev.education, { degree: '', school: '', location: '', year: '', honors: '' }] 
  }));
  const addExperience = () => setFormData(prev => ({
    ...prev, experience: [...prev.experience, { title: '', company: '', dates: '', description: '' }]
  }));
  const addProject = () => setFormData(prev => ({
    ...prev, projects: [...prev.projects, { title: '', description: '', technologies: '', role: '' }]
  }));
  const addCertification = () => setFormData(prev => ({
    ...prev, certifications: [...prev.certifications, { name: '', issuer: '', date: '', verified: false }]
  }));
  const addAward = () => setFormData(prev => ({
    ...prev, awards: [...prev.awards, { title: '', description: '' }]
  }));

  // Helper to remove items
  const removeItem = (section: keyof typeof formData, index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: prev[section].filter((_: any, i: number) => i !== index)
    }));
  };

  // Helper to update item fields
  const updateItem = (section: keyof typeof formData, index: number, field: string, value: string) => {
     setFormData((prev: any) => {
       const newItems = [...prev[section]];
       newItems[index] = { ...newItems[index], [field]: value };
       return { ...prev, [section]: newItems };
     });
  };

  // ⚡⚡⚡ 1. FETCH REAL DATA ⚡⚡⚡
  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // A. Fetch User & Profile Data
        const { data: userRecord } = await supabase
          .from('users')
          .select('full_name, wallet_address')
          .eq('id', session.user.id)
          .single();

        const { data: profileRecord } = await supabase
          .from('profiles')
          .select('phone, major, bio, linkedin_url') // Assuming 'major' is used as Title
          .eq('id', session.user.id)
          .maybeSingle();

        // B. Populate Form
        setFormData(prev => ({
          ...prev,
          fullName: userRecord?.full_name || '',
          email: session.user.email || '',
          phone: profileRecord?.phone || '',
          title: profileRecord?.major || '',
          summary: profileRecord?.bio || '',
          portfolio: profileRecord?.linkedin_url || ''
        }));

        // C. Fetch Blockchain Skills
        if (userRecord?.wallet_address) {
          await fetchVerifiedSkills(userRecord.wallet_address);
        } else {
          // If no wallet, just show empty list (or could add default unverified list)
          setAvailableSkills([]); 
        }

      } catch (error) {
        console.error("CVR Data Error:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  // Helper: Check Blockchain for Skills
  const fetchVerifiedSkills = async (walletAddress: string) => {
    try {
      // Connect to blockchain
      const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      
      const foundSkills: SkillItem[] = [];

      for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
        if (typeof skillId !== 'number') continue;

        try {
          const balance = await contract.balanceOf(walletAddress, skillId);
          if (balance > 0) {
            foundSkills.push({
              id: `chain-${skillId}`,
              name: skillName,
              verified: true // Mark as verified
            });
          }
        } catch (e) { /* Ignore read errors */ }
      }
      
      setAvailableSkills(foundSkills);
      // Auto-select verified skills
      setSelectedSkillIds(foundSkills.map(s => s.id));

    } catch (error) {
      console.error("Blockchain Scan Failed:", error);
    }
  };

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim()) {
      const newId = `custom-${Date.now()}`;
      // Add to available list as unverified
      setAvailableSkills(prev => [...prev, { id: newId, name: customSkill, verified: false }]);
      // Auto-select it
      setSelectedSkillIds(prev => [...prev, newId]);
      setCustomSkill('');
    }
  };

  const handleGenerateCVR = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter the full skill objects based on selection
    const finalSkills = availableSkills.filter(s => selectedSkillIds.includes(s.id));

    const cvrData = {
      ...formData,
      template: selectedTemplate,
      skills: finalSkills, // Pass the full objects (name + verified status)
      generatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem('sampleCVRData', JSON.stringify(cvrData));
    localStorage.setItem('pendingCVR', 'true');
    
    setGeneratedData(cvrData);
    setIsGenerated(true);
    setIsSuccessModalOpen(true);
  };

  const handleCreateNew = () => {
    setIsGenerated(false);
    setGeneratedData(null);
    // Reset selected skills to only verified ones (optional preference)
    setSelectedSkillIds(availableSkills.filter(s => s.verified).map(s => s.id));
  };

  const handleDownload = () => {
    setIsSuccessModalOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 -mt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {isGenerated ? 'Credential Verified Resume (CVR)' : 'Generate CVR'}
        </h1>
        <p className="text-sm md:text-base text-gray-500">
          {isGenerated 
            ? 'Your blockchain-verified resume preview' 
            : 'Create your blockchain-verified resume with verified skills'}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse bg-white rounded-xl border border-gray-200">
          Syncing Profile & Blockchain Data...
        </div>
      ) : !isGenerated ? (
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="+63 912 345 6789"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn Profile (Optional)
                </label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio/Website (GitHub for Devs)
                </label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="https://github.com/johndoe"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Summary
                </label>
                <p className="text-xs text-gray-500 mb-2">A short 2–4 sentence paragraph summarizing who you are, your key skills, career goals, and the value you bring.</p>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="e.g., Diligent Computer Science student with a passion for blockchain technology..."
                />
              </div>
            </div>
          </div>

          {/* 3. Education Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Education
              <button type="button" onClick={addEducation} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Education</button>
            </h2>
            {formData.education.map((edu: any, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 relative">
                <button type="button" onClick={() => removeItem('education', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Degree (e.g. BS Information Technology)" className="p-2 border rounded" value={edu.degree} onChange={(e) => updateItem('education', index, 'degree', e.target.value)} />
                  <input placeholder="School Name" className="p-2 border rounded" value={edu.school} onChange={(e) => updateItem('education', index, 'school', e.target.value)} />
                  <input placeholder="Location" className="p-2 border rounded" value={edu.location} onChange={(e) => updateItem('education', index, 'location', e.target.value)} />
                  <input placeholder="Graduation Year/Date" className="p-2 border rounded" value={edu.year} onChange={(e) => updateItem('education', index, 'year', e.target.value)} />
                  <input placeholder="Academic Honors (Optional)" className="md:col-span-2 p-2 border rounded" value={edu.honors} onChange={(e) => updateItem('education', index, 'honors', e.target.value)} />
                </div>
              </div>
            ))}
             {formData.education.length === 0 && <p className="text-sm text-gray-500 italic">No education added yet.</p>}
          </div>

          {/* 4. Work Experience Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Work Experience
              <button type="button" onClick={addExperience} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Experience</button>
            </h2>
            {formData.experience.map((exp: any, index: number) => (
               <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 relative">
                <button type="button" onClick={() => removeItem('experience', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Job Title" className="p-2 border rounded" value={exp.title} onChange={(e) => updateItem('experience', index, 'title', e.target.value)} />
                  <input placeholder="Company Name" className="p-2 border rounded" value={exp.company} onChange={(e) => updateItem('experience', index, 'company', e.target.value)} />
                  <input placeholder="Dates (e.g. Jan 2023 - Present)" className="md:col-span-2 p-2 border rounded" value={exp.dates} onChange={(e) => updateItem('experience', index, 'dates', e.target.value)} />
                  <textarea placeholder="Description (Bullet points recommended)" rows={3} className="md:col-span-2 p-2 border rounded" value={exp.description} onChange={(e) => updateItem('experience', index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            {formData.experience.length === 0 && <p className="text-sm text-gray-500 italic">No work experience added yet.</p>}
          </div>

           {/* 5. Projects Section */}
           <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Projects
              <button type="button" onClick={addProject} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Project</button>
            </h2>
            {formData.projects.map((proj: any, index: number) => (
               <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 relative">
                <button type="button" onClick={() => removeItem('projects', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <div className="grid grid-cols-1 gap-4">
                  <input placeholder="Project Title" className="p-2 border rounded" value={proj.title} onChange={(e) => updateItem('projects', index, 'title', e.target.value)} />
                  <input placeholder="Technologies Used" className="p-2 border rounded" value={proj.technologies} onChange={(e) => updateItem('projects', index, 'technologies', e.target.value)} />
                   <input placeholder="Your Role" className="p-2 border rounded" value={proj.role} onChange={(e) => updateItem('projects', index, 'role', e.target.value)} />
                  <textarea placeholder="Short description..." rows={2} className="p-2 border rounded" value={proj.description} onChange={(e) => updateItem('projects', index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
             {formData.projects.length === 0 && <p className="text-sm text-gray-500 italic">No projects added yet.</p>}
          </div>

           {/* 6. Certifications & Awards Section */}
           <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Certifications & Awards
               <div className="space-x-4">
                <button type="button" onClick={addCertification} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Certification</button>
                <button type="button" onClick={addAward} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Award</button>
               </div>
            </h2>
             {/* Certs */}
            {formData.certifications.map((cert: any, index: number) => (
               <div key={`cert-${index}`} className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100 relative">
                <button type="button" onClick={() => removeItem('certifications', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">Certification</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Certification Name" className="p-2 border rounded" value={cert.name} onChange={(e) => updateItem('certifications', index, 'name', e.target.value)} />
                  <input placeholder="Issuing Organization" className="p-2 border rounded" value={cert.issuer} onChange={(e) => updateItem('certifications', index, 'issuer', e.target.value)} />
                  <input placeholder="Date Earned" className="p-2 border rounded" value={cert.date} onChange={(e) => updateItem('certifications', index, 'date', e.target.value)} />
                </div>
              </div>
            ))}
            {/* Awards */}
            {formData.awards.map((award: any, index: number) => (
               <div key={`award-${index}`} className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-100 relative">
                <button type="button" onClick={() => removeItem('awards', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <p className="text-xs text-yellow-600 font-semibold mb-2 uppercase">Award</p>
                <div className="grid grid-cols-1 gap-4">
                  <input placeholder="Award Title" className="p-2 border rounded" value={award.title} onChange={(e) => updateItem('awards', index, 'title', e.target.value)} />
                  <textarea placeholder="Description" rows={2} className="p-2 border rounded" value={award.description} onChange={(e) => updateItem('awards', index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
             {formData.certifications.length === 0 && formData.awards.length === 0 && <p className="text-sm text-gray-500 italic">No certifications or awards added yet.</p>}
          </div>

          {/* Skills Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Skills</h2>
            
            {/* Verified Skills */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                Your Verified Skills
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Blockchain Synced</span>
              </p>
              {availableSkills.filter(s => s.verified).length > 0 ? (
                <div className="space-y-2">
                  {availableSkills.filter(s => s.verified).map((skill) => (
                    <label key={skill.id} className="flex items-center p-3 border border-green-200 bg-green-50/30 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSkillIds.includes(skill.id)}
                        onChange={() => handleSkillToggle(skill.id)}
                        className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="font-medium text-gray-900">{skill.name}</span>
                        {/* Subtle verified badge inline */}
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
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

            {/* Custom Skills (Previously "Add Custom Skill") */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Add Custom Skills</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
              {/* Display Custom Skills */}
              {availableSkills.filter(s => !s.verified).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableSkills
                    .filter(s => !s.verified)
                    .map((skill) => (
                      <span key={skill.id} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border transition-all ${
                        selectedSkillIds.includes(skill.id) 
                          ? 'bg-purple-50 border-purple-200 text-purple-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={selectedSkillIds.includes(skill.id)}
                          onChange={() => handleSkillToggle(skill.id)}
                          className="mr-1 w-3 h-3 text-purple-600 rounded-sm cursor-pointer"
                        />
                        {skill.name}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Template Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Choose Template</h2>
              <span className="text-sm text-purple-600 font-medium bg-purple-50 px-3 py-1 rounded-full">
                {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} Selected
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Professional Template Option */}
              <label className={`group relative cursor-pointer block`}>
                <input
                  type="radio"
                  name="template"
                  value="professional"
                  checked={selectedTemplate === 'professional'}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="sr-only"
                />
                <div className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedTemplate === 'professional' 
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}>
                  {/* Visual Preview */}
                  <div className="aspect-[3/4] bg-white p-3 flex flex-col gap-2 relative">
                    <div className="w-1/3 h-2 bg-gray-800 rounded-sm mb-2"></div>
                    <div className="w-full h-px bg-gray-200"></div>
                    <div className="flex gap-2">
                       <div className="w-2/3 space-y-1">
                          <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                          <div className="w-5/6 h-1.5 bg-gray-200 rounded-sm"></div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                       </div>
                       <div className="w-1/3 space-y-1">
                          <div className="w-full h-1.5 bg-gray-300 rounded-sm"></div>
                          <div className="w-3/4 h-1.5 bg-gray-300 rounded-sm"></div>
                       </div>
                    </div>
                    {selectedTemplate === 'professional' && (
                      <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                        <div className="bg-purple-600 text-white p-2 rounded-full shadow-lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Professional</h3>
                    <p className="text-xs text-gray-500 mt-1">Clean, structured layout best for corporate and enterprise roles.</p>
                  </div>
                </div>
              </label>

              {/* Modern Template Option */}
              <label className={`group relative cursor-pointer block`}>
                <input
                  type="radio"
                  name="template"
                  value="modern"
                  checked={selectedTemplate === 'modern'}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="sr-only"
                />
                <div className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedTemplate === 'modern' 
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}>
                   {/* Visual Preview */}
                   <div className="aspect-[3/4] bg-white flex relative">
                    <div className="w-1/3 bg-gray-100 p-2 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-gray-300 mx-auto mb-2"></div>
                      <div className="w-full h-1.5 bg-gray-300 rounded-sm"></div>
                      <div className="w-2/3 h-1.5 bg-gray-300 rounded-sm mx-auto"></div>
                    </div>
                    <div className="w-2/3 p-2 space-y-2">
                      <div className="w-1/2 h-3 bg-purple-600 rounded-sm mb-2"></div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                      <div className="w-5/6 h-1.5 bg-gray-200 rounded-sm"></div>
                    </div>
                    {selectedTemplate === 'modern' && (
                      <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                        <div className="bg-purple-600 text-white p-2 rounded-full shadow-lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Modern</h3>
                    <p className="text-xs text-gray-500 mt-1">Creative two-column design with verified skills sidebar.</p>
                  </div>
                </div>
              </label>

               {/* Minimal Template Option */}
               <label className={`group relative cursor-pointer block`}>
                <input
                  type="radio"
                  name="template"
                  value="minimal"
                  checked={selectedTemplate === 'minimal'}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="sr-only"
                />
                <div className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedTemplate === 'minimal' 
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}>
                   {/* Visual Preview */}
                   <div className="aspect-[3/4] bg-white p-4 flex flex-col gap-3 relative">
                    <div className="w-full flex justify-between items-center border-b pb-2">
                       <div className="w-1/3 h-2 bg-gray-800 rounded-sm"></div>
                    </div>
                    <div className="space-y-2">
                       <div className="w-1/4 h-1.5 bg-gray-400 rounded-sm"></div>
                       <div className="w-full h-1 bg-gray-200 rounded-sm"></div>
                       <div className="w-full h-1 bg-gray-200 rounded-sm"></div>
                    </div>
                    <div className="space-y-2">
                       <div className="w-1/4 h-1.5 bg-gray-400 rounded-sm"></div>
                       <div className="w-full h-1 bg-gray-200 rounded-sm"></div>
                    </div>
                    {selectedTemplate === 'minimal' && (
                      <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                        <div className="bg-purple-600 text-white p-2 rounded-full shadow-lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Minimal</h3>
                    <p className="text-xs text-gray-500 mt-1">Simple, monochrome layout focused purely on content.</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
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
          <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 space-y-8 shadow-sm">
            
            {/* 1. Header & Contact Information */}
            <div className="text-center border-b border-gray-200 pb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-wide">{generatedData.fullName}</h1>
              <p className="text-xl text-purple-700 font-semibold mb-6 tracking-tight">{generatedData.title}</p>
              
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {generatedData.email}
                </div>
                {generatedData.phone && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {generatedData.phone}
                  </div>
                )}
                {generatedData.linkedin && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                    <a href={generatedData.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 underline decoration-dotted">LinkedIn</a>
                  </div>
                )}
                {generatedData.portfolio && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    <a href={generatedData.portfolio} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 underline decoration-dotted">Portfolio / GitHub</a>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Professional Summary */}
            {generatedData.summary && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-3 uppercase tracking-wider">Professional Summary</h3>
                <p className="text-gray-700 leading-relaxed text-justify">{generatedData.summary}</p>
              </div>
            )}

            {/* 3. Education */}
            {generatedData.education && generatedData.education.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-4 uppercase tracking-wider">Education</h3>
                <div className="space-y-4">
                  {generatedData.education.map((edu: any, index: number) => (
                    <div key={index} className="flex flex-col md:flex-row md:justify-between gap-1">
                      <div>
                        <h4 className="font-bold text-gray-900">{edu.degree}</h4>
                        <p className="text-gray-700">{edu.school}, {edu.location}</p>
                        {edu.honors && <p className="text-sm text-gray-500 italic mt-1">Accolades: {edu.honors}</p>}
                      </div>
                      <div className="text-purple-700 font-medium whitespace-nowrap text-sm mt-1 md:mt-0">{edu.year}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Skills (Technical & Soft) */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-4 uppercase tracking-wider">Key Skills</h3>
              <div className="flex flex-wrap gap-2">
                {generatedData.skills.length > 0 ? (
                  generatedData.skills.map((skill: SkillItem, index: number) => (
                    <div key={index} className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                      skill.verified 
                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {skill.name}
                      {skill.verified && (
                        <svg className="w-4 h-4 ml-1.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      )}
                    </div>
                  ))
                ) : (
                   <span className="text-gray-500 italic">No specific skills listed.</span>
                )}
              </div>
            </div>

            {/* 5. Work Experience */}
            {generatedData.experience && generatedData.experience.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-4 uppercase tracking-wider">Experience</h3>
                <div className="space-y-6">
                  {generatedData.experience.map((exp: any, index: number) => (
                    <div key={index} className="relative pl-4 border-l-2 border-gray-200">
                      <div className="flex flex-col md:flex-row md:justify-between items-start mb-1">
                        <h4 className="font-bold text-gray-900 text-lg leading-tight">{exp.title}</h4>
                        <span className="text-sm font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{exp.dates}</span>
                      </div>
                      <p className="text-gray-700 font-medium mb-2">{exp.company}</p>
                      <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Projects */}
            {generatedData.projects && generatedData.projects.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-4 uppercase tracking-wider">Relevant Projects</h3>
                <div className="grid grid-cols-1 gap-4">
                  {generatedData.projects.map((proj: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                         <h4 className="font-bold text-gray-900">{proj.title}</h4>
                         {proj.role && <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{proj.role}</span>}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{proj.description}</p>
                      {proj.technologies && (
                        <p className="text-xs text-purple-600 font-mono">Tech Stack: {proj.technologies}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Certifications */}
             {generatedData.certifications && generatedData.certifications.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-4 uppercase tracking-wider">Certifications</h3>
                <ul className="space-y-3">
                  {generatedData.certifications.map((cert: any, index: number) => (
                    <li key={index} className="flex items-start justify-between">
                       <div>
                         <div className="flex items-center gap-2">
                           <span className="font-bold text-gray-900">{cert.name}</span>
                           {cert.verified && (
                             <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-white bg-green-500 px-1.5 py-0.5 rounded shadow-sm">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                               Verified
                             </span>
                           )}
                         </div>
                         <p className="text-sm text-gray-600">{cert.issuer}</p>
                       </div>
                       <span className="text-sm text-gray-500">{cert.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

             {/* 8. Awards */}
             {generatedData.awards && generatedData.awards.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-4 uppercase tracking-wider">Awards & Achievements</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {generatedData.awards.map((award: any, index: number) => (
                    <li key={index}>
                      <span className="font-semibold">{award.title}</span> - <span className="text-sm">{award.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 9. References */}
            <div>
               <h3 className="text-lg font-bold text-gray-900 border-b-2 border-purple-600 pb-1 mb-3 uppercase tracking-wider">References</h3>
               <p className="text-gray-600 italic">Available upon request.</p>
            </div>


            {/* Blockchain Footer & QR */}
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
                  
                  {/* Left: Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="font-bold text-gray-900 text-lg mb-1">Blockchain Verified Resume</h4>
                    <p className="text-sm text-gray-600 mb-4">The skills and certifications in this document are cryptographically verified by Vector University on the blockchain.</p>
                    
                    <div className="grid grid-cols-1 gap-2 text-xs text-gray-500 font-mono bg-white p-3 rounded border border-gray-200">
                      <div className="flex justify-between">
                         <span>Contract:</span>
                         <span className="truncate max-w-[150px]">{CONTRACT_ADDRESS}</span>
                      </div>
                      <div className="flex justify-between">
                         <span>Timestamp:</span>
                         <span>{new Date(generatedData.generatedAt).toISOString()}</span>
                      </div>
                      <div className="flex justify-between">
                         <span>Validator:</span>
                         <span className="text-green-600 font-bold">Vector Consensus Node</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: QR */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm mb-2">
                       {/* Placeholder QR - In production this would be dynamic */}
                       <div className="w-24 h-24 bg-gray-800 flex items-center justify-center text-white text-xs">
                          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="white">
                            <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M50,10 h30 v30 h-30 z M55,15 v20 h20 v-20 z M10,50 h30 v30 h-30 z M15,55 v20 h20 v-20 z M50,50 h10 v10 h-10 z M70,50 h10 v10 h-10 z M50,70 h10 v10 h-10 z" />
                          </svg>
                       </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Scan to Verify Authenticity</span>
                  </div>
              </div>
            </div>

            {/* Template Meta */}
            <div className="text-center text-xs text-gray-400 pt-4">
               Template: {generatedData.template} • Generated via Vector Platform
            </div>

            {/* Action Buttons - Re-added */}
            <div className="flex flex-wrap justify-center gap-4 pt-6 mt-6 border-t border-gray-100">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-lg shadow-purple-200 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={handleCreateNew}
                className="px-8 py-3 bg-white border-2 border-gray-200 hover:border-purple-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 rounded-lg font-bold transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Resume
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