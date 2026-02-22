'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers';
import { z } from 'zod';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import CVRSuccessModal from '@/components/dashboard/CVRSuccessModal';
import {
  PersonalDetailsSection,
  EducationSection,
  ExperienceSection,
  ProjectsSection,
  CertificationsSection,
  VerifiedCertificationsBlock,
  SkillsSection,
  TemplateSelector,
  type SkillItem,
} from '@/components/cvr/CVRFormSections';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
const resumeSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required (min 2 chars)'),
  title: z.string().min(2, 'Professional Title is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().or(z.literal('')),
  linkedin: z.string().url('Must be a valid URL (https://...)').optional().or(z.literal('')),
  portfolio: z.string().url('Must be a valid URL (https://...)').optional().or(z.literal('')),
  summary: z.string().max(600, 'Summary must be under 600 characters').optional(),
  education: z
    .array(
      z.object({
        degree: z.string().optional(),
        school: z.string().optional(),
        location: z.string().optional(),
        year: z.string().optional(),
        honors: z.string().optional(),
      })
    )
    .optional(),
  experience: z
    .array(
      z.object({
        title: z.string().optional(),
        company: z.string().optional(),
        dates: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FormData = {
  fullName: string;
  email: string;
  phone: string;
  portfolio: string;
  linkedin: string;
  title: string;
  summary: string;
  education: { degree: string; school: string; location: string; year: string; honors: string }[];
  experience: { title: string; company: string; dates: string; description: string }[];
  projects: { title: string; description: string; technologies: string; role: string }[];
  certifications: { name: string; issuer: string; date: string; verified: boolean }[];
  awards: { title: string; description: string }[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sanitizeArray = (arr: any[]) =>
  arr.filter((item) =>
    Object.values(item).some((v: any) => v !== null && v !== undefined && String(v).trim() !== '')
  );

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CVRPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [selectedColor, setSelectedColor] = useState('#6d28d9');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Skills
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  // Available verified credentials to pull into CVR
  const [availableCertifications, setAvailableCertifications] = useState<any[]>([]);

  // Generated state
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    linkedin: '',
    title: '',
    summary: '',
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    awards: [],
  });

  // ---------------------------------------------------------------------------
  // Array helpers (generic section add/remove/update)
  // ---------------------------------------------------------------------------
  const addItem = (section: keyof FormData, blank: any) =>
    setFormData((prev) => ({ ...prev, [section]: [...(prev[section] as any[]), blank] }));

  const removeItem = (section: keyof FormData, index: number) =>
    setFormData((prev) => ({
      ...prev,
      [section]: (prev[section] as any[]).filter((_, i) => i !== index),
    }));

  const updateItem = (section: keyof FormData, index: number, field: string, value: string) =>
    setFormData((prev) => {
      const next = [...(prev[section] as any[])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [section]: next };
    });

  // ---------------------------------------------------------------------------
  // Field change + error clear
  // ---------------------------------------------------------------------------
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); return; }

        const { data: userRecord } = await supabase
          .from('users')
          .select('full_name, wallet_address')
          .eq('id', session.user.id)
          .single();

        const { data: profileRecord } = await supabase
          .from('profiles')
          .select('phone, major, bio, linkedin_url')
          .eq('id', session.user.id)
          .maybeSingle();

        setFormData((prev) => ({
          ...prev,
          fullName: userRecord?.full_name || '',
          email: session.user.email || '',
          phone: profileRecord?.phone || '',
          title: profileRecord?.major || '',
          summary: profileRecord?.bio || '',
          portfolio: profileRecord?.linkedin_url || '',
        }));

        if (userRecord?.wallet_address) await fetchVerifiedSkills(userRecord.wallet_address);

        const { data: certs } = await supabase
          .from('verified_credentials')
          .select('*')
          .eq('user_id', session.user.id);

        if (certs) setAvailableCertifications(certs);
      } catch (error) {
        console.error('CVR Data Error:', error);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [router]);

  // ---------------------------------------------------------------------------
  // Blockchain skill fetch
  // ---------------------------------------------------------------------------
  const fetchVerifiedSkills = async (walletAddress: string) => {
    try {
      const provider =
        typeof window !== 'undefined' && (window as any).ethereum
          ? new ethers.BrowserProvider((window as any).ethereum, 'any')
          : new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');

      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      const foundSkills: SkillItem[] = [];

      for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
        if (typeof skillId !== 'number') continue;
        try {
          const balance = await contract.balanceOf(walletAddress, skillId);
          if (balance > 0) foundSkills.push({ id: `chain-${skillId}`, name: skillName, verified: true });
        } catch { /* ignore read errors */ }
      }

      setAvailableSkills(foundSkills);
      setSelectedSkillIds(foundSkills.map((s) => s.id));
    } catch (error) {
      console.error('Blockchain Scan Failed:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // Skills handlers
  // ---------------------------------------------------------------------------
  const handleSkillToggle = (skillId: string) =>
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );

  const handleAddCustomSkill = (skill: SkillItem) => {
    setAvailableSkills((prev) => [...prev, skill]);
    setSelectedSkillIds((prev) => [...prev, skill.id]);
  };

  // ---------------------------------------------------------------------------
  // Verified cert → CVR certifications
  // ---------------------------------------------------------------------------
  const handleAddVerifiedCertification = (cert: any) => {
    const exists = formData.certifications.some((c) => c.name === cert.skill_name && c.verified);
    if (exists) return;
    setFormData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: cert.skill_name,
          issuer: 'Vector University (Blockchain Verified)',
          date: new Date(cert.issued_at).toLocaleDateString(),
          verified: true,
        },
      ],
    }));
  };

  // ---------------------------------------------------------------------------
  // Generate CVR
  // ---------------------------------------------------------------------------
  const handleGenerateCVR = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = resumeSchema.safeParse(formData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) newErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(newErrors);
      alert('Please fix the errors in the form before generating.');
      return;
    }

    const finalSkills = availableSkills.filter((s) => selectedSkillIds.includes(s.id));

    const cvrData: any = {
      generatedAt: new Date().toISOString(),
      template: selectedTemplate,
      color: selectedColor,
      skills: finalSkills,
      fullName: formData.fullName,
      email: formData.email,
    };

    if (formData.phone) cvrData.phone = formData.phone;
    if (formData.portfolio) cvrData.portfolio = formData.portfolio;
    if (formData.linkedin) cvrData.linkedin = formData.linkedin;
    if (formData.title) cvrData.title = formData.title;
    if (formData.summary) cvrData.summary = formData.summary;

    const cleaned = (arr: any[]) => sanitizeArray(arr);
    if (cleaned(formData.education).length) cvrData.education = cleaned(formData.education);
    if (cleaned(formData.experience).length) cvrData.experience = cleaned(formData.experience);
    if (cleaned(formData.projects).length) cvrData.projects = cleaned(formData.projects);
    if (cleaned(formData.certifications).length) cvrData.certifications = cleaned(formData.certifications);
    if (cleaned(formData.awards).length) cvrData.awards = cleaned(formData.awards);

    localStorage.setItem('sampleCVRData', JSON.stringify(cvrData));
    localStorage.setItem('pendingCVR', 'true');

    setGeneratedData(cvrData);
    setIsGenerated(true);
    setIsSuccessModalOpen(true);
  };

  const handleCreateNew = () => {
    setIsGenerated(false);
    setGeneratedData(null);
    setSelectedSkillIds(availableSkills.filter((s) => s.verified).map((s) => s.id));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardLayout>
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
            <PersonalDetailsSection
              formData={formData}
              errors={errors}
              onChange={handleChange}
            />
            <EducationSection
              items={formData.education}
              onAdd={() => addItem('education', { degree: '', school: '', location: '', year: '', honors: '' })}
              onRemove={(i) => removeItem('education', i)}
              onUpdate={(i, f, v) => updateItem('education', i, f, v)}
            />
            <ExperienceSection
              items={formData.experience}
              onAdd={() => addItem('experience', { title: '', company: '', dates: '', description: '' })}
              onRemove={(i) => removeItem('experience', i)}
              onUpdate={(i, f, v) => updateItem('experience', i, f, v)}
            />
            <ProjectsSection
              items={formData.projects}
              onAdd={() => addItem('projects', { title: '', description: '', technologies: '', role: '' })}
              onRemove={(i) => removeItem('projects', i)}
              onUpdate={(i, f, v) => updateItem('projects', i, f, v)}
            />
            <VerifiedCertificationsBlock
              availableCertifications={availableCertifications}
              addedCertifications={formData.certifications}
              onAdd={handleAddVerifiedCertification}
            />
            <CertificationsSection
              certifications={formData.certifications}
              awards={formData.awards}
              onAddCertification={() => addItem('certifications', { name: '', issuer: '', date: '', verified: false })}
              onAddAward={() => addItem('awards', { title: '', description: '' })}
              onRemoveCertification={(i) => removeItem('certifications', i)}
              onRemoveAward={(i) => removeItem('awards', i)}
              onUpdateCertification={(i, f, v) => updateItem('certifications', i, f, v)}
              onUpdateAward={(i, f, v) => updateItem('awards', i, f, v)}
            />
            <SkillsSection
              availableSkills={availableSkills}
              selectedSkillIds={selectedSkillIds}
              onToggle={handleSkillToggle}
              onAddCustom={handleAddCustomSkill}
            />
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              selectedColor={selectedColor}
              onTemplateChange={setSelectedTemplate}
              onColorChange={setSelectedColor}
            />

            {/* Submit */}
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
        /* Generated CVR display */
        <div className="w-full">
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
        onDownload={() => { setIsSuccessModalOpen(false); setIsExportModalOpen(true); }}
      />
      <ExportCVRModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </DashboardLayout>
  );
}