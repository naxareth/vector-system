'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod'; // 1. Import Zod

// 2. Define Validation Schema
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name too long").regex(/^[a-zA-Z\s]*$/, "Name can only contain letters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name too long"),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number format").optional().or(z.literal('')),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  university: z.string().min(2, "University name is required"),
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
  walletAddress: string;
  location: string;
  photoUrl: string;
  studentId: string;
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
  
  // 3. Add Error State
  const [errors, setErrors] = useState<Record<string, string>>({}); 

  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    university: 'PHINMA University',
    major: '',
    graduationYear: '',
    walletAddress: '',
    location: '',
    photoUrl: '',
    studentId: '',
  });

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        setUserId(session.user.id);
        const userEmail = session.user.email || '';

        const { data: userRecord, error } = await supabase
          .from('users')
          .select(`
            full_name, wallet_address, student_id, avatar_url, location,
            profiles ( phone, bio, university, major, graduation_year )
          `)
          .eq('id', session.user.id)
          .single();

        if (error) {
            console.error("Error loading user data:", error);
        }

        if (userRecord) {
          const nameParts = (userRecord.full_name || '').split(' ');
          const profile = Array.isArray(userRecord.profiles) ? userRecord.profiles[0] : userRecord.profiles;

          setFormData({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: userEmail,
            walletAddress: userRecord.wallet_address || '',
            location: userRecord.location || '',
            photoUrl: userRecord.avatar_url || '',
            studentId: userRecord.student_id || '',
            
            phone: profile?.phone || '',
            bio: profile?.bio || '',
            university: profile?.university || 'PHINMA University',
            major: profile?.major || '',
            graduationYear: profile?.graduation_year || '',
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

  const calculateProgress = (): { percentage: number; items: ProgressItem[] } => {
    const progressItems: ProgressItem[] = [
      { label: 'First Name', field: 'firstName', weight: 10, completed: !!formData.firstName },
      { label: 'Last Name', field: 'lastName', weight: 10, completed: !!formData.lastName },
      { label: 'Email', field: 'email', weight: 10, completed: !!formData.email },
      { label: 'Phone', field: 'phone', weight: 10, completed: !!formData.phone },
      { label: 'Location', field: 'location', weight: 10, completed: !!formData.location },
      { label: 'Bio', field: 'bio', weight: 15, completed: !!formData.bio && formData.bio.length > 10 },
      { label: 'MetaMask Wallet', field: 'walletAddress', weight: 15, completed: !!formData.walletAddress && formData.walletAddress.startsWith('0x') },
      { label: 'University', field: 'university', weight: 10, completed: !!formData.university },
      { label: 'Major', field: 'major', weight: 5, completed: !!formData.major },
      { label: 'Graduation Year', field: 'graduationYear', weight: 5, completed: !!formData.graduationYear },
    ];

    const completedWeight = progressItems.filter(item => item.completed).reduce((sum, item) => sum + item.weight, 0);
    const totalWeight = progressItems.reduce((sum, item) => sum + item.weight, 0);
    const percentage = Math.round((completedWeight / totalWeight) * 100);

    return { percentage, items: progressItems };
  };

  const { percentage: profileCompletion, items: progressItems } = calculateProgress();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error for this field when user types
    if (errors[e.target.name]) {
       setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[e.target.name];
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
          graduation_year: formData.graduationYear
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-4 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your account information and preferences</p>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span className="sm:inline">Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">

            {/* Profile Photo Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl flex-shrink-0">
                  {formData.firstName?.[0]}{formData.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{formData.firstName} {formData.lastName}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 font-mono truncate">{formData.walletAddress}</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} disabled={!isEditing} 
                      className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} disabled={!isEditing} 
                      className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                     {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={true} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} 
                      className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} disabled={!isEditing} placeholder="e.g., Manila, Philippines" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} disabled={!isEditing} 
                      className={`w-full px-4 py-2 border rounded-lg outline-none resize-none disabled:bg-gray-50 ${errors.bio ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                    {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                    <input type="text" name="walletAddress" value={formData.walletAddress} disabled={true} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 font-mono text-sm cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Education Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Education</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                    <input type="text" name="university" value={formData.university} onChange={handleChange} disabled={!isEditing} 
                       className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.university ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                    {errors.university && <p className="text-red-500 text-xs mt-1">{errors.university}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Major</label>
                    <input type="text" name="major" value={formData.major} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Graduation Year</label>
                    <input type="text" name="graduationYear" value={formData.graduationYear} onChange={handleChange} disabled={!isEditing} 
                      className={`w-full px-4 py-2 border rounded-lg outline-none disabled:bg-gray-50 ${errors.graduationYear ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                    {errors.graduationYear && <p className="text-red-500 text-xs mt-1">{errors.graduationYear}</p>}
                  </div>
                </div>
              </div>

              {/* Rest of the form remains same (Security, Appearance, Save Button) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
                <div className="space-y-4">
                  <div>
                    <button type="button" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Change Password</button>
                  </div>
                  <div>
                    <button type="button" onClick={() => router.push('/student/profile/security')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Enable Two-Factor Authentication</button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Theme Preference</label>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={toggleTheme} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg border-2 transition-all ${theme === 'light' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
                      <span className="font-medium">Light Mode</span>
                    </button>
                    <button type="button" onClick={toggleTheme} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg border-2 transition-all ${theme === 'dark' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
                      <span className="font-medium">Dark Mode</span>
                    </button>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button type="button" onClick={handleCancel} className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                  <button type="submit" disabled={saving} className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="w-full lg:w-80 flex-shrink-0">
             {/* Progress Bar Component (Unchanged) */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Complete your profile</h2>
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle cx="64" cy="64" r="56" stroke="#22c55e" strokeWidth="12" fill="none" strokeDasharray={`${2 * Math.PI * 56}`} strokeDashoffset={`${2 * Math.PI * 56 * (1 - profileCompletion / 100)}`} strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center"><div className="text-3xl font-bold text-gray-900">{profileCompletion}%</div></div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Personal Information</h3>
                  {progressItems.slice(0, 7).map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}></span>
                        <span className={`text-xs ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{item.label}</span>
                      </div>
                      <span className={`text-xs font-medium ${item.completed ? 'text-green-600' : 'text-purple-600'}`}>{item.completed ? '' : `+${item.weight}%`}</span>
                    </div>
                  ))}
                </div>
                <div>
                   <h3 className="text-sm font-semibold text-gray-700 mb-2">Education</h3>
                   {progressItems.slice(7, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                         <span className={`w-4 h-4 rounded-full border ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}></span>
                        <span className={`text-xs ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{item.label}</span>
                      </div>
                      <span className={`text-xs font-medium ${item.completed ? 'text-green-600' : 'text-purple-600'}`}>{item.completed ? '' : `+${item.weight}%`}</span>
                    </div>
                  ))}
                </div>
              </div>
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}