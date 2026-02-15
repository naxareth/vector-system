export default function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Main Heading */}
        <div className="text-center mb-6">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-2 leading-tight">
            Credentials,
          </h1>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
            Verified & Intelligent.
          </h1>
        </div>

        {/* Subheading */}
        <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto mb-10 leading-relaxed">
          The first decentralized micro-credentialing system that combines blockchain verification with predictive AI career analytics.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a 
            href="/register"
            className="group px-7 py-3.5 bg-purple-600 hover:bg-purple-700 !text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            Start Verifying
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <button className="px-7 py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            Watch Demo
          </button>
        </div>

        {/* Dashboard Preview */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block px-6 py-3 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-700">
                  Your Live Dashboard
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}