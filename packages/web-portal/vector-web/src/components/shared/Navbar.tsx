'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#06B4C9] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">VECTOR</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">How it Works</a>
            <a href="#cta" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Get Started</a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/register" className="px-5 py-2 bg-[#06B4C9] hover:bg-[#06B4C9]/85 !text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#06B4C9]/20">
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4 space-y-3 animate-fade-in-up">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">Features</a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">How it Works</a>
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1 text-center text-sm text-gray-600 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50">Sign In</Link>
              <Link href="/register" className="flex-1 text-center text-sm text-white bg-[#06B4C9] rounded-lg py-2.5 hover:bg-[#06B4C9]/85">Get Started</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}