'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import HelpTip from '@/components/shared/HelpTip';

const FAQ_ITEMS = [
  {
    question: 'How do I connect my MetaMask wallet?',
    answer:
      'Make sure you have the MetaMask browser extension installed. Go to your Dashboard and click the "Connect Wallet" button in the welcome banner. MetaMask will ask you to approve the connection — click "Connect" and you\'re done! Your wallet address will appear on the dashboard once connected.',
  },
  {
    question: 'What is a Verified Credential?',
    answer:
      'A Verified Credential is a certificate or qualification issued by your university and permanently recorded on the blockchain. Employers can independently verify it — no middleman needed.',
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
    question: 'How are certificates verified on the blockchain?',
    answer:
      'When your registrar issues a certificate, a unique token is minted on the Polygon network and linked to your wallet. Anyone with the transaction hash can independently verify it on Polygonscan.',
  },
];

const WALLET_STEPS = [
  {
    step: 1,
    title: 'Install MetaMask',
    description: 'Download and install the MetaMask browser extension from metamask.io. Create a new wallet and securely save your recovery phrase.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Switch to the correct network',
    description: 'Open MetaMask and switch to the Polygon Amoy Testnet (or the network specified by your institution). Your registrar can guide you if needed.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'Connect on Vector',
    description: 'Go to your Vector dashboard and click "Connect Wallet". MetaMask will prompt you to approve — click Connect. That\'s it!',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    step: 4,
    title: 'Receive credentials',
    description: 'Once connected, any certificates issued by your registrar will appear automatically in your dashboard. Each one is independently verifiable on the blockchain.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'faq' | 'wallet' | 'contact'>('faq');

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
            onClick={() => setActiveSection('wallet')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSection === 'wallet'
                ? 'bg-white dark:bg-[#131825] shadow-sm text-[#06B4C9]'
                : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            Wallet Setup Guide
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

        {/* ── Wallet Setup Guide ── */}
        {activeSection === 'wallet' && (
          <div className="space-y-6">
            <div className="bg-[#06B4C9]/5 border border-[#06B4C9]/20 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#06B4C9]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Connect Your Wallet
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-[#94A3B8]">
                    Your digital wallet stores your verified certificates securely on the blockchain. Follow these steps to get started.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WALLET_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5 hover:border-[#06B4C9]/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#06B4C9]/10 rounded-lg flex items-center justify-center text-[#06B4C9]">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#06B4C9] bg-[#06B4C9]/10 px-2 py-0.5 rounded-full">
                          Step {item.step}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-[#94A3B8] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Important</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    Never share your recovery phrase with anyone. Vector will never ask for it. Your wallet is your identity — keep it safe.
                  </p>
                </div>
              </div>
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
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#94A3B8] hover:text-[#06B4C9] transition-colors">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Download MetaMask
                </a>
                <a href="https://amoy.polygonscan.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#94A3B8] hover:text-[#06B4C9] transition-colors">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Polygon Explorer
                </a>
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
