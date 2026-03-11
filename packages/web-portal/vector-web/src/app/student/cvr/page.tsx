'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers';
import { z } from 'zod';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import CVRSuccessModal from '@/components/dashboard/CVRSuccessModal';
import CVRAnalysisPanel from '@/components/cvr/CVRAnalysisPanel'; // Phase 12
import CVRPreviewModal from '@/components/cvr/CVRPreviewModal';
import HelpTip from '@/components/shared/HelpTip';
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

type CVRHistoryItem = {
  id: string;
  generated_at: string;
  template: string | null;
  credential_ids: string[];
  snapshot: any;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sanitizeArray = (arr: any[]) =>
  arr.filter((item) =>
    Object.values(item).some((v: any) => v !== null && v !== undefined && String(v).trim() !== '')
  );

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CVRPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [selectedColor, setSelectedColor] = useState('#06B4C9');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Skills
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  // Available verified credentials to pull into CVR
  const [availableCertifications, setAvailableCertifications] = useState<any[]>([]);

  // CVR History
  const [cvrHistory, setCvrHistory] = useState<CVRHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Generated state
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const dbFormDataRef = useRef<typeof formData | null>(null);

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
  // Auto-save draft to localStorage (debounced, skips during initial load)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      localStorage.setItem('cvr_form_draft', JSON.stringify(formData));
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, loading]);

  // Save immediately when the tab/window is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!loading) localStorage.setItem('cvr_form_draft', JSON.stringify(formData));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, loading]);

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

        const dbData = {
          fullName: userRecord?.full_name || '',
          email: session.user.email || '',
          phone: profileRecord?.phone || '',
          title: profileRecord?.major || '',
          summary: profileRecord?.bio || '',
          portfolio: profileRecord?.linkedin_url || '',
        };
        dbFormDataRef.current = dbData as typeof formData;
        setFormData((prev) => ({ ...prev, ...dbData }));

        if (userRecord?.wallet_address) await fetchVerifiedSkills(userRecord.wallet_address);

        const { data: certs } = await supabase
          .from('verified_credentials')
          .select('*')
          .eq('user_id', session.user.id);

        if (certs) setAvailableCertifications(certs);

        // Load CVR history
        await fetchCVRHistory(session.user.id);

        // Restore draft if user had unsaved work
        const savedDraft = localStorage.getItem('cvr_form_draft');
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setFormData(draft);
            setDraftBanner(true);
          } catch {
            localStorage.removeItem('cvr_form_draft');
          }
        }
      } catch (error) {
        console.error('CVR Data Error:', error);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [router]);

  // ---------------------------------------------------------------------------
  // CVR History fetch
  // ---------------------------------------------------------------------------
  const fetchCVRHistory = async (userId: string) => {
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('cvr_exports')
        .select('id, generated_at, template, credential_ids, snapshot')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false });

      if (data) setCvrHistory(data);
    } catch (err) {
      console.error('CVR history fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

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
  // Copy verify link
  // ---------------------------------------------------------------------------
  const handleCopyLink = (id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    navigator.clipboard.writeText(`${baseUrl}/verify/cvr/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // ---------------------------------------------------------------------------
  // Build snapshot (shared between preview & generate)
  // ---------------------------------------------------------------------------
  const buildSnapshot = () => {
    const finalSkills = availableSkills.filter((s) => selectedSkillIds.includes(s.id));
    const credentialIds = availableCertifications
      .filter((c) =>
        formData.certifications.some(
          (fc) => fc.name === c.skill_name && fc.verified === true
        )
      )
      .map((c) => c.id);

    const snapshot: any = {
      generatedAt: new Date().toISOString(),
      template: selectedTemplate,
      color: selectedColor,
      skills: finalSkills,
      fullName: formData.fullName,
      email: formData.email,
    };
    if (formData.phone) snapshot.phone = formData.phone;
    if (formData.portfolio) snapshot.portfolio = formData.portfolio;
    if (formData.linkedin) snapshot.linkedin = formData.linkedin;
    if (formData.title) snapshot.title = formData.title;
    if (formData.summary) snapshot.summary = formData.summary;

    const cleaned = (arr: any[]) => sanitizeArray(arr);
    if (cleaned(formData.education).length) snapshot.education = cleaned(formData.education);
    if (cleaned(formData.experience).length) snapshot.experience = cleaned(formData.experience);
    if (cleaned(formData.projects).length) snapshot.projects = cleaned(formData.projects);
    if (cleaned(formData.certifications).length) snapshot.certifications = cleaned(formData.certifications);
    if (cleaned(formData.awards).length) snapshot.awards = cleaned(formData.awards);

    return { snapshot, credentialIds };
  };

  // ---------------------------------------------------------------------------
  // Preview CVR (validates → opens preview modal)
  // ---------------------------------------------------------------------------
  const handlePreviewCVR = (e: React.FormEvent) => {
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

    const { snapshot } = buildSnapshot();
    setPreviewData(snapshot);
    setIsPreviewOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Confirm & Generate CVR (called from preview modal)
  // ---------------------------------------------------------------------------
  const handleConfirmGenerate = async () => {
    setIsConfirming(true);
    try {
      const { snapshot, credentialIds } = buildSnapshot();

      // Save CVR export to DB — get a stable UUID for QR code
      let cvrId: string | null = null;
      try {
        const res = await fetch('/api/cvr/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: selectedTemplate,
            credential_ids: credentialIds,
            snapshot,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          cvrId = data.id;
        } else {
          console.warn('[CVR] Export save failed — falling back to local UUID');
        }
      } catch (err) {
        console.warn('[CVR] Export API unreachable — falling back to local UUID', err);
      }

      const credentialId = cvrId || credentialIds[0] || crypto.randomUUID();

      const cvrData = {
        ...snapshot,
        credentialId,
        isCvrExport: !!cvrId,
      };

      localStorage.setItem('sampleCVRData', JSON.stringify(cvrData));
      localStorage.setItem('pendingCVR', 'true');
      localStorage.removeItem('cvr_form_draft'); // clear draft once successfully generated

      setGeneratedData(cvrData);
      setIsGenerated(true);
      setIsPreviewOpen(false);
      setPreviewData(null);
      setIsSuccessModalOpen(true);

      // Refresh history so new export appears immediately
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await fetchCVRHistory(session.user.id);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCreateNew = () => {
    setIsGenerated(false);
    setGeneratedData(null);
    setSelectedSkillIds(availableSkills.filter((s) => s.verified).map((s) => s.id));
  };

  // ---------------------------------------------------------------------------
  // Phase 12: Derive latest snapshot for AI analysis panel
  // Parsed defensively here (outside JSX) to keep the render clean.
  // ---------------------------------------------------------------------------
  const latestSnapshot =
    cvrHistory.length > 0
      ? typeof cvrHistory[0].snapshot === 'string'
        ? JSON.parse(cvrHistory[0].snapshot)
        : cvrHistory[0].snapshot
      : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {isGenerated ? 'Credential Verified Resume (CVR)' : 'Credential Verified Resume'}
          <HelpTip text="A CVR is a resume where your certificates are linked to tamper-proof records, so employers can instantly verify they're real." />
        </h1>
        <p className="text-sm md:text-base text-gray-500">
          {isGenerated
            ? 'Your verified resume is ready to share with employers'
            : 'Build a resume backed by your verified certificates'}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse bg-white rounded-xl border border-gray-200">
          Syncing Profile & Blockchain Data...
        </div>
      ) : !isGenerated ? (
        <>
          {/* ----------------------------------------------------------------
            CVR History Panel
            Shows all past exports. Latest = green, older = amber "Outdated".
            Student can copy any link or open the verify page directly.
            ---------------------------------------------------------------- */}
          {cvrHistory.length > 0 && (
            <div className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Your CVR History <HelpTip size={14} text="Every resume you generate is saved permanently. Share the latest link with employers so they can verify your credentials." />
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Each version is saved permanently. Share the latest link with employers.
                  </p>
                </div>
                <span className="text-xs font-medium text-[#06B4C9] bg-[#06B4C9]/10 border border-[#06B4C9]/20 px-3 py-1 rounded-full">
                  {cvrHistory.length} export{cvrHistory.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {cvrHistory.map((cvr, index) => {
                  const isLatest = index === 0;
                  const snapshot = typeof cvr.snapshot === 'string'
                    ? JSON.parse(cvr.snapshot)
                    : cvr.snapshot;
                  const skillCount = snapshot?.skills?.length || 0;
                  const certCount = cvr.credential_ids?.length || 0;

                  return (
                    <div
                      key={cvr.id}
                      className={`px-6 py-4 flex items-center justify-between gap-4 ${isLatest ? 'bg-[#06B4C9]/10' : ''}`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${isLatest ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">
                              {formatDateTime(cvr.generated_at)}
                            </span>
                            {isLatest ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Latest
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                Outdated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">
                            {cvr.template || 'professional'} template
                            {certCount > 0 && ` · ${certCount} verified credential${certCount !== 1 ? 's' : ''}`}
                            {skillCount > 0 && ` · ${skillCount} skill${skillCount !== 1 ? 's' : ''}`}
                          </p>
                          <p className="text-xs font-mono text-gray-300 mt-0.5 truncate">{cvr.id}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/cvr/${cvr.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#06B4C9] hover:text-[#06B4C9] hover:underline flex items-center gap-1"
                        >
                          View
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          onClick={() => handleCopyLink(cvr.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                            copied === cvr.id
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isLatest
                              ? 'bg-[#06B4C9] text-white border-[#06B4C9] hover:bg-[#06B4C9]/80'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {copied === cvr.id ? '✓ Copied' : isLatest ? 'Copy Latest Link' : 'Copy Link'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Draft restored banner */}
          {draftBanner && (
            <div className="mb-4 flex items-center justify-between gap-4 bg-[#06B4C9]/10 border border-[#06B4C9]/30 text-[#06B4C9] text-sm px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>Draft restored &mdash; your unsaved changes have been recovered.</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setDraftBanner(false)}
                  className="px-3 py-1 bg-[#06B4C9] text-white text-xs font-semibold rounded-lg hover:bg-[#06B4C9]/80 transition-colors"
                >Keep</button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('cvr_form_draft');
                    if (dbFormDataRef.current) setFormData((prev) => ({ ...prev, ...dbFormDataRef.current }));
                    setDraftBanner(false);
                  }}
                  className="px-3 py-1 border border-[#06B4C9]/40 text-[#06B4C9] text-xs font-semibold rounded-lg hover:bg-[#06B4C9]/10 transition-colors"
                >Discard</button>
              </div>
            </div>
          )}

          <form onSubmit={handlePreviewCVR} className="w-full">
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
              <EducationSection
                items={formData.experience as any}
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

              {/* Preview & Generate */}
              <div>
                <button
                  type="submit"
                  className="w-full md:w-auto px-8 py-3 bg-[#06B4C9] hover:bg-[#06B4C9]/80 !text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview CVR
                </button>
              </div>
            </div>
          </form>

          {/* ----------------------------------------------------------------
            Phase 12 — AI CVR Analysis Panel
            Renders below the form once the student has at least one export.
            Analyzes the latest saved CVR snapshot via Gemini.
            latestSnapshot is derived above the return statement.
            ---------------------------------------------------------------- */}
          {latestSnapshot && (
            <div className="mt-4">
              <CVRAnalysisPanel snapshot={latestSnapshot} />
            </div>
          )}
        </>
      ) : (
        /* Generated CVR display */
        <div className="w-full">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Resume preview will render here</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-8 py-3 bg-[#06B4C9] hover:bg-[#06B4C9]/80 text-white rounded-lg font-bold shadow-lg shadow-[#06B4C9]/20 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={handleCreateNew}
                className="px-8 py-3 bg-white border-2 border-gray-200 hover:border-[#06B4C9] hover:bg-[#06B4C9]/10 text-gray-700 hover:text-[#06B4C9] rounded-lg font-bold transition-all flex items-center gap-2"
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

      <CVRPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setPreviewData(null); }}
        onConfirm={handleConfirmGenerate}
        isGenerating={isConfirming}
        data={previewData}
      />
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