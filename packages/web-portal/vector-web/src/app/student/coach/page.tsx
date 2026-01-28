'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';

export default function CoachPage() {
  const router = useRouter();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const trendData = [
    { month: 'Jan', value: 35 },
    { month: 'Feb', value: 42 },
    { month: 'Mar', value: 48 },
    { month: 'Apr', value: 52 },
    { month: 'May', value: 51 },
    { month: 'Jun', value: 58 },
    { month: 'Jul', value: 65 },
    { month: 'Aug', value: 72 },
    { month: 'Sep', value: 78 },
    { month: 'Oct', value: 75 },
    { month: 'Nov', value: 82 },
    { month: 'Dec', value: 85 },
  ];

  const maxValue = Math.max(...trendData.map(d => d.value));

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Career Intelligence Report</h1>
            </div>
            <p className="text-sm md:text-base text-gray-500">AI-powered analysis of your skill portfolio against real-time market data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <span className="text-gray-500 text-xs md:text-sm">Last updated: 2 hours ago</span>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs md:text-sm">
              <svg className="w-4 h-4" fill="none" stroke="gray" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs md:text-sm text-gray-500">Update Analysis</span>
            </button>
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs md:text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="gray" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-xs md:text-sm text-gray-500">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 md:mb-8">
        <div className="flex items-start gap-3 mb-3 md:mb-0">
          <div className="text-orange-500 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-1">Skill Decay Detected</h3>
            <p className="text-orange-700 text-sm">
              Your Java proficiency relevance has dropped 8% due to market shifts towards Kotlin and Rust
            </p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/student/coach')}
          className="w-full md:w-auto md:ml-auto md:mt-0 mt-3 text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center justify-center md:justify-start gap-1"
        >
          View Upskilling Options
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skill Relevance Trends Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Skill Relevance Trends</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">6 Months</button>
                <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded">1 Year</button>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="mb-8 overflow-x-auto">
              <div className="flex items-end justify-between h-56 md:h-64 gap-2 min-w-[300px]">
                {trendData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-purple-600 rounded-t hover:bg-purple-700 transition-all" 
                         style={{ height: `${(data.value / maxValue) * 100}%` }}>
                    </div>
                    <span className="text-xs text-gray-500">{data.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Your Portfolio Score</div>
                <div className="text-2xl md:text-3xl font-bold text-purple-600">88/100</div>
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Market Alignment</div>
                <div className="text-2xl md:text-3xl font-bold text-teal-500">High</div>
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">Projected Growth</div>
                <div className="text-2xl md:text-3xl font-bold text-purple-600">+12%</div>
              </div>
            </div>
          </div>

          {/* Skills Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rising Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Rising Skills
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">Python</div>
                      <div className="text-xs text-gray-500">Data Science & AI</div>
                    </div>
                    <div className="text-green-600 font-semibold">+20%</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Growth</div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">Cloud (AWS)</div>
                      <div className="text-xs text-gray-500">Infrastructure</div>
                    </div>
                    <div className="text-green-600 font-semibold">+15%</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Growth</div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Declining Skills */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                Declining Skills
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">PHP (Legacy)</div>
                      <div className="text-xs text-gray-500">Web Development</div>
                    </div>
                    <div className="text-red-600 font-semibold">-15%</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Decline</div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">jQuery</div>
                      <div className="text-xs text-gray-500">Frontend</div>
                    </div>
                    <div className="text-red-600 font-semibold">-25%</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Decline</div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Recommended Actions */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h2>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-start gap-3 mb-3">
                  <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Advanced Kotlin Course</h3>
                    <p className="text-xs text-gray-600">Coursera • 4 Weeks</p>
                  </div>
                </div>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                  Start Learning
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-start gap-3 mb-3">
                  <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Senior Backend Role</h3>
                    <p className="text-xs text-gray-600">FinTech Co. • Remote</p>
                  </div>
                </div>
                <button className="w-full border border-purple-600 text-purple-600 hover:bg-purple-50 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                  View Job
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Market Snapshot */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Market Snapshot</h2>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Average Salary (Your Profile)</div>
                <div className="text-2xl font-bold text-gray-900">₱65,000 - ₱90,000</div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Top Hiring Industry</div>
                <div className="text-lg font-semibold text-gray-900">FinTech & Banking</div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Remote Opportunities</div>
                <div className="text-lg font-semibold text-gray-900">High (78%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Export CVR Modal */}
      <ExportCVRModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
