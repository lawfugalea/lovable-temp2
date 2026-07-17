// next.config.js
const path = require('path');
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://smart.com.mt https://www.smart.com.mt https://images.smart.com.mt https://cdn.smart.com.mt https://static.smart.com.mt https://media.smart.com.mt https://img.smart.com.mt https://assets.smart.com.mt https://www.greens.com.mt https://welbees.mt https://pavipama.com.mt https://www.pavipama.com.mt",
  "connect-src 'self'",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  output: 'standalone',          // <-- needed for .next/standalone
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  reactStrictMode: false,        // Disable strict mode
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Reduce noisy watching; ignore huge folders
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/public/smart-images/**'
        ],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'smart.com.mt' },
      { protocol: 'https', hostname: 'www.smart.com.mt' },
      { protocol: 'https', hostname: 'images.smart.com.mt' },
      { protocol: 'https', hostname: 'cdn.smart.com.mt' },
      { protocol: 'https', hostname: 'static.smart.com.mt' },
      { protocol: 'https', hostname: 'media.smart.com.mt' },
      { protocol: 'https', hostname: 'img.smart.com.mt' },
      { protocol: 'https', hostname: 'assets.smart.com.mt' },
      { protocol: 'https', hostname: 'www.greens.com.mt' },
      { protocol: 'https', hostname: 'welbees.mt' },
      { protocol: 'https', hostname: 'pavipama.com.mt' },
      { protocol: 'https', hostname: 'www.pavipama.com.mt' }
    ],
    unoptimized: true, // Disable Next.js image optimization for external images
  },
  async redirects() {
    return [
      { source: '/', destination: '/landing', permanent: false },
      { source: '/overview', destination: '/dashboard', permanent: true },
      { source: '/ModernDashboard', destination: '/dashboard', permanent: true },
      { source: '/ModernFinances', destination: '/finances', permanent: true },
      { source: '/ModernSettings', destination: '/settings', permanent: true },
      { source: '/ModernShopping', destination: '/shopping', permanent: true },
      { source: '/plain', destination: '/landing', permanent: false },
      { source: '/api/invites/accept', destination: '/invites/accept', permanent: false },
    ];
  },
  async headers() {
    // In dev, make sure HMR and API responses are never cached by the browser
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/_next/webpack-hmr',
          headers: [
            { key: 'Cache-Control', value: 'no-store' },
            { key: 'Pragma', value: 'no-cache' },
          ],
        },
        {
          source: '/_next/static/webpack/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store' },
            { key: 'Pragma', value: 'no-cache' },
          ],
        },
        {
          source: '/api/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store' },
          ],
        },
      ];
    }
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Origin-Agent-Cluster', value: '?1' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
