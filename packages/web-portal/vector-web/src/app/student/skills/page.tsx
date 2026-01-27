'use client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SkillsPage() {
  const skills = [
    {
      name: 'Advanced SQL',
      category: 'Database',
      marketDemand: 'High',
      lastUpdated: '2 weeks ago',
      trend: 'up',
    },
    {
      name: 'React Development',
      category: 'Frontend',
      marketDemand: 'Very High',
      lastUpdated: '1 month ago',
      trend: 'up',
    },
    {
      name: 'Java OOP',
      category: 'Backend',
      marketDemand: 'Medium',
      lastUpdated: '3 months ago',
      trend: 'down',
    },
    {
      name: 'Data Structures',
      category: 'Computer Science',
      marketDemand: 'Very High',
      lastUpdated: '1 week ago',
      trend: 'stable',
    },
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Skills</h1>
        <p className="text-sm md:text-base text-gray-500">Track and manage your verified skills</p>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {skills.map((skill, index) => (
          <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{skill.name}</h3>
                <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  {skill.category}
                </span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                skill.trend === 'up' ? 'text-green-600' : 
                skill.trend === 'down' ? 'text-red-600' : 
                'text-gray-400'
              }`}>
                {skill.trend === 'up' && '↗'}
                {skill.trend === 'down' && '↘'}
                {skill.trend === 'stable' && '→'}
              </div>
            </div>

            {/* Market Demand */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Market Demand:</span>
              <span className={`font-medium ${
                skill.marketDemand === 'Very High' ? 'text-green-600' :
                skill.marketDemand === 'High' ? 'text-blue-600' :
                'text-orange-600'
              }`}>
                {skill.marketDemand}
              </span>
            </div>

            <div className="text-xs text-gray-400 mt-3">
              Last updated: {skill.lastUpdated}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
