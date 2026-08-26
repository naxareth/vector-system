'use client';

import { useEffect, useState } from 'react';
import EmployerLayout from '@/components/dashboard/EmployerLayout';

interface EmployerProfileFormData {
  company_name: string;
  industry: string;
  company_size: string;
  website: string;
  description: string;
  logo_url: string;
}

const initialFormData: EmployerProfileFormData = {
  company_name: '',
  industry: '',
  company_size: '',
  website: '',
  description: '',
  logo_url: '',
};

export default function EmployerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<EmployerProfileFormData>(initialFormData);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save employer profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EmployerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Complete your company profile before posting jobs.
        </p>
      </div>

      <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading profile...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
              <input
                required
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Size</label>
                <input
                  type="text"
                  value={formData.company_size}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Description</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg dark:bg-[#0E1220] dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 !text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </EmployerLayout>
  );
}
