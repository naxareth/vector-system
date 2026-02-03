'use client';

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
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-2 bg-gradient-to-r ${colorClasses[color]}`}></div>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
      <MetricCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="Verified Skills"
        value={12}
        subtitle="+3 this semester"
        trend="up"
        color="purple"
      />
      
      <MetricCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
        title="Market Score"
        value="84%"
        subtitle="+5% from last month"
        trend="up"
        color="blue"
      />
      
      <MetricCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        title="Skill Health"
        value="9/12"
        subtitle="1 skill needs attention"
        trend="down"
        color="orange"
      />
      
      <MetricCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        title="Credential Tokens"
        value={18}
        subtitle="ERC-1155 on Polygon"
        trend="up"
        color="green"
      />
    </div>
  );
}
