export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">VECTOR</span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">How it Works</a>
            <a href="#solutions" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Solutions</a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            <a href="/login" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
              Sign In
            </a>
            <a href="/register" className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all">
              Get Started
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}