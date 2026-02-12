'use client';
import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function DashboardTour() {
  
  useEffect(() => {
    // 1. Check if user has already seen the tour
    const hasSeenTour = localStorage.getItem('vector_tour_completed');
    if (hasSeenTour) return;

    // 2. Configure the Tour
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayClickNext: false,
      // Custom class for styling matches (can add to globals.css if needed)
      popoverClass: 'driverjs-theme',
      steps: [
        { 
          element: '#tour-welcome', 
          popover: { 
            title: 'Welcome to VECTOR', 
            description: 'Your decentralized career platform. Let\'s take a quick 30-second tour.',
            side: 'center', 
            align: 'center'
          } 
        },
        { 
          element: '#tour-wallet', 
          popover: { 
            title: 'Digital Identity', 
            description: 'This is your blockchain wallet connection. Use the eye icon to mask your address for privacy.',
            side: 'bottom' 
          } 
        },
        { 
          element: '#tour-notifications', 
          popover: { 
            title: 'Real-time Alerts', 
            description: 'You will be notified here instantly when a Registrar issues a new credential.',
            side: 'left' 
          } 
        },
        { 
          element: '#tour-metrics', 
          popover: { 
            title: 'Performance Data', 
            description: 'Track your Skill Health, Market Relevance, and Verified Tokens at a glance.',
            side: 'bottom' 
          } 
        },
        { 
          element: '#tour-sidebar', 
          popover: { 
            title: 'Main Navigation', 
            description: 'Access your CVR (Resume), AI Coach, and Profile settings from here.',
            side: 'right' 
          } 
        }
      ],
      // 3. Mark as complete when finished
      onDestroyStarted: () => {
        if (!driverObj.hasNextStep() || confirm("Skip the tour?")) {
          localStorage.setItem('vector_tour_completed', 'true');
          driverObj.destroy();
        }
      },
    });

    // 4. Start the tour
    driverObj.drive();
  }, []);

  return null;
}