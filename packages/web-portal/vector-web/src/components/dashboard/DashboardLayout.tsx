'use client';
import TopBar from './TopBar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SessionTimeout from '../shared/SessionTimeout';
// 1. Import Tour
import DashboardTour from '../shared/DashboardTour';
import LoginSuccessModal from '../auth/LoginSuccessModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-[#0A0F1C] flex flex-col">
        {/* 2. Global Components */}
        <SessionTimeout />
        <DashboardTour />
        <LoginSuccessModal />

        {/* Tour Anchor for Welcome Step */}
        <div id="tour-welcome" className="absolute top-0 left-0 w-full h-20 pointer-events-none" />

        {/* Top Navigation Bar */}
        <TopBar showNavLinks />

        {/* Page Content — centered, max-width 1128px exactly aligned with TopBar */}
        <main className="flex-1 py-6">
          <div className="max-w-[1128px] mx-auto px-4 w-full">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}