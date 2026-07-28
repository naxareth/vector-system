'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod'; // 1. Import Zod
import HelpTip from '@/components/shared/HelpTip';

// 2. Define Validation Schema
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

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  
  // 3. Add Error State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 2FA status for security tab
  const [mfa2faEnabled, setMfa2faEnabled] = useState(false);
 

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

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Try local session first (no network call), fall back to getUser() if null
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
          // Capitalize every word in a string
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
      } catch (error) {
        console.error("Error loading profile", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [router]);

  useEffect(() => {
    if (activeTab !== 'security') return;
    const checkMfa = async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.filter(f => f.status === 'verified') ?? [];
      if (verified.length > 0) {
        setMfa2faEnabled(true);
      } else {
        setMfa2faEnabled(false);
      }
    };
    checkMfa();
  }, [activeTab]);

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



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    // Phone validation: only allow numbers, spaces, hyphens, and plus sign (max 12 chars)
    if (name === 'phone') {
      sanitizedValue = value.replace(/[^0-9\s+-]/g, '');
      if (sanitizedValue.length > 12) {
        return; // Don't update if exceeds limit
      }
    }
    // Name fields: only letters and spaces (no symbols or emojis)
    else if (name === 'firstName' || name === 'lastName') {
      sanitizedValue = value.replace(/[^a-zA-Z\s]/g, '');
      // Auto-capitalize first letter of each word
      sanitizedValue = sanitizedValue
        .split(' ')
        .map(word => {
          if (word.length === 0) return word;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    }
    // Graduation year: only numbers
    else if (name === 'graduationYear') {
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }
    // Text fields: allow letters, numbers, spaces, and basic punctuation only (no symbols or emojis)
    else if (name === 'bio' || name === 'location' || name === 'major' || name === 'university') {
      // Remove emojis and special symbols, keep letters, numbers, spaces, and basic punctuation (.,'-())
      sanitizedValue = value.replace(/[^a-zA-Z0-9\s.,'\-()]/g, '');
    }

    // Bio validation: max 100 characters
    if (name === 'bio' && sanitizedValue.length > 100) {
      return; // Don't update if exceeds limit
    }

    // Prevent excessive spaces in all text fields (no more than 2 consecutive spaces)
    if (name !== 'phone') {
      sanitizedValue = sanitizedValue.replace(/\s{3,}/g, '  ');
    }

    setFormData({ ...formData, [name]: sanitizedValue });
    // Clear error for this field when user types
    if (errors[name]) {
       setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
       });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setErrors({}); // Reset errors

    // 4. Run Zod Validation
    const validationResult = profileSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => {
        // Path[0] corresponds to the field name
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      setSaving(false);
      return; // 🛑 Stop submission if validation fails
    }
    
    try {
      // 1. Update 'users' table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          location: formData.location,
        })
        .eq('id', userId);

      if (userError) throw userError;

      // 2. Update 'profiles' table
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
      // Optional: Add a toast notification here
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B4C9]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account information and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#06B4C9] rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0">
              {formData.firstName?.[0]}{formData.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">{formData.firstName} {formData.lastName}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{formData.email}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            {([
              { key: 'profile', label: 'Edit Profile' },
              { key: 'preferences', label: 'Preferences' },
              { key: 'security', label: 'Security' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#06B4C9] text-[#06B4C9]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">

            {/* ═══ EDIT PROFILE TAB ═══ */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSubmit}>
                {/* Editing Mode Banner */}
                {isEditing && (
                  <div className="bg-gradient-to-r from-[#06B4C9]/10 to-[#06B4C9]/5 border-l-4 border-[#06B4C9] rounded-lg p-4 mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#06B4C9] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[#06B4C9]">Edit Mode Active</h3>
                      <p className="text-xs text-gray-600">Make your changes and click Save Changes when done</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-2 h-2 bg-[#06B4C9] rounded-full animate-pulse"></span>
                      Editing
                    </div>
                  </div>
                )}
                {/* Personal Information */}
                <div className={`bg-white rounded-xl border p-5 mb-4 transition-all ${isEditing ? 'border-[#06B4C9]' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
                    {!isEditing && (
                      <button type="button" onClick={() => setIsEditing(true)} className="text-sm text-[#06B4C9] hover:text-[#06B4C9]/80 font-medium">Edit</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} disabled={!isEditing} 
                        className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#06B4C9]'}`} />
                      {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} disabled={!isEditing} 
                        className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#06B4C9]'}`} />
                      {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input type="email" name="email" value={formData.email} disabled={true} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} 
                        placeholder="+63 912 345 6789"
                        className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#06B4C9]'}`} />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                      <input type="text" name="location" value={formData.location} onChange={handleChange} disabled={!isEditing} placeholder="e.g., Manila, Philippines" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-gray-700">Bio</label>
                        <span className={`text-xs ${formData.bio.length >= 100 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                          {formData.bio.length}/100
                        </span>
                      </div>
                      <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} disabled={!isEditing} 
                        placeholder="Tell us about yourself..."
                        className={`w-full px-4 py-2 border rounded-lg outline-none resize-none disabled:bg-gray-50 ${errors.bio ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#06B4C9]'}`} />
                      {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                    </div>
                  </div>
                </div>


                <div className={`bg-white rounded-xl border p-5 mb-4 transition-all ${isEditing ? 'border-[#06B4C9]' : 'border-gray-200'}`}>
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Professional Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization</label>
                      <select name="specialization" value={formData.specialization} onChange={handleChange} disabled={!isEditing} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry Sector</label>
                      <select name="industrySector" value={formData.industrySector} onChange={handleChange} disabled={!isEditing} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50">
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

                <div className={`bg-white rounded-xl border p-5 mb-4 transition-all ${isEditing ? 'border-[#06B4C9]' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Work Experience</h2>
                    {isEditing && (
                      <button type="button" onClick={addWorkExperience} className="text-sm text-[#06B4C9] hover:underline">+ Add Experience</button>
                    )}
                  </div>
                  {formData.workExperience.map((exp, index) => (
                    <div key={index} className="mb-4 pb-4 border-b border-gray-100 last:mb-0 last:pb-0 last:border-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
                          <input type="text" value={exp.title} onChange={e => updateWorkExperience(index, 'title', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                          <input type="text" value={exp.company} onChange={e => updateWorkExperience(index, 'company', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                          <input type="month" value={exp.start_date} onChange={e => updateWorkExperience(index, 'start_date', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                          <div className="flex gap-2 items-center">
                            <input type="month" value={exp.end_date} onChange={e => updateWorkExperience(index, 'end_date', e.target.value)} disabled={!isEditing || exp.current}
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                            <label className="flex items-center gap-1 text-xs text-gray-600">
                              <input type="checkbox" checked={exp.current} onChange={e => updateWorkExperience(index, 'current', e.target.checked)} disabled={!isEditing} /> Present
                            </label>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                          <textarea value={exp.description} onChange={e => updateWorkExperience(index, 'description', e.target.value)} disabled={!isEditing} rows={2}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2 text-right">
                          <button type="button" onClick={() => removeWorkExperience(index)} className="text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {formData.workExperience.length === 0 && <p className="text-sm text-gray-500">No work experience added.</p>}
                </div>

                {/* Education */}
                <div className={`bg-white rounded-xl border p-5 mb-4 transition-all ${isEditing ? 'border-[#06B4C9]' : 'border-gray-200'}`}>
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Education</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">University</label>
                      <input type="text" name="university" value={formData.university} onChange={handleChange} disabled={!isEditing} 
                        className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.university ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#06B4C9]'}`} />
                      {errors.university && <p className="text-red-500 text-xs mt-1">{errors.university}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Major</label>
                      <input type="text" name="major" value={formData.major} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Graduation Year</label>
                      <input type="text" name="graduationYear" value={formData.graduationYear} onChange={handleChange} disabled={!isEditing} 
                        className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.graduationYear ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#06B4C9]'}`} />
                      {errors.graduationYear && <p className="text-red-500 text-xs mt-1">{errors.graduationYear}</p>}
                    </div>
                  </div>
                </div>


                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-3 mb-4">
                    <button type="button" onClick={handleCancel} className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                    <button type="submit" disabled={saving} className="w-full sm:w-auto px-6 py-2 bg-[#06B4C9] text-white rounded-lg hover:bg-[#06B4C9]/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* ═══ PREFERENCES TAB ═══ */}
            {activeTab === 'preferences' && (
              <>
                {/* Appearance */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Appearance</h2>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Theme Preference</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={toggleTheme} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg border-2 transition-all ${theme === 'light' ? 'border-[#06B4C9] bg-[#06B4C9]/10 text-[#06B4C9]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
                      <span className="font-medium text-sm">Light Mode</span>
                    </button>
                    <button type="button" onClick={toggleTheme} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg border-2 transition-all ${theme === 'dark' ? 'border-[#06B4C9] bg-[#06B4C9]/10 text-[#06B4C9]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
                      <span className="font-medium text-sm">Dark Mode</span>
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Notifications</h2>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                        <p className="text-xs text-gray-500">Receive updates about credentials and activity</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06B4C9]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 flex items-center gap-1">Skill Expiry Alerts <HelpTip text="Some certificates have expiration dates. This notifies you before they expire so you can renew them." size={12} /></p>
                        <p className="text-xs text-gray-500">Get notified when credentials are about to expire</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06B4C9]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 flex items-center gap-1">Market Updates <HelpTip text="A weekly AI-generated summary of how your skills are trending in the job market." size={12} /></p>
                        <p className="text-xs text-gray-500">Weekly summary of skill market trends</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06B4C9]"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ SECURITY TAB ═══ */}
            {activeTab === 'security' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Password</h2>
                  <p className="text-xs text-gray-500 mb-4">Update your password to keep your account secure</p>
                  <button type="button" className="px-5 py-2 bg-[#06B4C9] text-white text-sm rounded-lg hover:bg-[#06B4C9]/80 transition-colors font-medium">Change Password</button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    Two-Factor Authentication
                    <HelpTip text="An extra security step that requires a code from an app like Google Authenticator or Authy when you log in." size={14} />
                    {mfa2faEnabled && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Enabled
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">
                    {mfa2faEnabled
                      ? 'Your account is protected with an authenticator app.'
                      : 'Add an extra layer of security using TOTP authenticator'}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/student/profile/security')}
                    className={`px-5 py-2 text-sm rounded-lg transition-colors font-medium ${
                      mfa2faEnabled
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-[#06B4C9] text-white hover:bg-[#06B4C9]/80'
                    }`}
                  >
                    {mfa2faEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-1">Active Sessions <HelpTip text="Devices or browsers where you're currently logged in. You can see and manage them here." size={14} /></h2>
                  <p className="text-xs text-gray-500 mb-4">Manage devices where you&apos;re currently logged in</p>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Current session</p>
                      <p className="text-xs text-gray-400">This device &middot; Active now</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-red-200 p-5 mb-4">
                  <h2 className="text-base font-semibold text-red-600 mb-1">Delete Account</h2>
                  <p className="text-xs text-gray-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  <button type="button" className="px-5 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors font-medium">Delete Account</button>
                </div>
              </>
            )}

          </div>

          {/* Right sidebar — only show on Edit Profile tab */}
          {activeTab === 'profile' && (
            <div className="w-full lg:w-72 flex-shrink-0 space-y-4">

              {/* Profile Completion Card */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-[#06B4C9]  px-5 py-4">
                  <h2 className="text-sm font-semibold text-white">Profile Strength</h2>
                  <p className="text-xs text-white/70 mt-0.5">Fill in the missing fields below</p>
                </div>

                {/* Progress Ring */}
                <div className="flex flex-col items-center py-6 px-5">
                  <div className="relative w-28 h-28 mb-3">
                    <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="46" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                      <circle
                        cx="56" cy="56" r="46" fill="none"
                        stroke={profileCompletion >= 80 ? '#22c55e' : profileCompletion >= 50 ? '#06B4C9' : '#f59e0b'}
                        strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 46}`}
                        strokeDashoffset={`${2 * Math.PI * 46 * (1 - profileCompletion / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">{profileCompletion}%</span>
                      <span className="text-[10px] text-gray-400 font-medium">Complete</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                    profileCompletion >= 80 ? 'bg-green-100 text-green-700' :
                    profileCompletion >= 50 ? 'bg-cyan-100 text-[#06B4C9]' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      profileCompletion >= 80 ? 'bg-green-500' :
                      profileCompletion >= 50 ? 'bg-[#06B4C9]' :
                      'bg-amber-500'
                    }`}></span>
                    {profileCompletion >= 80 ? 'Looking great!' : profileCompletion >= 50 ? 'Good progress' : 'Just getting started'}
                  </span>
                </div>

                {/* Divider */}
                <div className="mx-5 border-t border-gray-100" />

                {/* Checklist */}
                <div className="px-5 py-4 space-y-4">
                  {/* Personal Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-md bg-[#06B4C9]/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Personal</span>
                    </div>
                    <div className="space-y-1.5 pl-1">
                      {progressItems.slice(0, 6).map((item, index) => (
                        <div key={index} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${item.completed ? 'bg-gray-50' : 'bg-amber-50/60 hover:bg-amber-50'}`}>
                          <div className="flex items-center gap-2.5">
                            {item.completed ? (
                              <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0"></span>
                            )}
                            <span className={`text-xs ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{item.label}</span>
                          </div>
                          {!item.completed && (
                            <span className="text-[11px] font-bold text-[#06B4C9] bg-[#06B4C9]/10 px-1.5 py-0.5 rounded-md">+{item.weight}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Education Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9-5m9 5l9-5" /></svg>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Education</span>
                    </div>
                    <div className="space-y-1.5 pl-1">
                      {progressItems.slice(6, 9).map((item, index) => (
                        <div key={index} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ${item.completed ? 'bg-gray-50' : 'bg-amber-50/60 hover:bg-amber-50'}`}>
                          <div className="flex items-center gap-2.5">
                            {item.completed ? (
                              <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0"></span>
                            )}
                            <span className={`text-xs ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{item.label}</span>
                          </div>
                          {!item.completed && (
                            <span className="text-[11px] font-bold text-[#06B4C9] bg-[#06B4C9]/10 px-1.5 py-0.5 rounded-md">+{item.weight}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer tip */}
                {profileCompletion < 100 && (
                  <div className="mx-5 mb-5 bg-[#06B4C9]/5 border border-[#06B4C9]/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-[#06B4C9] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" /></svg>
                    <p className="text-[11px] text-gray-500 leading-relaxed">A complete profile increases your chances of getting noticed by employers.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}