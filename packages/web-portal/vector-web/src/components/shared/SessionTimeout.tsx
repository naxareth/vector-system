'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// ⏳ CONFIGURATION
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 Minutes
const WARNING_DURATION = 60 * 1000;      // Show warning 60 seconds before logout

export default function SessionTimeout() {
  const router = useRouter();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // 1. Function to handle logout
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login?reason=timeout');
  }, [router]);

  // 2. Function to reset the timer (User is active)
  const resetTimer = useCallback(() => {
    if (!showWarning) {
      setLastActivity(Date.now());
    }
  }, [showWarning]);

  // 3. Listen for user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    // Add listeners
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    // Cleanup listeners
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);

  // 4. The "Tick" Loop (Checks every second)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeUntilLogout = INACTIVITY_LIMIT - timeSinceLastActivity;

      // Case A: Time to Logout
      if (timeUntilLogout <= 0) {
        clearInterval(interval);
        handleLogout();
      } 
      // Case B: Show Warning
      else if (timeUntilLogout <= WARNING_DURATION) {
        setShowWarning(true);
        setTimeLeft(Math.ceil(timeUntilLogout / 1000));
      } 
      // Case C: All Good (Hide Warning if user moved)
      else {
        if (showWarning) setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, showWarning, handleLogout]);

  // 5. Button to "Stay Logged In"
  const stayLoggedIn = () => {
    setLastActivity(Date.now());
    setShowWarning(false);
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-purple-100 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">Session Expiring</h3>
          <p className="text-gray-500 text-sm mb-6">
            For security, you will be logged out in <br/>
            <span className="text-amber-600 font-bold text-xl">{timeLeft}</span> seconds.
          </p>

          <div className="flex gap-3 w-full">
            <button 
              onClick={handleLogout}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              Log Out
            </button>
            <button 
              onClick={stayLoggedIn}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium shadow-sm transition-colors"
            >
              Stay Active
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}