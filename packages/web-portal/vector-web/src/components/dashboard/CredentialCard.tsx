interface CredentialCardProps {
  category: string;
  title: string;
  issueDate: string;
  marketRelevance: number;
  verified: boolean;
}

export default function CredentialCard({
  category,
  title,
  issueDate,
  marketRelevance,
  verified,
}: CredentialCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
          {category}
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <h3 className="text-gray-900 font-semibold mb-2 text-base">{title}</h3>

      {/* Issue Date */}
      <p className="text-sm text-gray-500 mb-4">Issued: {issueDate}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Market Relevance</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-purple-600">{marketRelevance}%</span>
            <span className="text-green-500 text-xs">▲ +5%</span>
          </div>
        </div>
        {verified && (
          <div className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-3 py-1.5 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </div>
        )}
      </div>
    </div>
  );
}
