export default function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-full">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-purple-700">Live on Polygon Amoy Testnet</span>
          </div>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-8">
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-4 leading-tight">
            Credentials,
          </h1>
          <h1 className="text-6xl md:text-7xl font-bold leading-tight bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Verified &
          </h1>
          <h1 className="text-6xl md:text-7xl font-bold leading-tight bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Intelligent.
          </h1>
        </div>

        {/* Subheading */}
        <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12 leading-relaxed">
          The first decentralized micro-credentialing system that combines blockchain verification with predictive AI career analytics.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="/register"
            className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full font-semibold text-lg hover:shadow-xl hover:shadow-purple-500/50 transition-all flex items-center gap-2"
          >
            Start Verifying
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <button className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-full font-semibold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
}