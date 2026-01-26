'use client';
import Sidebar from './Sidebar';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
