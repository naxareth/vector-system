'use client';
import Tooltip from '../shared/Tooltip';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
  color: 'purple' | 'blue' | 'orange' | 'green';
}

function MetricCard({ icon, title, value, subtitle, trend, color }: MetricCardProps) {
  const colorClasses = {
    purple: 'from-purple-600 to-purple-800',
    blue: 'from-blue-600 to-blue-800',
    orange: 'from-orange-600 to-orange-800',
    green: 'from-green-600 to-green-800',
  };

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  const trendIcon = {
    up: (
      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: null,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow relative">
      <div className={`h-2 bg-gradient-to-r ${colorClasses[color]} rounded-t-2xl`}></div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-gray-600">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        
        <div className="mb-2">
          <p className="text-4xl font-bold text-gray-900">{value}</p>
        </div>
        
        <div className={`text-sm ${trendColors[trend]} flex items-center gap-1`}>
          {trendIcon[trend]}
          <span>{subtitle}</span>
        </div>
      </div>
    </div>
  );
}

export default function MetricCards() {
  return (
    // Added Tour ID here
    <div id="tour-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
      
      {/* 1. Verified Skills */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative"> 
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-purple-50 rounded-lg">
             <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          
          <Tooltip content="Skills permanently verified">
            <div className="text-gray-400 cursor-help hover:text-purple-600 transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </Tooltip>
        </div>
        <h3 className="text-3xl font-bold text-gray-900">12</h3>
        <p className="text-sm text-gray-500">Verified Skills</p>
        <div className="text-sm text-green-500 flex items-center gap-1 mt-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
           <span>+3 this semester</span>
        </div>
      </div>

      {/* 2. Market Score */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
             <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          
          <Tooltip content="Relevance of your skills to live job market data">
            <div className="text-gray-400 cursor-help hover:text-blue-600 transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </Tooltip>
        </div>
        <h3 className="text-3xl font-bold text-gray-900">84%</h3>
        <p className="text-sm text-gray-500">Market Relevance</p>
        <div className="text-sm text-green-500 flex items-center gap-1 mt-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
           <span>+5% from last month</span>
        </div>
      </div>

      {/* 3. Skill Health */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-orange-50 rounded-lg">
             <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          
          <Tooltip content="Skills that are currently trending vs decaying">
            <div className="text-gray-400 cursor-help hover:text-orange-600 transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </Tooltip>
        </div>
        <h3 className="text-3xl font-bold text-gray-900">9/12</h3>
        <p className="text-sm text-gray-500">Skill Health</p>
        <div className="text-sm text-red-500 flex items-center gap-1 mt-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
           <span>1 skill needs attention</span>
        </div>
      </div>

      {/* 4. Credential Tokens */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-green-50 rounded-lg">
             <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          
          <Tooltip content="Total skill badges earned">
            <div className="text-gray-400 cursor-help hover:text-green-600 transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </Tooltip>
        </div>
        <h3 className="text-3xl font-bold text-gray-900">18</h3>
        <p className="text-sm text-gray-500">Credential Tokens</p>
        <div className="text-sm text-green-500 flex items-center gap-1 mt-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
           <span>Verified Skill Badges</span>
        </div>
      </div>

    </div>
  );
}