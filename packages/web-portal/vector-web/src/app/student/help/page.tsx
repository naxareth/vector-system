'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import HelpTip from '@/components/shared/HelpTip';

const FAQ_ITEMS = [
  {
    question: 'What is a Verified Credential?',
    answer:
      'A Verified Credential is a certificate or qualification issued by your university and securely recorded in the registry. Employers can independently verify it — no middleman needed.',
  },
  {
    question: 'How do I upload my resume (CVR)?',
    answer:
      'Navigate to the "Resume" tab in the sidebar. Fill in your personal details, education, and experience, then click "Generate CVR." Your resume will be linked to your verified credentials automatically.',
  },
  {
    question: 'What does "Market Score" mean?',
    answer:
      'Your Market Score shows how well your current verified skills match real-time employer demand. A higher score means your skillset is more aligned with what companies are actively hiring for.',
  },
  {
    question: 'Why is my skill shown as "Declining"?',
    answer:
      'Skills are tracked against live job-market data. A "Declining" trend means fewer employers are listing that skill in recent job postings. Consider upskilling — check the AI Career Coach for personalized recommendations.',
  },
  {
    question: 'What is the AI Career Coach?',
    answer:
      'The Career Coach is an AI assistant that analyzes your skills, market trends, and career goals. It provides personalized course recommendations and growth strategies based on real labor market data.',
  },
  {
    question: 'Can I export my CVR as a PDF?',
    answer:
      'Yes! After generating your CVR on the Resume page, click the "Export" button. You can choose between different templates and download a professional PDF.',
  },
  {
    question: 'How are certificates verified?',
    answer:
      'When your registrar issues a certificate, a secure record is created in the database. Anyone with the verification link can independently verify it on the platform.',
  },
];



export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'faq' | 'contact'>('faq');

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Help & Support
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#94A3B8]">
            Find answers, learn how things work, or reach out for assistance.
          </p>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-[#1E2536] p-1 rounded-lg w-fit mb-8">
          <button
            onClick={() => setActiveSection('faq')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSection === 'faq'
                ? 'bg-white dark:bg-[#131825] shadow-sm text-[#06B4C9]'
                : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            FAQs
          </button>

          <button
            onClick={() => setActiveSection('contact')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSection === 'contact'
                ? 'bg-white dark:bg-[#131825] shadow-sm text-[#06B4C9]'
                : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            Contact Support
          </button>
        </div>

        {/* ── FAQ Section ── */}
        {activeSection === 'faq' && (
          <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1E2536]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-[#1E2536]">
              {FAQ_ITEMS.map((faq, index) => (
                <div key={index}>
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-4">
                      {faq.question}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-4">
                      <p className="text-sm text-gray-600 dark:text-[#94A3B8] leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}



        {/* ── Contact Support ── */}
        {activeSection === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Email Support</h3>
              <p className="text-sm text-gray-500 dark:text-[#94A3B8] mb-3">
                Send us a detailed description of your issue and we will get back to you within 24 hours.
              </p>
              <a
                href="mailto:support@vector.edu"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#06B4C9] hover:underline"
              >
                support@vector.edu
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="bg-white dark:bg-[#131825] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-6">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">AI Career Coach</h3>
              <p className="text-sm text-gray-500 dark:text-[#94A3B8] mb-3">
                Have a quick question about your skills or career path? Ask the AI Career Coach directly.
              </p>
              <a
                href="/student/coach"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#06B4C9] hover:underline"
              >
                Open Career Coach
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>

            <div className="md:col-span-2 bg-gray-50 dark:bg-[#0E1220] rounded-2xl border border-gray-200 dark:border-[#1E2536] p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Useful Links</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                <a href="/student/profile" className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#94A3B8] hover:text-[#06B4C9] transition-colors">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Complete Your Profile
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
