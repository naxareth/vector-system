'use client';

import { useEffect, useState, useRef } from 'react';
import EmployerLayout from '@/components/dashboard/EmployerLayout';

interface EmployerProfileFormData {
  company_name: string;
  industry: string;
  company_size: string;
  website: string;
  description: string;
  logo_url: string;
  location?: string;
  founded_year?: string;
  linkedin_url?: string;
}

interface GalleryPhoto {
  id: string;
  label: string;
  url: string;
}

interface PerkItem {
  id: string;
  title: string;
  desc: string;
  iconColor: string;
}

const initialFormData: EmployerProfileFormData = {
  company_name: '',
  industry: '',
  company_size: '',
  website: '',
  description: '',
  logo_url: '',
  location: 'Manila, Philippines',
  founded_year: '2019',
  linkedin_url: 'linkedin.com/company/vector',
};

const DEFAULT_WORK_TAGS = ['Collaborative', 'Fast-paced', 'Async-friendly', 'Mentorship-driven', 'Data-informed'];

const inputCls = 'w-full px-3.5 py-2.5 text-xs bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#4A5568] focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 focus:border-[#06B4C9] transition-colors';

export default function EmployerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<EmployerProfileFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<'work' | 'jobs' | 'salaries' | 'reviews'>('work');

  // Work Tags state
  const [workTags, setWorkTags] = useState<string[]>(DEFAULT_WORK_TAGS);
  const [newTagInput, setNewTagInput] = useState('');

  // Dynamic Photo Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([
    { id: 'photo-1', label: 'Office', url: '' },
    { id: 'photo-2', label: 'Team', url: '' },
    { id: 'photo-3', label: 'Event', url: '' },
  ]);

  // Editable Perks & Benefits state (All icon colors set to green #10B981)
  const [perks, setPerks] = useState<PerkItem[]>([
    { id: 'perk-1', title: 'Hybrid work', desc: '3 days in-office, 2 days remote, flexible scheduling.', iconColor: '#10B981' },
    { id: 'perk-2', title: 'Health & wellness', desc: 'HMO coverage for you and up to 2 dependents.', iconColor: '#10B981' },
    { id: 'perk-3', title: 'Learning budget', desc: 'Annual allowance for courses, certifications, and conferences.', iconColor: '#10B981' },
    { id: 'perk-4', title: 'Team culture', desc: 'Monthly team events and a quarterly company-wide offsite.', iconColor: '#10B981' },
  ]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const activeUploadIndexRef = useRef<number | null>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/employer/profile');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load employer profile');
        }

        const profile = await res.json();
        if (profile && Object.keys(profile).length > 0) {
          setFormData({
            company_name: profile.company_name || '',
            industry: profile.industry || '',
            company_size: profile.company_size || '',
            website: profile.website || '',
            description: profile.description || '',
            logo_url: profile.logo_url || '',
            location: profile.location || 'Manila, Philippines',
            founded_year: profile.founded_year || '2019',
            linkedin_url: profile.linkedin_url || 'linkedin.com/company/vector',
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load employer profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Upload photo to specific slot index
  const handleSlotUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setGalleryPhotos(prev => prev.map((item, idx) => idx === index ? { ...item, url: dataUrl } : item));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add a brand new photo card to the gallery
  const handleAddNewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newPhoto: GalleryPhoto = {
        id: `photo-${Date.now()}`,
        label: `Photo ${galleryPhotos.length + 1}`,
        url: dataUrl,
      };
      setGalleryPhotos(prev => [...prev, newPhoto]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Delete a photo card from the gallery
  const handleDeletePhoto = (index: number) => {
    setGalleryPhotos(prev => {
      if (prev.length <= 3 && !prev[index].url) return prev;
      if (prev.length <= 3) {
        return prev.map((item, idx) => idx === index ? { ...item, url: '' } : item);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Tag Handlers
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    if (!workTags.includes(newTagInput.trim())) {
      setWorkTags(prev => [...prev, newTagInput.trim()]);
    }
    setNewTagInput('');
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setWorkTags(prev => prev.filter(t => t !== tagToDelete));
  };

  // Perks Management Handlers
  const handleUpdatePerk = (id: string, field: 'title' | 'desc', value: string) => {
    setPerks(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAddPerk = () => {
    const newPerk: PerkItem = {
      id: `perk-${Date.now()}`,
      title: 'New Benefit',
      desc: 'Add benefit description here.',
      iconColor: '#10B981', // Always green
    };
    setPerks(prev => [...prev, newPerk]);
  };

  const handleDeletePerk = (id: string) => {
    setPerks(prev => prev.filter(p => p.id !== id));
  };

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData(prev => ({ ...prev, logo_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const csrfToken = typeof document !== 'undefined'
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
        : '';

      const res = await fetch('/api/employer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save employer profile');
      }

      setSuccess('Company profile saved successfully.');
      setIsEditOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save employer profile');
    } finally {
      setSaving(false);
    }
  };

  const companyTitle = formData.company_name.trim() || 'Vector Technologies Inc.';
  const industryText = formData.industry.trim() || 'Information Technology Services';
  const companySizeText = formData.company_size.trim() || '201–1,000 employees';
  const websiteText = formData.website.trim() || 'vector.example.com';
  const descriptionText = formData.description.trim() || 'Vector connects verified talent with employers through skill-based matching and credential verification, helping teams hire with confidence.';
  const locationText = formData.location || 'Manila, Philippines';
  const foundedText = formData.founded_year || '2019';
  const linkedinText = formData.linkedin_url || 'linkedin.com/company/vector';
  const initial = companyTitle.charAt(0).toUpperCase();

  return (
    <EmployerLayout>
      {/* ── Status Toast Alerts ────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">Loading company profile...</div>
      ) : (
        <div className="space-y-5 max-w-5xl mx-auto pb-10">

          {/* ── 1. Hero Header Banner + Overlapping Verification Card ────── */}
          <div>
            {/* Header Banner */}
            <div className="bg-[#0B132A] text-white rounded-2xl p-6 md:p-8 pb-14 md:pb-16 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {/* Logo container */}
                  {formData.logo_url ? (
                    <div className="relative group">
                      <img
                        src={formData.logo_url}
                        alt={companyTitle}
                        className="w-16 h-16 rounded-2xl object-cover bg-white p-1 flex-shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                        title="Delete Logo"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#06B4C9] flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
                      {initial}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{companyTitle}</h1>
                    <p className="text-sm text-gray-300 dark:text-[#94A3B8] flex items-center gap-1.5 mt-1">
                      <svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {industryText}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="px-4 py-2 text-xs font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-xl transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit profile
                  </button>
                  <a
                    href={websiteText.startsWith('http') ? websiteText : `https://${websiteText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-semibold bg-[#162035] hover:bg-[#1E2C48] text-white rounded-xl transition-colors inline-flex items-center gap-1.5 border border-white/10"
                  >
                    View public page
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Overlapping Verification & Stats Bar Card */}
            <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-5 relative -mt-8 md:-mt-10 mx-3 md:mx-6 flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
              {/* Left: Completion Ring & Badge */}
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100 dark:text-[#1E2536]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#06B4C9]"
                      strokeDasharray="82, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-xs font-bold text-gray-900 dark:text-white">82%</span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                    <svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Verified company profile
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#64748B] mt-0.5">
                    Complete your profile to stand out to top candidates.
                  </p>
                </div>
              </div>

              {/* Right: Metrics */}
              <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-gray-100 dark:border-[#1E2536] pt-4 md:pt-0 md:pl-8 justify-around md:justify-end">
                <div className="text-center">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">3</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#64748B] font-medium">Active postings</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">12</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#64748B] font-medium">Total hires</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">8</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#64748B] font-medium">Employee reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. About Card ──────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">About</h2>
            <p className="text-xs text-gray-600 dark:text-[#94A3B8] leading-relaxed">
              {descriptionText}
            </p>
          </div>

          {/* ── 3. Contact & links Card ────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Contact &amp; links</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <a href={websiteText.startsWith('http') ? websiteText : `https://${websiteText}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#06B4C9] font-medium hover:underline">
                  {websiteText}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <a href={`mailto:hello@${websiteText.replace(/^https?:\/\//, '')}`} className="text-xs text-gray-700 dark:text-gray-300 font-medium hover:text-[#06B4C9]">
                  hello@{websiteText.replace(/^https?:\/\//, '')}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                </div>
                <a href={`https://${linkedinText}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 dark:text-gray-300 font-medium hover:text-[#06B4C9]">
                  {linkedinText}
                </a>
              </div>
            </div>
          </div>

          {/* ── 4. Company details Card ────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Company details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{industryText}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{companySizeText}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{locationText}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1A2030] flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Founded {foundedText}</span>
              </div>
            </div>
          </div>

          {/* ── 5. Company highlights Card ──────────────────────────────────── */}
          <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Company highlights</h2>

            {/* Sub Tabs */}
            <div className="border-b border-gray-100 dark:border-[#1E2536] flex items-center gap-6 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('work')}
                className={`pb-2.5 text-xs font-semibold transition-colors relative ${
                  activeTab === 'work' ? 'text-[#06B4C9]' : 'text-gray-500 dark:text-[#64748B] hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Work Environment
                {activeTab === 'work' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06B4C9] rounded-full" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className={`pb-2.5 text-xs font-semibold transition-colors relative ${
                  activeTab === 'jobs' ? 'text-[#06B4C9]' : 'text-gray-500 dark:text-[#64748B] hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Jobs
                {activeTab === 'jobs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06B4C9] rounded-full" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('salaries')}
                className={`pb-2.5 text-xs font-semibold transition-colors relative ${
                  activeTab === 'salaries' ? 'text-[#06B4C9]' : 'text-gray-500 dark:text-[#64748B] hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Salaries
                {activeTab === 'salaries' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06B4C9] rounded-full" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-2.5 text-xs font-semibold transition-colors relative ${
                  activeTab === 'reviews' ? 'text-[#06B4C9]' : 'text-gray-500 dark:text-[#64748B] hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Reviews
                {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06B4C9] rounded-full" />}
              </button>
            </div>

            {/* TAB 1: Work Environment */}
            {activeTab === 'work' && (
              <div className="space-y-6">
                {/* Black Culture Tags */}
                <div className="flex flex-wrap gap-2">
                  {workTags.map(tag => (
                    <span key={tag} className="px-3 py-1 text-xs font-semibold bg-gray-100 dark:bg-[#1E2536] text-gray-900 dark:text-white border border-gray-200 dark:border-[#283042] rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Perks and benefits Subsection */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Perks and benefits</h3>
                    <p className="text-xs text-gray-500 dark:text-[#64748B]">What makes working at our company rewarding.</p>
                  </div>

                  {/* 2x2 Perks Grid Cards with Green Icons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {perks.map((perk) => (
                      <div
                        key={perk.id}
                        className="border border-gray-100 dark:border-[#1E2536] bg-gray-50/50 dark:bg-[#1A2030]/40 rounded-xl p-4 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{perk.title}</h4>
                          <p className="text-[11px] text-gray-500 dark:text-[#64748B] leading-relaxed">{perk.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Life at [Company Title] Subsection */}
                <div className="pt-4 border-t border-gray-100 dark:border-[#1E2536]">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Life at {companyTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-[#64748B] mb-4">A look at our space, our people, and how we work together.</p>

                  {/* Photo Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="h-44 bg-gray-50 dark:bg-[#1A2030] border border-dashed border-gray-200 dark:border-[#283042] rounded-xl flex flex-col items-center justify-center text-gray-400 gap-1.5 relative overflow-hidden"
                      >
                        {photo.url ? (
                          <>
                            <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
                              {photo.label}
                            </span>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3">
                            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{photo.label}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plain Subsection: Why Choose Us? */}
                <div className="pt-4 border-t border-gray-100 dark:border-[#1E2536]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-4 h-4 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Why choose us?</h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-[#94A3B8] leading-relaxed">
                    We're an equal-opportunity employer that welcomes people of every background, identity, age, and ability. We hire on potential and merit, offer reasonable accommodations throughout our process, and support flexible schedules so people can do their best work in the way that fits their life. Whoever you are, there's a place for you here.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Jobs */}
            {activeTab === 'jobs' && (
              <div className="py-6 text-center text-xs text-gray-500 dark:text-[#64748B]">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Active Job Listings</p>
                <p>3 active positions currently accepting student applications.</p>
              </div>
            )}

            {/* TAB 3: Salaries */}
            {activeTab === 'salaries' && (
              <div className="py-6 text-center text-xs text-gray-500 dark:text-[#64748B]">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Transparent Compensation</p>
                <p>All positions list verified salary ranges starting at ₱25,000 – ₱65,000 / month.</p>
              </div>
            )}

            {/* TAB 4: Reviews */}
            {activeTab === 'reviews' && (
              <div className="py-6 text-center text-xs text-gray-500 dark:text-[#64748B]">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Verified Employee Reviews</p>
                <p>8 verified employee &amp; intern feedback scores (4.9 / 5.0 Rating).</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. UNIFIED EDIT PROFILE MODAL ────────────────────────────────────── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="bg-white dark:bg-[#0F1623] border border-gray-200 dark:border-[#1E2536] rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-x-hidden">

            {/* Modal header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-[#1E2536] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Company Profile</h2>
                <p className="text-xs text-gray-500 dark:text-[#64748B] mt-0.5">Update details, branding, work culture, and photo gallery</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">

                {/* Section 1: General Info Badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
                    General Information &amp; Branding
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-[#1E2536]" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Vector Technologies Inc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Information Technology Services"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Company Size
                    </label>
                    <input
                      type="text"
                      value={formData.company_size}
                      onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. 201–1,000 employees"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Manila, Philippines"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Founded Year
                    </label>
                    <input
                      type="text"
                      value={formData.founded_year || ''}
                      onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. 2019"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Website URL
                    </label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className={inputCls}
                      placeholder="https://vector.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Logo Upload
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        className={inputCls}
                        placeholder="https://example.com/logo.png"
                      />
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-2 text-xs font-semibold bg-[#06B4C9]/10 hover:bg-[#06B4C9]/20 text-[#06B4C9] border border-[#06B4C9]/25 rounded-xl transition-colors whitespace-nowrap"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Company Overview &amp; Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={inputCls + ' resize-none'}
                    placeholder="Describe your company background and mission..."
                  />
                </div>

                {/* Section 2: Work Environment Culture Tags */}
                <div className="flex items-center gap-2 pt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
                    Culture &amp; Environment Tags
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-[#1E2536]" />
                </div>

                <div className="space-y-2">
                  {/* Black Culture Tags inside Modal */}
                  <div className="flex flex-wrap gap-1.5">
                    {workTags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 text-xs font-semibold bg-gray-100 dark:bg-[#1A2030] text-gray-900 dark:text-white border border-gray-300 dark:border-[#283042] rounded-lg flex items-center gap-1.5">
                        {tag}
                        <button type="button" onClick={() => handleDeleteTag(tag)} className="text-gray-500 hover:text-red-500 transition-colors">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 max-w-sm pt-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      placeholder="Add tag (e.g. Remote-first)"
                      className={inputCls + ' py-1.5'}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#06B4C9]/10 hover:bg-[#06B4C9]/20 text-[#06B4C9] border border-[#06B4C9]/25 rounded-xl transition-colors whitespace-nowrap"
                    >
                      + Add Tag
                    </button>
                  </div>
                </div>

                {/* Section 3: Perks & Benefits */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
                      Perks &amp; Benefits
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-[#1E2536]" />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPerk}
                    className="px-3 py-1 text-xs font-semibold bg-[#06B4C9]/10 hover:bg-[#06B4C9]/20 text-[#06B4C9] border border-[#06B4C9]/25 rounded-xl transition-colors ml-2"
                  >
                    + Add Benefit
                  </button>
                </div>

                <div className="space-y-3">
                  {perks.map((perk) => (
                    <div key={perk.id} className="p-3 bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={perk.title}
                            onChange={(e) => handleUpdatePerk(perk.id, 'title', e.target.value)}
                            className={inputCls + ' py-1 font-semibold'}
                            placeholder="Perk Title"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePerk(perk.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={perk.desc}
                        onChange={(e) => handleUpdatePerk(perk.id, 'desc', e.target.value)}
                        className={inputCls + ' py-1.5 resize-none'}
                        placeholder="Perk description..."
                      />
                    </div>
                  ))}
                </div>

                {/* Section 4: Photo Gallery */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#06B4C9]/10 text-[#06B4C9] border border-[#06B4C9]/20">
                      Life at Company Photo Gallery
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-[#1E2536]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => addPhotoInputRef.current?.click()}
                    className="px-3 py-1 text-xs font-semibold bg-[#06B4C9]/10 hover:bg-[#06B4C9]/20 text-[#06B4C9] border border-[#06B4C9]/25 rounded-xl transition-colors ml-2"
                  >
                    + Add Photo
                  </button>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={cardInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (activeUploadIndexRef.current !== null) {
                      handleSlotUpload(activeUploadIndexRef.current, e);
                    }
                  }}
                />
                <input
                  ref={addPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddNewPhoto}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {galleryPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="h-32 bg-white dark:bg-[#131825] border border-dashed border-gray-200 dark:border-[#283042] rounded-xl flex flex-col items-center justify-center text-gray-400 gap-1 relative overflow-hidden group"
                    >
                      {photo.url ? (
                        <>
                          <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                activeUploadIndexRef.current = index;
                                cardInputRef.current?.click();
                              }}
                              className="px-2 py-1 text-[10px] font-semibold bg-white text-gray-900 rounded-md"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(index)}
                              className="px-2 py-1 text-[10px] font-semibold bg-red-600 text-white rounded-md"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      ) : (
                        <div
                          onClick={() => {
                            activeUploadIndexRef.current = index;
                            cardInputRef.current?.click();
                          }}
                          className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:border-[#06B4C9] p-2 text-center"
                        >
                          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{photo.label}</span>
                          <span className="text-[10px] text-gray-400">Click to upload photo</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1E2536] flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50/50 dark:bg-[#131825]/50">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#06B4C9] hover:bg-[#0598AD] !text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
}
