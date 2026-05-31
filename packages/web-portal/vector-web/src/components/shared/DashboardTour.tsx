'use client';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '#tour-welcome',
    title: 'Welcome to VECTOR!',
    description: 'Your AI-powered career platform. Let\'s walk you through the key features in under a minute.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    position: 'bottom',
  },
  {
    target: '#tour-stats',
    title: 'Your Performance at a Glance',
    description: 'Track your verified skills count and market relevance score. These update in real-time based on verified data and AI analysis.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    position: 'bottom',
  },
  {
    target: '#tour-credentials',
    title: 'Verified Credentials',
    description: 'All your university-issued and verified skills appear here. Upload a CVR (resume) to get started.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
    position: 'top',
  },
  {
    target: '#tour-sidebar',
    title: 'Navigation Hub',
    description: 'Access your AI Coach for career guidance, manage your CVR, view skills, and update your profile — all from the sidebar.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    position: 'right',
  },
  {
    target: '#tour-setup',
    title: 'Complete Your Setup',
    description: 'Follow these steps to unlock the full potential of VECTOR. A complete profile helps our AI give better recommendations.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    position: 'left',
  },
];

export default function DashboardTour() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const hasSeenTour = localStorage.getItem('vector_tour_v2');
    if (hasSeenTour) return;

    // Delay tour start to let dashboard render
    const timer = setTimeout(() => {
      setCurrentStep(0);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const updateTargetRect = useCallback(() => {
    if (currentStep < 0 || currentStep >= TOUR_STEPS.length) return;
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateTargetRect();
    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('vector_tour_v2', 'true');
    setCurrentStep(-1);
  };

  const handleSkip = () => {
    handleFinish();
  };

  if (!mounted || currentStep < 0 || currentStep >= TOUR_STEPS.length) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Calculate popover position
  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const gap = 16;
    const style: React.CSSProperties = { position: 'fixed' };

    switch (step.position) {
      case 'bottom':
        style.top = targetRect.bottom + gap;
        style.left = targetRect.left + targetRect.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'top':
        style.bottom = window.innerHeight - targetRect.top + gap;
        style.left = targetRect.left + targetRect.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.top = targetRect.top + targetRect.height / 2;
        style.right = window.innerWidth - targetRect.left + gap;
        style.transform = 'translateY(-50%)';
        break;
      case 'right':
        style.top = targetRect.top + targetRect.height / 2;
        style.left = targetRect.right + gap;
        style.transform = 'translateY(-50%)';
        break;
    }

    return style;
  };

  // Spotlight cutout
  const getSpotlightStyle = (): React.CSSProperties | null => {
    if (!targetRect) return null;
    const padding = 8;
    return {
      position: 'fixed',
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
      borderRadius: '12px',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
      zIndex: 9998,
      pointerEvents: 'none' as const,
      transition: 'all 0.3s ease-in-out',
    };
  };

  const spotlightStyle = getSpotlightStyle();

  return createPortal(
    <>
      {/* Overlay - click to skip */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={handleSkip}
        style={{ cursor: 'pointer' }}
      />

      {/* Spotlight cutout */}
      {spotlightStyle && <div style={spotlightStyle} />}

      {/* Popover */}
      <div
        style={{ ...getPopoverStyle(), zIndex: 9999 }}
        className="w-[340px] max-w-[90vw] animate-fade-in-up"
      >
        <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 dark:bg-[#1A2030]">
            <div
              className="h-full bg-[#06B4C9] transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#06B4C9]/10 flex items-center justify-center text-[#06B4C9] flex-shrink-0">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{step.title}</h3>
                  <button
                    onClick={handleSkip}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 -mr-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <span className="text-[11px] text-[#06B4C9] font-medium">{currentStep + 1} of {TOUR_STEPS.length}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1E2536] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#06B4C9] rounded-lg hover:bg-[#06B4C9]/80 transition-colors"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}