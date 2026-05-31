/**
 * Supabase Auth Configuration
 * Customizes the appearance and behavior of authentication pages
 */

export const authConfig = {
  // Application branding
  appName: 'VECTOR',
  appUrl: typeof window !== 'undefined' ? window.location.origin : '',
  
  // Redirect URLs  
  redirectUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : '',
  
  // Custom metadata for auth pages
  metadata: {
    applicationName: 'VECTOR',
    applicationUrl: typeof window !== 'undefined' ? window.location.origin : '',
  },

  // OAuth configuration
  oauth: {
    google: {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : '',
    },
  },
};

export function setBrandingMetadata() {
  if (typeof window === 'undefined') return;
  document.title = 'VECTOR - Sign In';
}
