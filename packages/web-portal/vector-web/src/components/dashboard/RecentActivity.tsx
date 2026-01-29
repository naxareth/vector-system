'use client';

export interface ActivityItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'badge';
  title: string;
  description: string;
  time: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  
  const getActivityIcon = (type: string) => {
    const baseClasses = 'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0';
    
    switch (type) {
      case 'success': // Green (Verification)
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-green-400 to-green-600`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        );
      case 'warning': // Orange (Alerts)
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-orange-400 to-orange-600`}>
            <span>!</span>
          </div>
        );
      case 'badge': // Purple (Achievements/CVR)
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-purple-400 to-purple-600`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
        );
      case 'info': // Blue (System/Wallet)
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-blue-400 to-blue-600`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-500 truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap pt-1">{activity.time}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No recent activity detected.</p>
        )}
      </div>
    </div>
  );
}