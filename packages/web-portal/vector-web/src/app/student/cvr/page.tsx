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
  const [selectedColor, setSelectedColor] = useState('#6d28d9');
  
  // Dynamic Data States
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  // New State for Available Certifications
  const [availableCertifications, setAvailableCertifications] = useState<any[]>([]);
  
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

        // D. Fetch Verified Certifications (from Registrar Dashboard)
        const { data: certs } = await supabase
          .from('verified_credentials')
          .select('*')
          .eq('user_id', session.user.id);

        if (certs) {
          setAvailableCertifications(certs);
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
    const sanitizeArray = (arr: any[]) => arr.filter(item => Object.values(item).some((v: any) => v !== null && v !== undefined && String(v).trim() !== ''));

    const cvrData: any = {
      generatedAt: new Date().toISOString(),
      template: selectedTemplate,
      color: selectedColor,
      skills: finalSkills,
    };

    // Required fields
    cvrData.fullName = formData.fullName;
    cvrData.email = formData.email;

    // Optional single-value fields — only include when non-empty
    if (formData.phone && String(formData.phone).trim() !== '') cvrData.phone = formData.phone;
    if (formData.portfolio && String(formData.portfolio).trim() !== '') cvrData.portfolio = formData.portfolio;
    if (formData.linkedin && String(formData.linkedin).trim() !== '') cvrData.linkedin = formData.linkedin;
    if (formData.title && String(formData.title).trim() !== '') cvrData.title = formData.title;
    if (formData.summary && String(formData.summary).trim() !== '') cvrData.summary = formData.summary;

    // Optional arrays — include only when there is meaningful content
    const cleanedEducation = sanitizeArray(formData.education || []);
    if (cleanedEducation.length) cvrData.education = cleanedEducation;

    const cleanedExperience = sanitizeArray(formData.experience || []);
    if (cleanedExperience.length) cvrData.experience = cleanedExperience;

    const cleanedProjects = sanitizeArray(formData.projects || []);
    if (cleanedProjects.length) cvrData.projects = cleanedProjects;

    const cleanedCerts = sanitizeArray(formData.certifications || []);
    if (cleanedCerts.length) cvrData.certifications = cleanedCerts;

    const cleanedAwards = sanitizeArray(formData.awards || []);
    if (cleanedAwards.length) cvrData.awards = cleanedAwards;
    
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

  const handleAddVerifiedCertification = (cert: any) => {
    // Check if already added
    const exists = formData.certifications.some((c: any) => c.name === cert.skill_name && c.verified);
    if (exists) return;

    setFormData(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: cert.skill_name,
          issuer: 'Vector University (Blockchain Verified)',
          date: new Date(cert.issued_at).toLocaleDateString(),
          verified: true
        }
      ]
    }));
  };

  const handleDownload = () => {
    setIsSuccessModalOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 -mt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {isGenerated ? 'Credential Verified Resume (CVR)' : 'Credential Verified Resume'}
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
      <form onSubmit={handleGenerateCVR} className="w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6">
          {/* Personal Details Section - Updated Layout */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
            <div className="space-y-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div>
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

              <div>
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

              <div>
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


           {/* Available Verified Certifications (New Block) */}
           {availableCertifications.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Available Verified Certifications
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Blockchain Synced</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableCertifications.map((cert) => {
                   const isAdded = formData.certifications.some((c: any) => c.name === cert.skill_name && c.verified);
                   return (
                    <div key={cert.id} className={`p-4 rounded-lg border flex justify-between items-center ${isAdded ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-purple-200 shadow-sm'}`}>
                      <div>
                        <h3 className="font-bold text-gray-800">{cert.skill_name}</h3>
                        <p className="text-xs text-gray-500">Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddVerifiedCertification(cert)}
                        disabled={isAdded}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          isAdded 
                            ? 'text-green-700 bg-green-100 cursor-default' 
                            : 'text-white bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {isAdded ? 'Added ✓' : '+ Add to CVR'}
                      </button>
                    </div>
                   );
                })}
              </div>
            </div>
          )}

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

               {/* Simple Template Option */}
               <label className={`group relative cursor-pointer block`}>
                <input
                  type="radio"
                  name="template"
                  value="simple"
                  checked={selectedTemplate === 'simple'}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="sr-only"
                />
                <div className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedTemplate === 'simple' 
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}>
                   {/* Visual Preview - Traditional resume look */}
                   <div className="aspect-[3/4] bg-white p-4 flex flex-col gap-2 relative">
                    <div className="text-center space-y-0.5 mb-1">
                       <div className="w-2/3 h-2.5 bg-gray-800 rounded-sm mx-auto"></div>
                       <div className="w-1/2 h-1 bg-gray-300 rounded-sm mx-auto"></div>
                       <div className="w-2/5 h-1 bg-gray-300 rounded-sm mx-auto"></div>
                    </div>
                    <div className="w-full h-px bg-gray-800"></div>
                    <div className="w-full h-1 bg-gray-100 rounded-sm italic"></div>
                    <div className="space-y-1.5 mt-1">
                       <div className="w-2/5 h-1.5 bg-gray-800 rounded-sm tracking-widest"></div>
                       <div className="w-full h-px bg-gray-400"></div>
                       <div className="flex justify-between">
                         <div className="w-1/3 h-1 bg-gray-700 rounded-sm"></div>
                         <div className="w-1/4 h-1 bg-gray-400 rounded-sm"></div>
                       </div>
                       <div className="pl-3 space-y-0.5">
                         <div className="flex items-start gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full mt-0.5 flex-shrink-0"></div><div className="w-full h-1 bg-gray-200 rounded-sm"></div></div>
                         <div className="flex items-start gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full mt-0.5 flex-shrink-0"></div><div className="w-5/6 h-1 bg-gray-200 rounded-sm"></div></div>
                       </div>
                    </div>
                    <div className="space-y-1 mt-1">
                       <div className="w-1/4 h-1.5 bg-gray-800 rounded-sm"></div>
                       <div className="w-full h-px bg-gray-400"></div>
                       <div className="w-full h-1 bg-gray-200 rounded-sm"></div>
                    </div>
                    {selectedTemplate === 'simple' && (
                      <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                        <div className="bg-purple-600 text-white p-2 rounded-full shadow-lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Simple</h3>
                    <p className="text-xs text-gray-500 mt-1">Traditional, no-frills resume. Clean and ATS-friendly.</p>
                  </div>
                </div>
              </label>
            </div>
            {/* Color Picker for Template Accent */}
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Primary Color</label>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-10 h-8 p-0 border rounded-md"
                aria-label="Choose primary color"
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm w-28"
                aria-label="Primary color hex"
              />
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500">Preview</span>
                <span className="w-6 h-6 rounded-full border" style={{ background: selectedColor }} />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 !text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
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
        /* Generated CVR Display - (keeping the existing preview section unchanged) */
        <div className="w-full">
          {/* I'm keeping all the template rendering code the same as before - no changes needed there */}
          {/* ... rest of the generated resume display code ... */}
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Resume preview will render here</p>
            <div className="flex flex-wrap justify-center gap-4">
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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