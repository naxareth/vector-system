'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    // User Table Fields
    firstName: '',
    lastName: '',
    email: '',
    walletAddress: '',
    // Profile Table Fields
    phone: '',
    bio: '',
    university: '',
    major: '',
    graduationYear: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // ⚡ JOIN QUERY: Fetch User + Profile in one go
        const { data, error } = await supabase
          .from('users')
          .select(`
            full_name, wallet_address,
            profiles ( phone, bio, university, major, graduation_year )
          `)
          .eq('id', session.user.id)
          .single();

        if (data) {
          const nameParts = (data.full_name || '').split(' ');
          // Safely access the joined profile data (it comes as an array or object depending on relationship)
          const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

          setFormData({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: session.user.email || '',
            walletAddress: data.wallet_address || '',
            
            // Load from separate Profile table (with fallbacks)
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

    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Update 'users' table (Core Identity)
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`
        })
        .eq('id', session.user.id);

      if (userError) throw userError;

      // 2. Update 'profiles' table (Extended Info)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: session.user.id, // Ensure we link to correct user
          phone: formData.phone,
          bio: formData.bio,
          university: formData.university,
          major: formData.major,
          graduation_year: formData.graduationYear
        });

      if (profileError) throw profileError;
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => setIsEditing(false);

  if (loading && !formData.email) {
    return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-full">
                <span className="text-purple-600 animate-pulse">Loading profile...</span>
            </div>
        </DashboardLayout>
    );
  }

  // ... (Return JSX - NO CHANGES NEEDED to the UI part below this line) ...
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage your account information and preferences</p>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span className="sm:inline">Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
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

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={true} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none disabled:bg-gray-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none disabled:bg-gray-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                <input type="text" name="walletAddress" value={formData.walletAddress} disabled={true} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 font-mono text-sm cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Education</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                <input type="text" name="university" value={formData.university} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Major</label>
                <input type="text" name="major" value={formData.major} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Graduation Year</label>
                <input type="text" name="graduationYear" value={formData.graduationYear} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
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
              <button type="button" onClick={handleCancel} className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">Save Changes</button>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}