'use client';
import Link from 'next/link';

interface CredentialCardProps {
  id: string; // ✅ Added ID for routing
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
}

export default function CredentialCard({
  id,
  category,
  title,
  issueDate,
  marketRelevance,
  verified,
}: CredentialCardProps) {
  return (
    <Link href={`/student/skills/${id}`}>
      <div className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden">
        {/* Subtle Hover Effect Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="text-[10px] uppercase tracking-wider font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            {category}
          </div>
          <div className="text-gray-400 group-hover:text-purple-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-gray-900 font-bold mb-1 text-lg group-hover:text-purple-700 transition-colors">
          {title}
        </h3>

        {/* Issue Date */}
        <p className="text-sm text-gray-500 mb-6">Issued: {issueDate}</p>

        {/* Footer */}
        <div className="flex items-end justify-between relative z-10">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-tight">Market Relevance</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">
                {marketRelevance}%
              </span>
              <span className="text-green-500 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded">
                ▲ +5%
              </span>
            </div>
          </div>

          {verified && (
            <div className="flex items-center gap-1.5 text-white text-[10px] font-bold bg-purple-600 px-3 py-1.5 rounded-lg shadow-sm shadow-purple-200">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              VERIFIED
            </div>
          )}
        </div>
        
        {/* Hover Hint */}
        <div className="mt-4 pt-4 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-purple-500 font-bold flex items-center gap-1">
           CLICK TO VIEW BLOCKCHAIN PROOF 
           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </div>
      </div>
    </Link>
  );
}