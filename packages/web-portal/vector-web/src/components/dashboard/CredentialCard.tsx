'use client';
import Link from 'next/link';
import HelpTip from '@/components/shared/HelpTip';

interface CredentialCardProps {
  id: string; 
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
  credentialData?: Record<string, any>; // ✅ New prop for dynamic W3C payload
}

export default function CredentialCard({
  id,
  category,
  title,
  issueDate,
  marketRelevance,
  verified,
  credentialData,
}: CredentialCardProps) {

  // Helper to format JSON keys nicely (e.g., "hours_completed" -> "Hours Completed")
  const formatKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <Link href={`/student/skills/${id}`}>
      <div className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#06B4C9] hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-full">
        {/* Subtle Hover Effect Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#06B4C9]/10 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[#06B4C9] bg-[#06B4C9]/10 px-3 py-1 rounded-full border border-[#06B4C9]/20">
            {category}
          </div>
          <div className="text-gray-400 group-hover:text-[#06B4C9] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-gray-900 font-bold mb-1 text-lg group-hover:text-[#06B4C9] transition-colors relative z-10">
          {title}
        </h3>

        {/* Issue Date */}
        <p className="text-sm text-gray-500 mb-4 relative z-10">Issued: {issueDate}</p>

        {/* ✅ DYNAMIC FIELDS RENDERER */}
        {credentialData && Object.keys(credentialData).length > 0 && (
          <div className="mb-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-3 relative z-10 flex-grow">
            {Object.entries(credentialData).map(([key, value]) => {
              if (key === 'id') return null; // Skip rendering the internal student DID subject ID
              return (
                <div key={key} className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tight truncate">
                    {formatKey(key)}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate" title={String(value)}>
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-end justify-between relative z-10">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-tight">Market Relevance <HelpTip size={11} text="How in-demand this skill is with employers right now, based on live job market data." /></p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-gray-900 group-hover:text-[#06B4C9] transition-colors">
                {marketRelevance}%
              </span>
              <span className="text-green-500 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded">
                ▲ +5%
              </span>
            </div>
          </div>

          {verified && (
            <div className="flex items-center gap-1.5 text-white text-[10px] font-bold bg-[#06B4C9] px-3 py-1.5 rounded-lg shadow-sm shadow-[#06B4C9]/20">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              VERIFIED
            </div>
          )}
        </div>
        
        {/* Hover Hint */}
        <div className="absolute bottom-4 left-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#06B4C9] font-bold flex items-center gap-1 justify-center bg-white/90 backdrop-blur-sm pt-2">
           CLICK TO VIEW VERIFICATION DETAILS 
           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </div>
      </div>
    </Link>
  );
}