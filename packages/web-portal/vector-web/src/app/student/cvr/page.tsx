'use client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function CVRPage() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Credential Verified Resume (CVR)</h1>
            <p className="text-gray-500">Generate blockchain-verified resumes for employers</p>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Resume Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            {/* Header */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ace Student</h2>
              <p className="text-gray-600">Full-Stack Developer</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>ace@student.edu</span>
                <span>•</span>
                <span>Portfolio: acestudent.dev</span>
              </div>
            </div>

            {/* Verified Skills */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified Skills
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Advanced SQL Querying</span>
                  <span className="text-purple-600 font-medium">92% Proficiency</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">React Application Development</span>
                  <span className="text-purple-600 font-medium">88% Proficiency</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Data Structures & Algorithms</span>
                  <span className="text-purple-600 font-medium">95% Proficiency</span>
                </div>
              </div>
            </div>

            {/* Blockchain Verification */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <div className="text-purple-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900 mb-1">Blockchain Verified</p>
                  <p className="text-xs text-purple-700 font-mono break-all">
                    0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Options Panel */}
        <div className="space-y-6">
          {/* Customization */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customize CVR</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Professional</option>
                  <option>Modern</option>
                  <option>Minimal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Skills
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm text-gray-700">All Verified Skills</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm text-gray-700">Blockchain Proof</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-gray-700">QR Code</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Share Options */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Share CVR</h3>
            <div className="space-y-3">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium text-sm">
                Generate Public Link
              </button>
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium text-sm">
                Send to Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
