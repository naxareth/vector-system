'use client';
import { useState } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';

const FAQ_ITEMS = [
  { q: 'How do I issue a certificate?', a: 'Go to the Issue Certificate page, search for the student, select a certificate template, fill in the required fields, and click "Issue Verified Certificate". You\'ll need to approve the transaction in your MetaMask wallet.' },
  { q: 'What is a certificate template?', a: 'A template defines the fields required for a specific type of certificate (e.g. Academic Degree, Bootcamp Certificate). You can create custom templates under the "Certificate Template" tab on the Issue Certificate page.' },
  { q: 'Can I issue certificates in bulk?', a: 'Yes! Use the "Bulk Upload" tab on the Issue Certificate page. Prepare a CSV file with the required columns (shown after selecting a template), upload it, validate, and issue all certificates at once.' },
  { q: 'What happens after I issue a certificate?', a: 'The certificate is permanently recorded on the blockchain. The student will see it in their dashboard under Verified Credentials. You can track all issued certificates in the Issued Records page.' },
  { q: 'Why does a student show "No Wallet"?', a: 'The student hasn\'t connected a MetaMask wallet yet. They need to do this from their student dashboard. You can still prepare the certificate, but the final blockchain step requires the student to have a wallet address.' },
  { q: 'How do I verify a certificate was issued?', a: 'Go to Issued Records and find the certificate. Click "View Proof" to see the blockchain transaction on Polygonscan, which provides independent, tamper-proof verification.' },
  { q: 'Can I revoke or edit an issued certificate?', a: 'Certificates on the blockchain are immutable — they cannot be changed or deleted. If you need to correct an error, issue a new certificate and add a private note referencing the original.' },
  { q: 'What format should my CSV file be?', a: 'Your CSV must include student_id and wallet_address columns, plus the fields defined by the selected template. Max file size is 1 MB with up to 500 rows. Special characters are automatically cleaned.' },
];

const GUIDES = [
  { title: 'Issue Your First Certificate', steps: ['Navigate to Issue Certificate', 'Search and select a student', 'Choose a certificate template', 'Fill in all required fields', 'Click "Issue Verified Certificate"', 'Approve the transaction in MetaMask'], icon: '📄' },
  { title: 'Create a Certificate Template', steps: ['Go to Issue Certificate → Certificate Template tab', 'Enter a template name and description', 'Add fields with types (text, number, date, etc.)', 'Mark required fields', 'Save the template'], icon: '🏗️' },
  { title: 'Bulk Upload Certificates', steps: ['Go to Issue Certificate → Bulk Upload tab', 'Select a certificate template', 'Download or prepare your CSV file', 'Upload and validate the CSV', 'Review the validated rows', 'Click "Issue" to process all certificates'], icon: '📦' },
];

export default function RegistrarHelpPage() {
  const [activeTab, setActiveTab] = useState<'faq' | 'guides' | 'contact'>('faq');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tabs = [
    { id: 'faq' as const, label: 'FAQs' },
    { id: 'guides' as const, label: 'Step-by-Step Guides' },
    { id: 'contact' as const, label: 'Contact Support' },
  ];

  return (
    <RegistrarLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
          <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-1">
            Guides, frequently asked questions, and support contact information.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 dark:bg-[#131825] p-1 rounded-lg w-fit mb-8">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === t.id
                  ? 'bg-white dark:bg-[#1E2536] shadow-sm text-[#06B4C9]'
                  : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* FAQs */}
        {activeTab === 'faq' && (
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white pr-4">{item.q}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600 dark:text-[#94A3B8] leading-relaxed border-t border-gray-100 dark:border-[#1E2536] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Guides */}
        {activeTab === 'guides' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUIDES.map((guide, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-5 flex flex-col"
              >
                <div className="text-2xl mb-3">{guide.icon}</div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{guide.title}</h3>
                <ol className="space-y-2 text-xs text-gray-600 dark:text-[#94A3B8] flex-1">
                  {guide.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#06B4C9]/10 text-[#06B4C9] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        {/* Contact */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
              <div className="w-10 h-10 bg-[#06B4C9]/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Email Support</h3>
              <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-3">
                For account issues, technical problems, or general questions.
              </p>
              <a
                href="mailto:registrar-support@vector.edu"
                className="text-sm font-medium text-[#06B4C9] hover:underline"
              >
                registrar-support@vector.edu
              </a>
            </div>

            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
              <div className="w-10 h-10 bg-[#06B4C9]/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#06B4C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Documentation</h3>
              <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-3">
                Detailed guides on certificate issuance, templates, and blockchain verification.
              </p>
              <span className="text-sm font-medium text-gray-400 dark:text-[#64748B]">
                Coming soon
              </span>
            </div>

            <div className="bg-white dark:bg-[#0E1220] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 md:col-span-2">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Important Reminders</h3>
              <ul className="text-xs text-gray-500 dark:text-[#94A3B8] space-y-1.5 mt-3">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  Certificates are permanent once issued on the blockchain and cannot be edited or deleted.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  Always double-check student details and certificate information before issuing.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  Keep your MetaMask wallet installed and funded with enough MATIC for transaction fees.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  Private notes are visible only to registrars — students cannot see them.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
