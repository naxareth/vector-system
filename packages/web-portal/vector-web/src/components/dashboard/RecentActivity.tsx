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
  
  const getActivityIcon = (type: string, title: string) => {
    const baseClasses = 'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0';
    const t = title.toLowerCase();

    // --- Wallet Connected ---
    if (t.includes('wallet')) {
      return (
        <div className={`${baseClasses} bg-blue-50 text-blue-500`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12h5v4h-5a2 2 0 010-4z" />
          </svg>
        </div>
      );
    }

    // --- CVR / Resume Generated ---
    if (t.includes('cvr') || t.includes('resume')) {
      return (
        <div className={`${baseClasses} bg-[#06B4C9]/10 text-[#06B4C9]`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 3h9l5 5v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v5h5" />
          </svg>
        </div>
      );
    }

    // --- Skill Verified / Credential / Badge ---
    if (t.includes('skill') || t.includes('verified') || t.includes('credential') || type === 'success') {
      return (
        <div className={`${baseClasses} bg-green-50 text-green-600`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      );
    }

    // --- Warning / Alert ---
    if (type === 'warning') {
      return (
        <div className={`${baseClasses} bg-orange-50 text-orange-500`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
      );
    }

    // --- Badge / Achievement ---
    if (type === 'badge') {
      return (
        <div className={`${baseClasses} bg-violet-50 text-violet-500`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l2 6H3l4 4-1.5 6L10 16l4.5 3L13 13l4-4h-4L15 3l-5 2-5-2z" />
          </svg>
        </div>
      );
    }

    // --- Default info ---
    return (
      <div className={`${baseClasses} bg-gray-100 text-gray-500`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              {getActivityIcon(activity.type, activity.title)}
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