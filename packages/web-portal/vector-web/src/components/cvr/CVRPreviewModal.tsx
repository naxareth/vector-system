'use client';
import { useRef } from 'react';
import { CVRData } from '@/lib/schemas/cvr';
import ResumeDocumentRenderer from './ResumeDocumentRenderer';

interface CVRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isGenerating: boolean;
  data: CVRData | null;
}

export default function CVRPreviewModal({ isOpen, onClose, onConfirm, isGenerating, data }: CVRPreviewModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const templateName = (data.template || 'professional').charAt(0).toUpperCase() + (data.template || 'professional').slice(1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-[#131825] border-b border-gray-200 dark:border-[#1E2536] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">CVR Preview</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{templateName} template • Review before generating</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#283042] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Back to Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isGenerating}
            className="px-5 py-2 text-sm font-semibold !text-white bg-[#06B4C9] hover:bg-[#06B4C9]/80 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirm & Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Scrollable A4 Preview ───────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-8 px-4" style={{ background: '#e5e7eb' }}>
        <div className="mx-auto" style={{ width: '210mm', maxWidth: '100%' }}>
          {/* Paper */}
          <div
            className="bg-white shadow-xl mx-auto"
            style={{
              width: '210mm',
              minHeight: '297mm',
              maxWidth: '100%',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <ResumeDocumentRenderer data={data} />
          </div>

          {/* Footer info */}
          <p className="text-center text-xs text-gray-500 mt-4 mb-2">
            This is a preview. Click <strong>Confirm & Generate</strong> to save and export your CVR.
          </p>
        </div>
      </div>
    </div>
  );
}
