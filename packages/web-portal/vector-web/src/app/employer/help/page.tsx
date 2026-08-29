'use client';

import { useState } from 'react';
import EmployerLayout from '@/components/dashboard/EmployerLayout';

const FAQS = [
  {
    category: 'Job Postings',
    question: 'How do I post a new job position?',
    answer: 'Navigate to "Manage Postings" in the sidebar menu and click the "Post New Job" button at the top right. Fill in the job details, skills, and submit.'
  },
  {
    category: 'Job Postings',
    question: 'How long do job postings stay active?',
    answer: 'By default, job listings remain active for 15 days. You can extend or renew any listing anytime directly from your Manage Postings page.'
  },
  {
    category: 'Candidates & Applications',
    question: 'How does candidate skill matching work?',
    answer: 'VECTOR automatically cross-references student verified credentials with your required job skills to generate a percentage match score for each candidate.'
  },
  {
    category: 'Candidates & Applications',
    question: 'Can I export student CVR (Credentialed Verification Record) data?',
    answer: 'Yes! Click "Review" on any candidate application to view their verified credentials and export their CVR file directly.'
  },
  {
    category: 'Account & Profile',
    question: 'How do I update my company profile information?',
    answer: 'Go to "Company Profile" in the sidebar under GENERAL. Here you can update your company logo, description, website link, and contact details.'
  },
];

export default function HelpCenterPage() {
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter(faq =>
    !search.trim() ||
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.answer.toLowerCase().includes(search.toLowerCase()) ||
    faq.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EmployerLayout>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Help Center &amp; Support</h1>
        <p className="text-sm text-gray-500 dark:text-[#64748B] mt-1">
          Find answers, guides, and assistance for managing your employer account.
        </p>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#06B4C9]/10 via-[#06B4C9]/5 to-transparent border border-[#06B4C9]/20 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">How can we help you today?</h2>
        <p className="text-xs text-gray-500 dark:text-[#64748B] mb-4">Search our knowledge base for quick answers to common questions.</p>
        <div className="relative max-w-xl">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search help articles, postings, candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#4A5568] focus:outline-none focus:ring-2 focus:ring-[#06B4C9]/40 focus:border-[#06B4C9] transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* ── Quick Support Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl p-5 hover:border-[#06B4C9] hover:-translate-y-1 transition-all duration-200">
          <div className="w-10 h-10 bg-[#06B4C9]/10 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Documentation</h3>
          <p className="text-xs text-gray-500 dark:text-[#64748B]">Read full guides on setting up your employer account and postings.</p>
        </div>

        <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl p-5 hover:border-[#06B4C9] hover:-translate-y-1 transition-all duration-200">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Email Support</h3>
          <p className="text-xs text-gray-500 dark:text-[#64748B]">Contact our employer support team directly for specialized assistance.</p>
          <a href="mailto:support@vector.edu" className="text-xs text-[#06B4C9] font-semibold hover:underline mt-2 inline-block">support@vector.edu →</a>
        </div>

        <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl p-5 hover:border-[#06B4C9] hover:-translate-y-1 transition-all duration-200">
          <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Verification System</h3>
          <p className="text-xs text-gray-500 dark:text-[#64748B]">Learn more about VECTOR verified skill credentials and CVR authenticity.</p>
        </div>
      </div>

      {/* ── FAQs ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-2xl p-6 hover:border-[#06B4C9] hover:-translate-y-1 transition-all duration-200">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>

        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="border border-gray-100 dark:border-[#1E2536] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#06B4C9]/10 text-[#06B4C9]">
                      {faq.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{faq.question}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 border-t border-gray-100 dark:border-[#1E2536] text-xs text-gray-600 dark:text-[#94A3B8] leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </EmployerLayout>
  );
}
