interface ActivityItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'badge';
  title: string;
  description: string;
  time: string;
}

export default function RecentActivity() {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'success',
      title: 'Advanced SQL Querying Verified',
      description: 'Your skill was verified by TechAcademy NGCO',
      time: '2 hrs ago',
    },
    {
      id: '2',
      type: 'warning',
      title: 'Skill Decay Alert',
      description: 'Java proficiency relevance dropped by 8%',
      time: '1 day ago',
    },
    {
      id: '3',
      type: 'badge',
      title: 'New Badge Earned',
      description: 'Earned "Database Master" badge',
      time: '3 days ago',
    },
    {
      id: '4',
      type: 'info',
      title: 'Profile View',
      description: 'TechStart Startups viewed your CVR',
      time: '1 week ago',
    },
  ];

  const getActivityIcon = (type: string) => {
    const baseClasses = 'w-10 h-10 rounded-full flex items-center justify-center';
    
    switch (type) {
      case 'success':
        return (
          <div className={`${baseClasses} bg-green-100`}>
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className={`${baseClasses} bg-orange-100`}>
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'badge':
        return (
          <div className={`${baseClasses} bg-purple-100`}>
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className={`${baseClasses} bg-blue-100`}>
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4">
            {getActivityIcon(activity.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-sm text-gray-500">{activity.description}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
