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
    const baseClasses = 'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm';
    
    switch (type) {
      case 'success':
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-green-400 to-green-600`}>
            <span>G</span>
          </div>
        );
      case 'warning':
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-orange-400 to-orange-600`}>
            <span>!</span>
          </div>
        );
      case 'badge':
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-purple-400 to-purple-600`}>
            <span>D</span>
          </div>
        );
      case 'info':
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-blue-400 to-blue-600`}>
            <span>S</span>
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
