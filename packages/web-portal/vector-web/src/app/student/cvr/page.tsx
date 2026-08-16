'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import CVRSuccessModal from '@/components/dashboard/CVRSuccessModal';
import CVRAnalysisPanel from '@/components/cvr/CVRAnalysisPanel'; // Phase 12
import CVRPreviewModal from '@/components/cvr/CVRPreviewModal';
import HelpTip from '@/components/shared/HelpTip';
import Pagination from '@/components/shared/Pagination';
import {
  PersonalDetailsSection,
  ProjectsSection,
  CertificationsSection,
  VerifiedCertificationsBlock,
  SkillsSection,
  TemplateSelector,
  LivePreviewPanel,
  templateList,
  type SkillItem,
} from '@/components/cvr/CVRFormSections';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CVRData, CVREducation, CVRExperience, CVRProject, CVRCertification, CVRAward } from '@/lib/schemas/cvr';

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
  certifications: { name: string; issuer: string; date: string; verified: boolean; id?: string }[];
  awards: { title: string; description: string }[];
};

type CVRHistoryItem = {
  id: string;
  generated_at: string;
  template: string | null;
  credential_ids: string[];
  snapshot: CVRData | string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sanitizeArray = (arr: Record<string, unknown>[]) =>
  arr.filter((item) =>
    Object.values(item).some((v: unknown) => v !== null && v !== undefined && String(v).trim() !== '')
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

/** Returns human-friendly relative time like "2 hours ago", "yesterday", "5 days ago" */
function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  return `${diffWeeks} weeks ago`;
}

/**
 * Heuristic resume strength score (0-100).
 * Evaluates: verified creds, summary, skills, experience, education, projects, contact completeness.
 */
function computeResumeScore(snapshot: Record<string, unknown> | null, credentialIds: string[]): number {
  if (!snapshot) return 0;
  let score = 0;

  // Verified credentials (max 25 pts)
  const credCount = credentialIds?.length || 0;
  score += Math.min(credCount * 10, 25);

  // Summary present & substantial (max 15 pts)
  const summary = (snapshot.summary as string) || '';
  if (summary.length > 100) score += 15;
  else if (summary.length > 30) score += 8;
  else if (summary.length > 0) score += 3;

  // Skills (max 15 pts)
  const skills = (snapshot.skills as unknown[]) || [];
  score += Math.min(skills.length * 3, 15);

  // Experience (max 15 pts)
  const exp = (snapshot.experience as unknown[]) || [];
  score += Math.min(exp.length * 5, 15);

  // Education (max 10 pts)
  const edu = (snapshot.education as unknown[]) || [];
  score += Math.min(edu.length * 5, 10);

  // Projects (max 10 pts)
  const proj = (snapshot.projects as unknown[]) || [];
  score += Math.min(proj.length * 5, 10);

  // Contact completeness (max 10 pts)
  if (snapshot.email) score += 2;
  if (snapshot.phone) score += 2;
  if (snapshot.linkedin) score += 3;
  if (snapshot.portfolio) score += 3;

  return Math.min(score, 100);
}

/** Get strength label from score */
function getStrength(score: number): 'strong' | 'needs-work' | 'weak' {
  if (score >= 70) return 'strong';
  if (score >= 45) return 'needs-work';
  return 'weak';
}

/** Auto-generate a resume name from the snapshot */
function getResumeName(snapshot: Record<string, unknown> | null, template: string | null, index: number): string {
  const title = (snapshot?.title as string) || '';
  const templateLabel = templateList.find(t => t.id === template)?.label || template || 'Professional';

  if (title) {
    // Use the professional title to generate a name
    return `${title} Resume`;
  }
  // Fallback to generic naming
  if (index === 0) return 'General Resume';
  return `Resume #${index + 1}`;
}

// ---------------------------------------------------------------------------
// Score Ring (small, for resume cards)
// ---------------------------------------------------------------------------
function CardScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Document Thumbnail (for resume cards, based on template type)
// ---------------------------------------------------------------------------
function MiniDocThumb({ template }: { template: string | null }) {
  const tpl = template || 'professional';
  // Different mini-doc visual based on template type
  const colors: Record<string, { header: string; accent: string }> = {
    'professional': { header: '#0F172A', accent: '#06B4C9' },
    'modern': { header: '#10b981', accent: '#0F172A' },
    'simple': { header: '#64748b', accent: '#94a3b8' },
    'two-column': { header: '#D97706', accent: '#f59e0b' },
  };
  const c = colors[tpl] || colors['professional'];

  return (
    <div className="w-14 h-[72px] bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
      <div className="p-1.5 flex flex-col gap-1 h-full">
        {/* Header bar */}
        <div className="w-full h-1.5 rounded-[1px]" style={{ backgroundColor: c.header }} />
        {tpl === 'modern' && (
          <div className="w-3/4 h-1 rounded-[1px]" style={{ backgroundColor: c.accent }} />
        )}
        {/* Content lines */}
        <div className="space-y-[3px] flex-1">
          <div className="w-full h-[2px] bg-gray-200 rounded-[1px]" />
          <div className="w-4/5 h-[2px] bg-gray-200 rounded-[1px]" />
          <div className="w-full h-[2px] bg-gray-200 rounded-[1px]" />
          {tpl === 'two-column' && (
            <>
              <div className="w-3/5 h-[2px] rounded-[1px]" style={{ backgroundColor: `${c.accent}40` }} />
              <div className="w-2/3 h-[2px] rounded-[1px]" style={{ backgroundColor: `${c.accent}30` }} />
            </>
          )}
          <div className="w-3/4 h-[2px] bg-gray-100 rounded-[1px]" />
          <div className="w-full h-[2px] bg-gray-100 rounded-[1px]" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------
type FilterType = 'all' | 'strong' | 'needs-work' | 'weak';
type SortType = 'strongest' | 'weakest' | 'newest' | 'oldest';

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
  const [availableCertifications, setAvailableCertifications] = useState<{ id: string; skill_name: string; issued_at: string }[]>([]);

  // CVR History
  const [cvrHistory, setCvrHistory] = useState<CVRHistoryItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_ITEMS_PER_PAGE = 4;

  // Generated state
  const [isGenerated, setIsGenerated] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [generatedData, setGeneratedData] = useState<CVRData | null>(null);

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<CVRData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const dbFormDataRef = useRef<typeof formData | null>(null);

  // --- NEW: Dashboard vs Form view toggle ---
  const [viewMode, setViewMode] = useState<'dashboard' | 'form'>('dashboard');
  const [editingCvrId, setEditingCvrId] = useState<string | null>(null);

  // --- NEW: Filter & Sort state ---
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('strongest');

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
  const addItem = (section: keyof FormData, blank: unknown) =>
    setFormData((prev) => ({ ...prev, [section]: [...(prev[section] as unknown[]), blank] }));

  const removeItem = (section: keyof FormData, index: number) =>
    setFormData((prev) => ({
      ...prev,
      [section]: (prev[section] as unknown[]).filter((_, i) => i !== index),
    }));

  const updateItem = (section: keyof FormData, index: number, field: string, value: string) =>
    setFormData((prev) => {
      const next = [...(prev[section] as Record<string, unknown>[])];
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
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        const { data: profileRecord } = await supabase
          .from('profiles')
          .select('phone, major, bio, linkedin_url, specialization, industry_sector, work_experience, education_history')
          .eq('id', session.user.id)
          .maybeSingle();

                interface ProfileWork { title?: string; company?: string; current?: boolean; start_date?: string; end_date?: string; description?: string; }
        const rawWork = Array.isArray(profileRecord?.work_experience) ? profileRecord.work_experience : typeof profileRecord?.work_experience === 'string' ? JSON.parse(profileRecord.work_experience) : [];
        const mappedWork = rawWork.map((w: ProfileWork) => ({
          title: w.title || '',
          company: w.company || '',
          dates: w.current ? `${w.start_date || ''} - Present` : `${w.start_date || ''} - ${w.end_date || ''}`,
          description: w.description || ''
        }));
        
        interface ProfileEdu { school?: string; degree?: string; field?: string; start_year?: string; end_year?: string; }
        const rawEdu = Array.isArray(profileRecord?.education_history) ? profileRecord.education_history : typeof profileRecord?.education_history === 'string' ? JSON.parse(profileRecord.education_history) : [];
        const mappedEdu = rawEdu.map((e: ProfileEdu) => ({
          school: e.school || '',
          degree: `${e.degree || ''} ${e.field || ''}`.trim(),
          location: '',
          year: e.start_year && e.end_year ? `${e.start_year} - ${e.end_year}` : e.end_year || e.start_year || '',
          honors: ''
        }));

        const dbData = {
          fullName: userRecord?.full_name || '',
          email: session.user.email || '',
          phone: profileRecord?.phone || '',
          title: profileRecord?.specialization || profileRecord?.major || '',
          summary: profileRecord?.bio || '',
          portfolio: profileRecord?.linkedin_url || '',
          experience: mappedWork,
          education: mappedEdu,
        };
        dbFormDataRef.current = dbData as typeof formData;
        setFormData((prev) => ({ ...prev, ...dbData }));


        const { data: certs } = await supabase
          .from('verified_credentials')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('revoked', false);

        if (certs) {
          setAvailableCertifications(certs);
          
          // Extract verified skills dynamically from the skill_tags of verified credentials
          const foundSkills: SkillItem[] = [];
          const seenSkills = new Set<string>();

          certs.forEach((cert: Record<string, unknown>) => {
            if (cert.skill_tags && Array.isArray(cert.skill_tags)) {
              cert.skill_tags.forEach((skillName: string) => {
                const normalized = skillName.trim();
                // Avoid duplicates
                if (normalized && !seenSkills.has(normalized.toLowerCase())) {
                  seenSkills.add(normalized.toLowerCase());
                  foundSkills.push({
                    id: `verified-${normalized.toLowerCase().replace(/\s+/g, '-')}`,
                    name: normalized,
                    verified: true
                  });
                }
              });
            }
          });
          
          setAvailableSkills(foundSkills);
          setSelectedSkillIds(foundSkills.map((s) => s.id));
        }

        // Load CVR history
        // eslint-disable-next-line react-hooks/immutability
        await fetchCVRHistory(session.user.id);

        // Restore draft if user had unsaved work and not discarded
        const draftDiscarded = localStorage.getItem('cvr_form_draft_discarded');
        const savedDraft = localStorage.getItem('cvr_form_draft');
        if (savedDraft && !draftDiscarded) {
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

      if (data) {
        setCvrHistory(data);
        setHistoryPage(1); // Reset page on new fetch
      }
    } catch (err) {
      console.error('CVR history fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ---------------------------------------------------------------------------

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
  const handleAddVerifiedCertification = (cert: { id: string; skill_name: string; issued_at: string }) => {
    const exists = formData.certifications.some((c) => c.id === cert.id);
    if (exists) return;
    setFormData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: `${cert.skill_name} (#${cert.id.split('-')[0]})`,
          issuer: 'Vector University (Institutionally Verified)',
          date: new Date(cert.issued_at).toLocaleDateString(),
          verified: true,
          id: cert.id,
        },
      ],
    }));
  };

  // ---------------------------------------------------------------------------
  // Copy verify link
  // ---------------------------------------------------------------------------
  const handleCopyLink = (id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
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

    const snapshot: CVRData = {
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

    const cleaned = (arr: Record<string, unknown>[]) => sanitizeArray(arr);
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

      const credentialId = (cvrId || credentialIds[0] || crypto.randomUUID()) as string;

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
      setViewMode('dashboard'); // Return to dashboard after generating
      setEditingCvrId(null);

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
    setEditingCvrId(null);
    setSelectedSkillIds(availableSkills.filter((s) => s.verified).map((s) => s.id));
    setViewMode('form');
  };

  // ---------------------------------------------------------------------------
  // NEW: Edit an existing CVR (populate form from snapshot)
  // ---------------------------------------------------------------------------
  const handleEditCvr = (cvr: CVRHistoryItem) => {
    const snapshot = typeof cvr.snapshot === 'string' ? JSON.parse(cvr.snapshot) : cvr.snapshot;
    if (!snapshot) return;

    // Populate form from snapshot
    setFormData((prev) => ({
      ...prev,
      fullName: snapshot.fullName || prev.fullName,
      email: snapshot.email || prev.email,
      phone: snapshot.phone || prev.phone,
      title: snapshot.title || prev.title,
      summary: snapshot.summary || prev.summary,
      portfolio: snapshot.portfolio || prev.portfolio,
      linkedin: snapshot.linkedin || prev.linkedin,
      education: snapshot.education || prev.education,
      experience: snapshot.experience || prev.experience,
      projects: snapshot.projects || prev.projects,
      certifications: snapshot.certifications || prev.certifications,
      awards: snapshot.awards || prev.awards,
    }));

    if (snapshot.template) setSelectedTemplate(snapshot.template);
    if (snapshot.color) setSelectedColor(snapshot.color);
    if (snapshot.skills) {
      const skillIds = snapshot.skills.map((s: SkillItem) => s.id);
      setSelectedSkillIds(skillIds);
    }

    setEditingCvrId(cvr.id);
    setViewMode('form');
    setIsGenerated(false);
  };

  // ---------------------------------------------------------------------------
  // NEW: Duplicate a CVR
  // ---------------------------------------------------------------------------
  const handleDuplicateCvr = async (cvr: CVRHistoryItem) => {
    const snapshot = typeof cvr.snapshot === 'string' ? JSON.parse(cvr.snapshot) : cvr.snapshot;
    if (!snapshot) return;

    try {
      const res = await fetch('/api/cvr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: cvr.template || 'professional',
          credential_ids: cvr.credential_ids || [],
          snapshot: { ...snapshot, generatedAt: new Date().toISOString() },
        }),
      });

      if (res.ok) {
        // Refresh history
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await fetchCVRHistory(session.user.id);
      }
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // NEW: Download a CVR (opens export modal with data)
  // ---------------------------------------------------------------------------
  const handleDownloadCvr = (cvr: CVRHistoryItem) => {
    const snapshot = typeof cvr.snapshot === 'string' ? JSON.parse(cvr.snapshot) : cvr.snapshot;
    if (!snapshot) return;

    localStorage.setItem('sampleCVRData', JSON.stringify({
      ...snapshot,
      credentialId: cvr.id,
      isCvrExport: true,
    }));
    localStorage.setItem('pendingCVR', 'true');
    setIsExportModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // NEW: Use a template (select template and open form)
  // ---------------------------------------------------------------------------
  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setEditingCvrId(null);
    setViewMode('form');
    setIsGenerated(false);
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
  // NEW: Compute scores and filter/sort resume cards
  // ---------------------------------------------------------------------------
  const scoredHistory = useMemo(() => {
    return cvrHistory.map((cvr, index) => {
      const snapshot = typeof cvr.snapshot === 'string' ? JSON.parse(cvr.snapshot) : cvr.snapshot;
      const score = computeResumeScore(snapshot, cvr.credential_ids);
      const strength = getStrength(score);
      const name = getResumeName(snapshot, cvr.template, index);
      const templateLabel = templateList.find(t => t.id === cvr.template)?.label || cvr.template || 'Professional';
      return { ...cvr, snapshot, score, strength, name, templateLabel };
    });
  }, [cvrHistory]);

  const filterCounts = useMemo(() => {
    const counts = { all: scoredHistory.length, strong: 0, 'needs-work': 0, weak: 0 };
    scoredHistory.forEach(r => { counts[r.strength]++; });
    return counts;
  }, [scoredHistory]);

  const filteredAndSorted = useMemo(() => {
    let items = activeFilter === 'all' ? scoredHistory : scoredHistory.filter(r => r.strength === activeFilter);
    
    switch (sortBy) {
      case 'strongest': items = [...items].sort((a, b) => b.score - a.score); break;
      case 'weakest': items = [...items].sort((a, b) => a.score - b.score); break;
      case 'newest': items = [...items].sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()); break;
      case 'oldest': items = [...items].sort((a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()); break;
    }
    return items;
  }, [scoredHistory, activeFilter, sortBy]);

  const paginatedCards = filteredAndSorted.slice(
    (historyPage - 1) * HISTORY_ITEMS_PER_PAGE,
    historyPage * HISTORY_ITEMS_PER_PAGE
  );

  // ---------------------------------------------------------------------------
  // NEW: Synced fields tracking (fields still matching DB values)
  // ---------------------------------------------------------------------------
  const syncedFields = useMemo(() => {
    const synced = new Set<string>();
    const db = dbFormDataRef.current;
    if (!db) return synced;
    if (formData.fullName === db.fullName && db.fullName) synced.add('fullName');
    if (formData.email === db.email && db.email) synced.add('email');
    if (formData.phone === db.phone && db.phone) synced.add('phone');
    if (formData.portfolio === db.portfolio && db.portfolio) synced.add('portfolio');
    if (formData.linkedin === db.linkedin && db.linkedin) synced.add('linkedin');
    return synced;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.fullName, formData.email, formData.phone, formData.portfolio, formData.linkedin]);

  // ---------------------------------------------------------------------------
  // NEW: Live score computed from current form state
  // ---------------------------------------------------------------------------
  const liveScore = useMemo(() => {
    const snapshotLike: Record<string, unknown> = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      linkedin: formData.linkedin,
      portfolio: formData.portfolio,
      title: formData.title,
      summary: formData.summary,
      skills: availableSkills.filter(s => selectedSkillIds.includes(s.id)),
      experience: formData.experience,
      education: formData.education,
      projects: formData.projects,
      certifications: formData.certifications,
    };
    const credIds = formData.certifications.filter(c => c.verified).map(c => c.id || '');
    return computeResumeScore(snapshotLike, credIds);
  }, [formData, selectedSkillIds, availableSkills]);

  // ---------------------------------------------------------------------------
  // NEW: Section tab helpers
  // ---------------------------------------------------------------------------
  const sectionHasContent = {
    personal: !!(formData.fullName && formData.email),
    projects: formData.projects.length > 0,
    certifications: formData.certifications.length > 0,
    skills: selectedSkillIds.length > 0,
    template: true,
  };

  const scrollToSection = (id: string) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const currentTemplateLabel = templateList.find(t => t.id === selectedTemplate)?.label || selectedTemplate;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardLayout>
      {loading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse bg-white rounded-xl border border-gray-200">
          Syncing Profile Data...
        </div>
      ) : viewMode === 'form' ? (
        /* ================================================================
           FORM VIEW — Editing or creating a new resume
           Redesigned: tabs, info banner, two-column with live preview
           ================================================================ */
        <>
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="mb-5">
            {/* Back link */}
            <button
              type="button"
              onClick={() => { setViewMode('dashboard'); setEditingCvrId(null); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#06B4C9] transition-colors mb-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Resumes
            </button>

            {/* Title row with action buttons */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {/* Doc icon */}
                <div className="flex-shrink-0 w-9 h-9 mt-0.5 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">
                    Credential verified resume
                  </h1>
                  <p className="text-xs text-gray-400 font-normal mt-0.5">
                    Template: <span className="font-medium text-gray-600">{currentTemplateLabel}</span> · Built from your verified profile
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const { snapshot } = buildSnapshot();
                    setPreviewData(snapshot);
                    setIsPreviewOpen(true);
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Preview PDF
                </button>
                <button
                  type="button"
                  onClick={(e) => handlePreviewCVR(e as unknown as React.FormEvent)}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1e293b] text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Save resume
                </button>
              </div>
            </div>
          </div>

          {/* ── Section Tabs ──────────────────────────────────────────── */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {([
              { id: 'personal', label: 'Personal details' },
              { id: 'projects', label: 'Projects' },
              { id: 'certifications', label: 'Certifications' },
              { id: 'skills', label: 'Skills' },
            ] as const).map((tab) => {
              const filled = sectionHasContent[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollToSection(tab.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border border-gray-200 bg-white hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  {filled ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Info Banner (prefilled from profile) ───────────────────── */}
          {syncedFields.size > 0 && (
            <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="font-semibold">Prefilled from your verified profile.</span>{' '}
                <span className="text-emerald-700">Name, email, phone, LinkedIn and GitHub were pulled in automatically. Try editing the fields below — the preview on the right updates live.</span>
              </div>
            </div>
          )}

          {/* ── Draft Restored Banner ──────────────────────────────────── */}
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
                    localStorage.setItem('cvr_form_draft_discarded', 'true');
                    if (dbFormDataRef.current) setFormData((prev) => ({ ...prev, ...dbFormDataRef.current }));
                    setDraftBanner(false);
                  }}
                  className="px-3 py-1 border border-[#06B4C9]/40 text-[#06B4C9] text-xs font-semibold rounded-lg hover:bg-[#06B4C9]/10 transition-colors"
                >Discard</button>
              </div>
            </div>
          )}

          {/* ── Two-Column Layout ──────────────────────────────────────── */}
          <form onSubmit={handlePreviewCVR} className="w-full">
            <div className="flex gap-6 items-start">
              {/* Left Column: Form Sections */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* Card: Personal Details */}
                <div id="section-personal" className="bg-white rounded-xl border border-gray-200 p-6 scroll-mt-4">
                  <PersonalDetailsSection
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    syncedFields={syncedFields}
                  />
                </div>

                {/* Card: Projects */}
                <div id="section-projects" className="bg-white rounded-xl border border-gray-200 p-6 scroll-mt-4">
                  <ProjectsSection
                    items={formData.projects}
                    onAdd={() => addItem('projects', { title: '', description: '', technologies: '', role: '' })}
                    onRemove={(i) => removeItem('projects', i)}
                    onUpdate={(i, f, v) => updateItem('projects', i, f, v)}
                  />
                </div>

                {/* Card: Certifications */}
                <div id="section-certifications" className="bg-white rounded-xl border border-gray-200 p-6 scroll-mt-4">
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
                </div>

                {/* Card: Skills */}
                <div id="section-skills" className="bg-white rounded-xl border border-gray-200 p-6 scroll-mt-4">
                  <SkillsSection
                    availableSkills={availableSkills}
                    selectedSkillIds={selectedSkillIds}
                    onToggle={handleSkillToggle}
                    onAddCustom={handleAddCustomSkill}
                  />
                </div>

                {/* Submit button (mobile/bottom) */}
                <div className="lg:hidden">
                  <button
                    type="submit"
                    className="w-full px-8 py-3 bg-[#0F172A] hover:bg-[#1e293b] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    Save resume
                  </button>
                </div>
              </div>

              {/* Right Column: Live Preview (sticky) */}
              <div className="w-[300px] xl:w-[340px] flex-shrink-0 hidden lg:block">
                <div className="sticky top-6">
                  <LivePreviewPanel
                    formData={formData}
                    selectedSkillIds={selectedSkillIds}
                    availableSkills={availableSkills}
                    score={liveScore}
                    onPreview={() => {
                      const { snapshot } = buildSnapshot();
                      setPreviewData(snapshot);
                      setIsPreviewOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Phase 12 — AI CVR Analysis Panel */}
          {latestSnapshot && (
            <div className="mt-5">
              <CVRAnalysisPanel snapshot={latestSnapshot} />
            </div>
          )}
        </>
      ) : (
        /* ================================================================
           DASHBOARD VIEW — "My Resumes" with filters and cards
           ================================================================ */
        <>
          {/* ── Page Header ────────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-1">
                My resumes
                <HelpTip text="A CVR is a resume where your certificates are linked to tamper-proof records, so employers can instantly verify they're real." />
              </h1>
              <p className="text-sm text-gray-400 font-normal">
                Manage drafts and see which resumes are strong enough to send
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex-shrink-0 px-5 py-2.5 bg-[#0F172A] hover:bg-[#1e293b] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New resume
            </button>
          </div>

          {/* ── Filter & Sort Bar ──────────────────────────────────────── */}
          {scoredHistory.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                {/* Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {([
                    { key: 'all' as FilterType, label: 'All', color: 'bg-gray-500', count: filterCounts.all },
                    { key: 'strong' as FilterType, label: 'Strong', color: 'bg-emerald-500', count: filterCounts.strong },
                    { key: 'needs-work' as FilterType, label: 'Needs work', color: 'bg-amber-500', count: filterCounts['needs-work'] },
                    { key: 'weak' as FilterType, label: 'Weak', color: 'bg-red-500', count: filterCounts.weak },
                  ]).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => { setActiveFilter(f.key); setHistoryPage(1); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        activeFilter === f.key
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {f.key !== 'all' && (
                        <span className={`w-2 h-2 rounded-full ${f.color} ${activeFilter === f.key ? 'opacity-80' : ''}`} />
                      )}
                      {f.label}
                      <span className={`ml-0.5 ${activeFilter === f.key ? 'text-white/70' : 'text-gray-400'}`}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value as SortType); setHistoryPage(1); }}
                    className="text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#06B4C9] cursor-pointer"
                  >
                    <option value="strongest">Strongest first</option>
                    <option value="weakest">Weakest first</option>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>

              {/* ── Resume Cards Grid ────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {paginatedCards.map((cvr) => {
                  const strengthConfig = {
                    strong: { label: 'Strong', icon: '✓', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                    'needs-work': { label: 'Needs work', icon: '⚠', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
                    weak: { label: 'Weak', icon: '⊘', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
                  };
                  const sc = strengthConfig[cvr.strength];

                  // Generate a description based on the snapshot content
                  const credCount = cvr.credential_ids?.length || 0;
                  const hasSummary = !!cvr.snapshot?.summary;
                  let description = '';
                  if (cvr.strength === 'strong') {
                    description = credCount > 0
                      ? `Complete profile with ${credCount} verified credential${credCount !== 1 ? 's' : ''} linked. Ready to send.`
                      : 'Complete profile with all sections filled. Ready to send.';
                  } else if (cvr.strength === 'needs-work') {
                    description = !hasSummary
                      ? 'Missing a professional summary — resumes with one get more callbacks.'
                      : credCount === 0
                      ? 'No verified credentials linked. Add verified certificates to strengthen.'
                      : 'Some sections could use more detail for a stronger impression.';
                  } else {
                    const issues = [];
                    if (credCount === 0) issues.push('No verified credentials linked');
                    if (!hasSummary) issues.push('missing summary');
                    if (!cvr.snapshot?.phone && !cvr.snapshot?.linkedin) issues.push('contact details are incomplete');
                    description = issues.length > 0 ? issues.join(' and ') + '.' : 'Resume needs more content to be competitive.';
                  }

                  return (
                    <div
                      key={cvr.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200"
                    >
                      {/* Top row: thumbnail + info + score */}
                      <div className="flex items-start gap-4 mb-3">
                        <MiniDocThumb template={cvr.template} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 truncate">{cvr.name}</h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Edited {timeAgo(cvr.generated_at)} · {cvr.templateLabel}
                          </p>
                        </div>
                        <CardScoreRing score={cvr.score} size={46} />
                      </div>

                      {/* Strength badge */}
                      <div className="mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
                        {description}
                      </p>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCvr(cvr)}
                          className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-[#1e293b] text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateCvr(cvr)}
                          className="px-3.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCvr(cvr)}
                          className="px-3.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          Download
                        </button>
                        {/* Copy link (small icon) */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(cvr.id)}
                          className={`ml-auto p-1.5 rounded-lg transition-colors ${
                            copied === cvr.id
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'text-gray-400 hover:text-[#06B4C9] hover:bg-[#06B4C9]/5'
                          }`}
                          title={copied === cvr.id ? 'Copied!' : 'Copy verify link'}
                        >
                          {copied === cvr.id ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {Math.ceil(filteredAndSorted.length / HISTORY_ITEMS_PER_PAGE) > 1 && (
                <div className="mb-6">
                  <Pagination
                    currentPage={historyPage}
                    totalItems={filteredAndSorted.length}
                    itemsPerPage={HISTORY_ITEMS_PER_PAGE}
                    onPageChange={setHistoryPage}
                  />
                </div>
              )}
            </>
          )}

          {/* Empty state when no history */}
          {scoredHistory.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#06B4C9]/10 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No resumes yet</h3>
              <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                Create your first credential-verified resume to share with employers.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="px-6 py-2.5 bg-[#06B4C9] hover:bg-[#06B4C9]/80 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Create your first resume
              </button>
            </div>
          )}

          {/* Phase 12 — AI CVR Analysis Panel */}
          {latestSnapshot && (
            <div className="mt-4">
              <CVRAnalysisPanel snapshot={latestSnapshot} />
            </div>
          )}
        </>
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