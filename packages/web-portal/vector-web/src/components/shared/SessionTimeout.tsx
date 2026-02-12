'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// ⏳ CONFIGURATION
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 Minutes
const WARNING_DURATION = 60 * 1000;     // Show warning 60 seconds before logout

export default function SessionTimeout() {
  const router = useRouter();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false); // 🆕 New State for "Logged Out" view
  const [timeLeft, setTimeLeft] = useState(60);

  // 1. Function to handle the final redirect (User clicks button)
  const handleRedirectToLogin = () => {
    router.push('/login?reason=timeout');
  };

  // 2. Background Logout (Happens when timer hits 0)
  const performBackgroundLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsExpired(true);
    setShowWarning(false);
  }, []);

  // 3. Reset Timer (Only if not already expired)
  const resetTimer = useCallback(() => {
    if (!showWarning && !isExpired) {
      setLastActivity(Date.now());
    }
  }, [showWarning, isExpired]);

  // 4. Listen for activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);

  // 5. The "Tick" Loop
  useEffect(() => {
    // If already expired, stop the loop
    if (isExpired) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeUntilLogout = INACTIVITY_LIMIT - timeSinceLastActivity;

      // Case A: Time is UP -> Kill Session & Show "Expired" Modal
      if (timeUntilLogout <= 0) {
        clearInterval(interval);
        performBackgroundLogout();
      } 
      // Case B: Show Warning Countdown
      else if (timeUntilLogout <= WARNING_DURATION) {
        setShowWarning(true);
        setTimeLeft(Math.ceil(timeUntilLogout / 1000));
      } 
      // Case C: Active
      else {
        if (showWarning) setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, showWarning, isExpired, performBackgroundLogout]);

  // 6. Button to "Stay Logged In"
  const stayLoggedIn = () => {
    setLastActivity(Date.now());
    setShowWarning(false);
  };

  // --- RENDER LOGIC ---

  // 🔴 STATE 1: SESSION EXPIRED (User is logged out, waiting to go to login)
  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border-t-4 border-red-500">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h3>
          <p className="text-gray-600 mb-6">
            You have been logged out due to inactivity to protect your account.
          </p>

          <button 
            onClick={handleRedirectToLogin}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform active:scale-95"
          >
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  // 🟡 STATE 2: WARNING (Counting down)
  if (showWarning) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-purple-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">Are you still there?</h3>
            <p className="text-gray-500 text-sm mb-6">
              For security, you will be logged out in <br/>
              <span className="text-amber-600 font-bold text-xl">{timeLeft}</span> seconds.
            </p>

            <div className="flex gap-3 w-full">
              <button 
                onClick={performBackgroundLogout}
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

  return null;
}