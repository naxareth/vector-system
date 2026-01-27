'use client';

interface CVRSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export default function CVRSuccessModal({ isOpen, onClose, onDownload }: CVRSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
        <div className="flex items-center gap-3">
          {/* Success Icon */}
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Message */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">CVR Generated Successfully!</h3>
            <p className="text-sm text-gray-600">Ready to download</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
