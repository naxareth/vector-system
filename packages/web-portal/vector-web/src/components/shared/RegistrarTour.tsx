'use client';
import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function RegistrarTour() {
  
  useEffect(() => {
    // Unique key for Registrar tour
    const hasSeenTour = localStorage.getItem('vector_registrar_tour_completed');
    if (hasSeenTour) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      popoverClass: 'driverjs-theme',
      steps: [
        { 
          element: '#reg-tour-welcome', 
          popover: { 
            title: 'Registrar Portal', 
            description: 'Welcome, Admin. This is your command center for issuing verified credentials.', 
            align: 'center'
          } 
        },
        { 
          element: '#reg-tour-issue', 
          popover: { 
            title: 'Issue Certificate', 
            description: 'Use this form to create a certificate. Issue a single certificate or upload many at once using CSV.',
            side: 'bottom' 
          } 
        },
        // Wallet step removed
        { 
          element: '#reg-tour-nav', 
          popover: { 
            title: 'Audit Tools', 
            description: 'Navigate to "Students" to view the global directory and audit logs.',
            side: 'right' 
          } 
        }
      ],
      onDestroyStarted: () => {
        if (!driverObj.hasNextStep() || confirm("Skip the tour?")) {
          localStorage.setItem('vector_registrar_tour_completed', 'true');
          driverObj.destroy();
        }
      },
    });

    driverObj.drive();
  }, []);

  return null;
}