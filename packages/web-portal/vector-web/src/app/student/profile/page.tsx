'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod';
import HelpTip from '@/components/shared/HelpTip';

// ── Validation Schema ─────────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name too long").regex(/^[a-zA-Z\s]*$/, "Name can only contain letters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name too long"),
  phone: z.string().regex(/^\+?[0-9\s-]{7,12}$/, "Phone must be 7-12 characters").optional().or(z.literal('')),
  bio: z.string().max(100, "Bio must be under 100 characters").optional(),
  university: z.string().optional().or(z.literal("")),
  major: z.string().max(100, "Major name too long").optional(),
  graduationYear: z.string().regex(/^\d{4}$/, "Year must be 4 digits (e.g. 2026)").optional().or(z.literal('')),
  location: z.string().max(100).optional(),
});

// ── Types ─────────────────────────────────────────────────────────────
interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  university: string;
  major: string;
  graduationYear: string;
  location: string;
  photoUrl: string;
  studentId: string;
  specialization: string;
  industrySector: string;
  workExperience: { title: string; company: string; start_date: string; end_date: string; current: boolean; description: string }[];
  educationHistory: { school: string; degree: string; field: string; start_year: string; end_year: string }[];
}

interface ProgressItem {
  label: string;
  field: keyof ProfileData | 'account';
  weight: number;
  completed: boolean;
}

interface CredentialItem {
  id: string;
  skill_name: string;
  issued_at?: string;
  certificate_number?: string;
  credential_data?: Record<string, unknown>;
  skill_tags?: string[];
  batch_id?: string;
}

interface SubmissionItem {
  id: string;
  file_name: string;
  extracted_data?: Record<string, unknown>;
  status: string;
  created_at: string;
}

// ── Highlight Tab Type ────────────────────────────────────────────────
type HighlightTab = 'professional' | 'submissions' | 'skills';

// ── Score Ring Component ──────────────────────────────────────────────
function ProfileScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#06B4C9' : '#f59e0b';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
        {score}%
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 2FA
  const [mfa2faEnabled, setMfa2faEnabled] = useState(false);

  // Highlights tab state
  const [highlightTab, setHighlightTab] = useState<HighlightTab>('professional');

  // Credential + submission data for highlights
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    university: 'PHINMA University',
    major: '',
    graduationYear: '',
    location: '',
    photoUrl: '',
    studentId: '',
    specialization: '',
    industrySector: '',
    workExperience: [],
    educationHistory: [],
  });

  // ── Load user profile + credentials ─────────────────────────────
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        let user = (await supabase.auth.getSession()).data.session?.user ?? null;
        if (!user) {
          const { data } = await supabase.auth.getUser();
          user = data.user;
        }
        if (!user) {
          router.push('/login');
          return;
        }

        setUserId(user.id);
        const userEmail = user.email || '';

        const { data: userRecord, error } = await supabase
          .from('users')
          .select(`
            full_name, student_id, avatar_url, location,
            profiles ( phone, bio, university, major, graduation_year, specialization, industry_sector, work_experience, education_history )
          `)
          .eq('id', user.id)
          .single();

        if (error) {
            console.error("Error loading user data:", error);
        }

        if (userRecord) {
          const capitalizeWords = (s: string) => s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          const nameParts = (userRecord.full_name || '').split(' ');
          const profile = Array.isArray(userRecord.profiles) ? userRecord.profiles[0] : userRecord.profiles;

          setFormData({
            firstName: capitalizeWords(nameParts[0] || ''),
            lastName: capitalizeWords(nameParts.slice(1).join(' ')) || '',
            email: userEmail,
            location: userRecord.location || '',
            photoUrl: userRecord.avatar_url || '',
            studentId: userRecord.student_id || '',
            
            phone: profile?.phone || '',
            bio: profile?.bio || '',
            university: profile?.university || 'PHINMA University',
            major: profile?.major || '',
            graduationYear: profile?.graduation_year || '',
            specialization: profile?.specialization || '',
            industrySector: profile?.industry_sector || '',
            workExperience: Array.isArray(profile?.work_experience) ? profile.work_experience : typeof profile?.work_experience === 'string' ? JSON.parse(profile.work_experience) : [],
            educationHistory: Array.isArray(profile?.education_history) ? profile.education_history : typeof profile?.education_history === 'string' ? JSON.parse(profile.education_history) : [],
          });
        }

        // Fetch verified credentials
        const { data: creds } = await supabase
          .from('verified_credentials')
          .select('id, skill_name, issued_at, certificate_number, credential_data, skill_tags, batch_id')
          .eq('user_id', user.id)
          .eq('revoked', false)
          .order('issued_at', { ascending: false });

        if (creds) setCredentials(creds);

        // Fetch credential submissions (in-review)
        const { data: subs } = await supabase
          .from('credential_submissions')
          .select('id, file_name, extracted_data, status, created_at')
          .eq('user_id', user.id)
          .in('status', ['pending', 'ai_reviewed'])
          .order('created_at', { ascending: false });

        if (subs) setSubmissions(subs);

      } catch (error) {
        console.error("Error loading profile", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [router]);

  // ── Auto-scroll to #settings-section if present in hash ─────────
  useEffect(() => {
    if (!loading && typeof window !== 'undefined' && window.location.hash === '#settings-section') {
      setTimeout(() => {
        document.getElementById('settings-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [loading]);

  // ── Profile completion ──────────────────────────────────────────
  const calculateProgress = (): { percentage: number; items: ProgressItem[] } => {
    const progressItems: ProgressItem[] = [
      { label: 'First Name', field: 'firstName', weight: 10, completed: !!formData.firstName },
      { label: 'Last Name', field: 'lastName', weight: 10, completed: !!formData.lastName },
      { label: 'Email', field: 'email', weight: 10, completed: !!formData.email },
      { label: 'Phone', field: 'phone', weight: 15, completed: !!formData.phone },
      { label: 'Location', field: 'location', weight: 10, completed: !!formData.location },
      { label: 'Bio', field: 'bio', weight: 15, completed: !!formData.bio && formData.bio.length > 10 },
      { label: 'University', field: 'university', weight: 15, completed: !!formData.university },
      { label: 'Major', field: 'major', weight: 10, completed: !!formData.major },
      { label: 'Graduation Year', field: 'graduationYear', weight: 5, completed: !!formData.graduationYear },
    ];

    const completedWeight = progressItems.filter(item => item.completed).reduce((sum, item) => sum + item.weight, 0);
    const totalWeight = progressItems.reduce((sum, item) => sum + item.weight, 0);
    const percentage = Math.round((completedWeight / totalWeight) * 100);

    return { percentage, items: progressItems };
  };

  const { percentage: profileCompletion, items: progressItems } = calculateProgress();

  // ── Verified skill tags (extracted from credentials) ────────────
  const verifiedSkills = useMemo(() => {
    const seen = new Set<string>();
    const skills: string[] = [];
    credentials.forEach(c => {
      if (c.skill_tags && Array.isArray(c.skill_tags)) {
        c.skill_tags.forEach(tag => {
          const norm = tag.trim().toLowerCase();
          if (norm && !seen.has(norm)) {
            seen.add(norm);
            skills.push(tag.trim());
          }
        });
      }
    });
    return skills;
  }, [credentials]);

  // ── Work experience helpers ─────────────────────────────────────
  const addWorkExperience = () => {
    setFormData({ ...formData, workExperience: [...formData.workExperience, { title: '', company: '', start_date: '', end_date: '', current: false, description: '' }] });
  };

  const updateWorkExperience = (index: number, field: string, value: string | boolean) => {
    const updated = [...formData.workExperience];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, workExperience: updated });
  };

  const removeWorkExperience = (index: number) => {
    const updated = formData.workExperience.filter((_, i) => i !== index);
    setFormData({ ...formData, workExperience: updated });
  };

  // ── Handle form changes ─────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'phone') {
      sanitizedValue = value.replace(/[^0-9\s+-]/g, '');
      if (sanitizedValue.length > 12) return;
    } else if (name === 'firstName' || name === 'lastName') {
      sanitizedValue = value.replace(/[^a-zA-Z\s]/g, '');
      sanitizedValue = sanitizedValue.split(' ').map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    } else if (name === 'graduationYear') {
      sanitizedValue = value.replace(/[^0-9]/g, '');
    } else if (name === 'bio' || name === 'location' || name === 'major' || name === 'university') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9\s.,'\-()]/g, '');
    }

    if (name === 'bio' && sanitizedValue.length > 100) return;

    if (name !== 'phone') {
      sanitizedValue = sanitizedValue.replace(/\s{3,}/g, '  ');
    }

    setFormData({ ...formData, [name]: sanitizedValue });
    if (errors[name]) {
       setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
       });
    }
  };

  // ── Submit handler ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setErrors({});

    const validationResult = profileSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      setSaving(false);
      return;
    }
    
    try {
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          location: formData.location,
        })
        .eq('id', userId);

      if (userError) throw userError;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId,
          phone: formData.phone,
          bio: formData.bio,
          university: formData.university,
          major: formData.major,
          graduation_year: formData.graduationYear,
          specialization: formData.specialization,
          industry_sector: formData.industrySector,
          work_experience: formData.workExperience,
          education_history: formData.educationHistory
        });

      if (profileError) throw profileError;
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  // ── Loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B4C9]"></div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derived display values ──────────────────────────────────────
  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const initials = `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`;
  const role = formData.specialization || formData.major || 'Student';
  const inReviewCount = submissions.length;
  const verifiedCount = credentials.length;
  const verifiedSkillCount = verifiedSkills.length;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <DashboardLayout>
      <div className="w-full">

        {/* ════════════════════════════════════════════════════════
            HERO BANNER
            ════════════════════════════════════════════════════════ */}
        <div className="bg-[#0F172A] rounded-t-2xl px-6 md:px-8 pt-6 pb-6 -mx-4 -mt-2 mb-0">
          {/* Top decorative bar */}
          <div className="h-1 bg-gradient-to-r from-[#06B4C9] via-[#06B4C9]/50 to-transparent rounded-full mb-6 max-w-[200px]" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-[#0F172A] font-bold text-2xl border-4 border-white/10">
                {initials}
              </div>
              {/* Verified badge */}
              {profileCompletion >= 80 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#0F172A] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
                {fullName || 'Your Name'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                {formData.location && (
                  <span className="flex items-center gap-1 text-sm text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {formData.location}
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {role}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
              <button
                type="button"
                onClick={() => router.push('/student/profile/edit')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg border border-white/20 transition-colors"
              >
                Edit profile
              </button>
              <button
                type="button"
                onClick={() => router.push('/student/cvr')}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-[#0F172A] text-sm font-semibold rounded-lg transition-colors"
              >
                Go to Resume
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            STATS BAR
            ════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 px-6 md:px-8 py-4 mb-6 -mx-4">
          <div className="flex flex-wrap items-center gap-6 md:gap-8">
            {/* Verified profile badge */}
            <div className="flex items-center gap-3">
              <ProfileScoreRing score={profileCompletion} size={48} />
              <div>
                <p className="text-sm font-semibold text-gray-900">Verified profile</p>
                <p className="text-xs text-gray-500">Identity and top credentials confirmed with issuing institutions</p>
              </div>
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block w-px h-10 bg-gray-200" />

            {/* Stat: Verified credentials */}
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{verifiedCount}</p>
              <p className="text-xs text-gray-500">Verified credentials</p>
            </div>

            <div className="hidden md:block w-px h-10 bg-gray-200" />

            {/* Stat: In review */}
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{inReviewCount}</p>
              <p className="text-xs text-gray-500">In review</p>
            </div>

            <div className="hidden md:block w-px h-10 bg-gray-200" />

            {/* Stat: Verified skills */}
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{verifiedSkillCount}</p>
              <p className="text-xs text-gray-500">Verified skills</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            TWO-COLUMN CONTENT: SIDEBAR + HIGHLIGHTS
            ════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">

          {/* ── Left Sidebar ────────────────────────────────────── */}
          <div className="w-full lg:w-60 flex-shrink-0 space-y-4">

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Summary</h3>
              {formData.bio ? (
                <p className="text-sm text-gray-600 leading-relaxed">{formData.bio}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No summary yet. Click &quot;Edit profile&quot; to add one.</p>
              )}
            </div>

            {/* Contacts */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Contacts</h3>
              <div className="space-y-2.5">
                {formData.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span>{formData.phone}</span>
                  </div>
                )}
                {formData.email && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="truncate">{formData.email}</span>
                  </div>
                )}
                {/* GitHub/Portfolio placeholder — uses email domain as fallback */}
                <div className="flex items-center gap-2.5 text-sm text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
                  <span>github.com/...</span>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Education</h3>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9-5m9 5l9-5" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formData.university || 'Not set'}
                  </p>
                  {formData.major && (
                    <p className="text-xs text-gray-500 mt-0.5">{formData.major}</p>
                  )}
                  {formData.graduationYear && (
                    <p className="text-xs text-gray-400 mt-0.5">Expected {formData.graduationYear}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Content: Highlights ───────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Highlights</h2>

              {/* Highlight tabs */}
              <div className="border-b border-gray-200 mb-5">
                <nav className="flex gap-6 -mb-px">
                  {([
                    { key: 'professional' as HighlightTab, label: 'Professional credentials' },
                    { key: 'submissions' as HighlightTab, label: 'Submissions' },
                    { key: 'skills' as HighlightTab, label: 'Skills' },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setHighlightTab(tab.key)}
                      className={`whitespace-nowrap pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                        highlightTab === tab.key
                          ? 'border-[#0F172A] text-gray-900'
                          : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab content */}
              {highlightTab === 'professional' && (
                <div>
                  {credentials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {credentials.map(cred => (
                        <div key={cred.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                          <h4 className="text-sm font-semibold text-gray-900 leading-tight mb-1">
                            {cred.skill_name}
                          </h4>
                          <p className="text-xs text-gray-500 mb-2">
                            {(cred.credential_data as Record<string, string>)?.issuer_name || 'Issuing Institution'}
                          </p>
                          {/* Verified badge */}
                          <div className="flex items-center gap-1 mb-2">
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-medium text-emerald-600">Verified</span>
                          </div>
                          {/* Meta row */}
                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span>
                              {cred.issued_at
                                ? `Issued ${new Date(cred.issued_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                                : ''}
                            </span>
                            <span className="font-mono">
                              {cred.certificate_number ? `VCT-${cred.certificate_number.slice(-4)}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-sm">No verified credentials yet.</p>
                      <p className="text-xs mt-1">Upload credentials to get them verified.</p>
                    </div>
                  )}
                </div>
              )}

              {highlightTab === 'submissions' && (
                <div>
                  {submissions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {submissions.map(sub => {
                        const extracted = sub.extracted_data as Record<string, string> | undefined;
                        return (
                          <div key={sub.id} className="border border-amber-200 bg-amber-50/30 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-900 leading-tight mb-1">
                              {extracted?.credential_name || sub.file_name}
                            </h4>
                            <p className="text-xs text-gray-500 mb-2">
                              {extracted?.issuer_name || 'Pending review'}
                            </p>
                            <div className="flex items-center gap-1 mb-2">
                              <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs font-medium text-amber-600">In review</span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Submitted {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-sm">No pending submissions.</p>
                    </div>
                  )}
                </div>
              )}

              {highlightTab === 'skills' && (
                <div>
                  {verifiedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {verifiedSkills.map((skill, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-200">
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-sm">No verified skills yet.</p>
                      <p className="text-xs mt-1">Skills are extracted from verified credentials.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}