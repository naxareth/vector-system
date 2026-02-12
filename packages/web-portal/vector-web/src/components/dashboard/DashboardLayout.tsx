'use client';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SessionTimeout from '../shared/SessionTimeout';
// 1. Import Tour
import DashboardTour from '../shared/DashboardTour'; 

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* 2. Global Components */}
        <SessionTimeout />
        <DashboardTour />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Tour Anchor for Welcome Step */}
          <div id="tour-welcome" className="absolute top-0 left-0 w-full h-20 pointer-events-none" />
          
          <TopBar />
          
          <main className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8 mt-16">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}