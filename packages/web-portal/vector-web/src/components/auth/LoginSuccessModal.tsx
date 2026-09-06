'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

interface LoginSuccessModalProps {
  /** Optional callback when modal closes */
  onClose?: () => void;
  /** Force modal visibility for preview/testing */
  forceShow?: boolean;
}

const bgDots = [
  // Left side dots
  { top: '8%', left: '5%', size: 14, color: '#25C9DC' },
  { top: '25%', left: '15%', size: 9, color: '#25C9DC' },
  { top: '35%', left: '4%', size: 11, color: '#25C9DC' },
  { top: '48%', left: '7%', size: 7, color: '#8EE0EA' },
  { top: '54%', left: '2%', size: 5, color: '#25C9DC' },
  { top: '39%', left: '21%', size: 15, color: '#25C9DC' },
  { top: '45%', left: '33%', size: 8, color: '#25C9DC' },
  { top: '21%', left: '26%', size: 7, color: '#8EE0EA' },
  { top: '6%', left: '21%', size: 9, color: '#25C9DC' },

  // Center dots around check badge
  { top: '7%', left: '39%', size: 7, color: '#8EE0EA' },
  { top: '37%', left: '41%', size: 5, color: '#8EE0EA' },
  { top: '49%', left: '46%', size: 6, color: '#25C9DC' },
  { top: '22%', left: '58%', size: 8, color: '#25C9DC' },
  { top: '40%', left: '60%', size: 7, color: '#8EE0EA' },

  // Right side dots
  { top: '14%', left: '68%', size: 14, color: '#25C9DC' },
  { top: '22%', left: '79%', size: 4, color: '#25C9DC' },
  { top: '17%', left: '84%', size: 7, color: '#8EE0EA' },
  { top: '35%', left: '73%', size: 7, color: '#25C9DC' },
  { top: '34%', left: '87%', size: 4, color: '#25C9DC' },
  { top: '50%', left: '81%', size: 7, color: '#8EE0EA' },
  { top: '46%', left: '92%', size: 15, color: '#25C9DC' },
  { top: '12%', left: '95%', size: 6, color: '#8EE0EA' },
];

function LoginSuccessModalInternal({ onClose, forceShow = false }: LoginSuccessModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const searchParams = useSearchParams();

  const showModal = () => {
    setIsOpen(true);
    // Double requestAnimationFrame ensures DOM node is created before setting transition classes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const hideModal = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsOpen(false);
      if (onClose) onClose();
    }, 350);
  };

  useEffect(() => {
    if (forceShow) {
      showModal();
      return;
    }

    const checkTrigger = () => {
      // 1. Synchronous native window.location check
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      const urlHasLogin = params.get('login') === 'success' || params.get('signup') === 'success' || params.get('loginSuccess') === 'true';

      // 2. Router searchParams check
      const routerHasLogin = searchParams.get('login') === 'success' || searchParams.get('signup') === 'success' || searchParams.get('loginSuccess') === 'true';

      // 3. Storage flags
      const hasSessionFlag = typeof window !== 'undefined' && sessionStorage.getItem('vector_login_success') === 'true';
      const hasLocalFlag = typeof window !== 'undefined' && localStorage.getItem('vector_login_success') === 'true';

      if (urlHasLogin || routerHasLogin || hasSessionFlag || hasLocalFlag) {
        showModal();

        // Clear storage flags
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('vector_login_success');
          localStorage.removeItem('vector_login_success');
        }

        // Clean URL query parameters
        if (typeof window !== 'undefined') {
          const newUrl = new URL(window.location.href);
          let updated = false;
          ['login', 'signup', 'loginSuccess'].forEach(p => {
            if (newUrl.searchParams.has(p)) {
              newUrl.searchParams.delete(p);
              updated = true;
            }
          });
          if (updated) {
            window.history.replaceState({}, '', newUrl.pathname + (newUrl.search ? newUrl.search : ''));
          }
        }
      }
    };

    checkTrigger();

    // Listen for custom trigger event
    const handleCustomTrigger = () => showModal();
    window.addEventListener('vector-show-login-modal', handleCustomTrigger);
    return () => window.removeEventListener('vector-show-login-modal', handleCustomTrigger);
  }, [searchParams, forceShow]);

  // Auto-dismiss after 4.5 seconds
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      hideModal();
    }, 4500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[370px] px-4 pointer-events-none">
      <div
        className={`relative w-full bg-white rounded-[24px] shadow-[0_16px_50px_rgba(0,0,0,0.16)] border border-gray-100 overflow-hidden px-6 py-6 flex flex-col items-center justify-center text-center pointer-events-auto transition-all duration-500 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-12 scale-95'
        }`}
      >
        {/* Close button */}
        <button
          onClick={hideModal}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors z-20"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Floating background dots */}
        <div className="absolute top-0 left-0 right-0 h-[60%] pointer-events-none overflow-hidden z-0">
          {bgDots.map((dot, index) => (
            <div
              key={index}
              className="absolute rounded-full"
              style={{
                top: dot.top,
                left: dot.left,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                backgroundColor: dot.color,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        {/* Center checkmark badge (perfect concentric alignment) */}
        <div className="relative z-10 my-1 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Outer halo ring */}
            <div className="w-[68px] h-[68px] rounded-full bg-[#25C9DC]/18 flex items-center justify-center">
              {/* Middle cyan ring */}
              <div className="w-[54px] h-[54px] rounded-full bg-[#B6EBF1] border-[2.5px] border-[#25C9DC] flex items-center justify-center shadow-xs">
                {/* Inner white circle with checkmark */}
                <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center shadow-sm">
                  <svg
                    className="w-5 h-5 text-[#25C9DC]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="relative z-10 text-[#25C9DC] font-bold text-xl sm:text-[21px] tracking-tight mt-3 mb-1 leading-tight">
          Log in successfully!
        </h2>

        {/* Subtitle */}
        <p className="relative z-10 text-[#6B7280] font-normal text-xs sm:text-[13.5px] leading-relaxed">
          Let’s continue where you left off.
        </p>
      </div>
    </div>
  );
}

export default function LoginSuccessModal(props: LoginSuccessModalProps) {
  return (
    <Suspense fallback={null}>
      <LoginSuccessModalInternal {...props} />
    </Suspense>
  );
}
