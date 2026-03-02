export default function Footer() {
  return (
    <footer className="py-16 px-6 bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#06B4C9] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">VECTOR</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              The platform for verified academic records you can trust — bridging credential gaps with secure verification and AI.
            </p>
            <div className="flex items-center gap-2">
              <a href="#" className="w-8 h-8 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Product</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-[#06B4C9] transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-[#06B4C9] transition-colors">How it Works</a></li>
              <li><a href="/register" className="hover:text-[#06B4C9] transition-colors">Get Started</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Connect</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#06B4C9] transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-[#06B4C9] transition-colors">X (Twitter)</a></li>
              <li><a href="mailto:hello@vector.edu" className="hover:text-[#06B4C9] transition-colors">Email</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="/privacy" className="hover:text-[#06B4C9] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[#06B4C9] transition-colors">Terms of Service</a></li>
              <li><a href="/security" className="hover:text-[#06B4C9] transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Vector. All rights reserved.</p>

        </div>
      </div>
    </footer>
  );
}