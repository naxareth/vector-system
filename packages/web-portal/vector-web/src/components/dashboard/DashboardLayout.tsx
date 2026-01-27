'use client';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        
        <div className="flex-1 flex flex-col lg:ml-64">
          <TopBar />
          
          {/* Main Content Area */}
          <main className="flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8 mt-16">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
