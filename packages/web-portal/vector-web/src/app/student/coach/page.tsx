'use client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function CoachPage() {
  const recommendations = [
    {
      title: 'Upskill in Kotlin',
      reason: 'Your Java proficiency is declining in market relevance',
      impact: 'High',
      timeEstimate: '3-4 weeks',
    },
    {
      title: 'Learn TypeScript',
      reason: 'Complements your React skills and increases job opportunities',
      impact: 'Medium',
      timeEstimate: '2-3 weeks',
    },
    {
      title: 'Cloud Certifications',
      reason: 'AWS/Azure certifications are highly valued in current market',
      impact: 'Very High',
      timeEstimate: '6-8 weeks',
    },
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Career Coach</h1>
        <p className="text-gray-500">Personalized recommendations based on your skills and market trends</p>
      </div>

      {/* Recommendations */}
      <div className="space-y-6 mb-8">
        {recommendations.map((rec, index) => (
          <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                rec.impact === 'Very High' ? 'bg-red-50 text-red-600' :
                rec.impact === 'High' ? 'bg-orange-50 text-orange-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {rec.impact} Impact
              </span>
            </div>
            <p className="text-gray-600 mb-4">{rec.reason}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Est. Time: {rec.timeEstimate}</span>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Start Learning Path
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Interface Preview */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ask Your Coach</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ask about career paths, skill gaps, or learning resources..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium">
            Send
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
