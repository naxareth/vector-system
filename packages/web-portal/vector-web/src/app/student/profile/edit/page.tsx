'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod';

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

interface WorkExperienceItem {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  university: string;
  major: string;
  graduationYear: string;
  location: string;
  specialization: string;
  industrySector: string;
  workExperience: WorkExperienceItem[];
}

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    university: 'PHINMA University',
    major: '',
    graduationYear: '',
    location: '',
    specialization: '',
    industrySector: '',
    workExperience: [],
  });

  useEffect(() => {
    const loadProfile = async () => {
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

        const { data: userRecord } = await supabase
          .from('users')
          .select(`
            full_name, location,
            profiles ( phone, bio, university, major, graduation_year, specialization, industry_sector, work_experience )
          `)
          .eq('id', user.id)
          .single();

        if (userRecord) {
          const capitalizeWords = (s: string) => s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          const nameParts = (userRecord.full_name || '').split(' ');
          const profile = Array.isArray(userRecord.profiles) ? userRecord.profiles[0] : userRecord.profiles;

          setFormData({
            firstName: capitalizeWords(nameParts[0] || ''),
            lastName: capitalizeWords(nameParts.slice(1).join(' ')) || '',
            email: userEmail,
            location: userRecord.location || '',
            phone: profile?.phone || '',
            bio: profile?.bio || '',
            university: profile?.university || 'PHINMA University',
            major: profile?.major || '',
            graduationYear: profile?.graduation_year || '',
            specialization: profile?.specialization || '',
            industrySector: profile?.industry_sector || '',
            workExperience: Array.isArray(profile?.work_experience) 
              ? profile.work_experience 
              : typeof profile?.work_experience === 'string' 
                ? JSON.parse(profile.work_experience) 
                : [],
          });
        }
      } catch (error) {
        console.error("Error loading profile data for edit:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

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

  const addWorkExperience = () => {
    setFormData({
      ...formData,
      workExperience: [...formData.workExperience, { title: '', company: '', start_date: '', end_date: '', current: false, description: '' }]
    });
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
        });

      if (profileError) throw profileError;

      router.push('/student/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B4C9]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-2">
        {/* Navigation / Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/student/profile" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-2 mb-2 transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Profile
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
            <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-1">Update your personal details, academic background, and work experience.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">First Name</label>
                <input 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border rounded-lg outline-none ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#1E2536] focus:border-[#06B4C9]'}`} 
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Last Name</label>
                <input 
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border rounded-lg outline-none ${errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#1E2536] focus:border-[#06B4C9]'}`} 
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  disabled={true} 
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1A2234] border border-gray-200 dark:border-[#1E2536] rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  placeholder="+63 912 345 6789"
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border rounded-lg outline-none ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#1E2536] focus:border-[#06B4C9]'}`} 
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Location</label>
                <input 
                  type="text" 
                  name="location" 
                  value={formData.location} 
                  onChange={handleChange} 
                  placeholder="e.g., Manila, Philippines" 
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded-lg focus:border-[#06B4C9] outline-none" 
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8]">Bio / Summary</label>
                  <span className={`text-xs ${formData.bio.length >= 100 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {formData.bio.length}/100
                  </span>
                </div>
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  rows={3}
                  placeholder="Tell employers about your goals, skills, and background..."
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border rounded-lg outline-none resize-none ${errors.bio ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#1E2536] focus:border-[#06B4C9]'}`} 
                />
                {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Professional Focus</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Specialization</label>
                <select 
                  name="specialization" 
                  value={formData.specialization} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded-lg focus:border-[#06B4C9] outline-none"
                >
                  <option value="">Select Specialization...</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Business Administration">Business Administration</option>
                  <option value="Education">Education</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Arts & Humanities">Arts & Humanities</option>
                  <option value="Sciences">Sciences</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Target Industry Sector</label>
                <select 
                  name="industrySector" 
                  value={formData.industrySector} 
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded-lg focus:border-[#06B4C9] outline-none"
                >
                  <option value="">Select Industry...</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance & Banking">Finance & Banking</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Government">Government</option>
                  <option value="Retail">Retail</option>
                  <option value="Media">Media</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
          </div>

          {/* Education Details */}
          <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Academic Background</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">University / College</label>
                <input 
                  type="text" 
                  name="university" 
                  value={formData.university} 
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border rounded-lg outline-none ${errors.university ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#1E2536] focus:border-[#06B4C9]'}`} 
                />
                {errors.university && <p className="text-red-500 text-xs mt-1">{errors.university}</p>}
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Major / Degree Program</label>
                <input 
                  type="text" 
                  name="major" 
                  value={formData.major} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded-lg focus:border-[#06B4C9] outline-none" 
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1.5">Graduation Year</label>
                <input 
                  type="text" 
                  name="graduationYear" 
                  value={formData.graduationYear} 
                  onChange={handleChange}
                  placeholder="e.g. 2026"
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border rounded-lg outline-none ${errors.graduationYear ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#1E2536] focus:border-[#06B4C9]'}`} 
                />
                {errors.graduationYear && <p className="text-red-500 text-xs mt-1">{errors.graduationYear}</p>}
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Work Experience</h2>
              <button 
                type="button" 
                onClick={addWorkExperience} 
                className="text-sm font-semibold text-[#06B4C9] hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Experience
              </button>
            </div>

            {formData.workExperience.map((exp, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-gray-200 dark:border-[#1E2536] last:mb-0 last:pb-0 last:border-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-[#94A3B8] mb-1">Job Title</label>
                    <input 
                      type="text" 
                      value={exp.title} 
                      onChange={e => updateWorkExperience(index, 'title', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded focus:border-[#06B4C9] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-[#94A3B8] mb-1">Company / Organization</label>
                    <input 
                      type="text" 
                      value={exp.company} 
                      onChange={e => updateWorkExperience(index, 'company', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded focus:border-[#06B4C9] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-[#94A3B8] mb-1">Start Date</label>
                    <input 
                      type="month" 
                      value={exp.start_date} 
                      onChange={e => updateWorkExperience(index, 'start_date', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded focus:border-[#06B4C9] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-[#94A3B8] mb-1">End Date</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="month" 
                        value={exp.end_date} 
                        onChange={e => updateWorkExperience(index, 'end_date', e.target.value)} 
                        disabled={exp.current}
                        className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded focus:border-[#06B4C9] outline-none disabled:opacity-50" 
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={exp.current} 
                          onChange={e => updateWorkExperience(index, 'current', e.target.checked)} 
                          className="rounded border-gray-300 dark:border-[#1E2536] text-[#06B4C9] focus:ring-[#06B4C9]" 
                        /> Present
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-[#94A3B8] mb-1">Description</label>
                    <textarea 
                      value={exp.description} 
                      onChange={e => updateWorkExperience(index, 'description', e.target.value)} 
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white border border-gray-300 dark:border-[#1E2536] rounded focus:border-[#06B4C9] outline-none" 
                    />
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <button 
                    type="button" 
                    onClick={() => removeWorkExperience(index)} 
                    className="text-xs text-red-500 hover:underline font-medium"
                  >
                    Remove Experience
                  </button>
                </div>
              </div>
            ))}
            {formData.workExperience.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No work experience entries added yet.</p>
            )}
          </div>

          {/* Form Bottom Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <Link 
              href="/student/profile" 
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 dark:border-[#1E2536] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E2536] transition-colors font-medium text-center text-sm"
            >
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={saving} 
              className="w-full sm:w-auto px-6 py-2.5 bg-[#06B4C9] hover:bg-[#0598A9] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
