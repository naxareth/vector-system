import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  // 🚀 # Cloudflare Turnstile (DEFENSE MODE - Testing Keys)
  // NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
  // TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
  // 🚀 SILENCE TURBOPACK WEBPACK CONFLICT
  // This build uses a webpack-based PWA plugin. Next.js 16 (Turbopack)
  // needs an explicit opt-in to ignore the webpack config in dev.
  turbopack: {},

  // 🛡️ Remove X-Powered-By header
  poweredByHeader: false,

  // �️ EXTERNAL IMAGE HOSTS
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
    ],
  },

  // �🛡️ SECURITY HEADERS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Prevents browser from guessing MIME types (MIME Sniffing)
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY' // Prevents Clickjacking (can't be embedded in iframes)
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block' // Legacy XSS protection
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()' // Blocks access to sensitive hardware
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://challenges.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://generativelanguage.googleapis.com https://*.pinata.cloud https://rpc-amoy.polygon.technology https://polygon-amoy-bor-rpc.publicnode.com https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; worker-src 'self' blob:; child-src 'self' blob: https://challenges.cloudflare.com; frame-ancestors 'self';"
          }
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);