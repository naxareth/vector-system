import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 🛡️ SECURITY HEADERS
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
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
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
          }
        ],
      },
    ];
  },
};

export default nextConfig;