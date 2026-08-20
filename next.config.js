// next.config.js
const path = require('path');
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

/**
 * The one inline script this app serves: next-themes' flash-prevention snippet,
 * which sets the theme class on <html> before first paint. Everything else Next
 * emits is an external /_next/static file covered by 'self'.
 *
 * Allowing that one script by hash means script-src no longer needs
 * 'unsafe-inline', which was undermining the rest of this policy — the app
 * renders user-authored rich text and user-uploaded attachments, so injected
 * markup is a live threat model rather than a theoretical one.
 *
 * A hash rather than a nonce, deliberately: a nonce must be minted per request,
 * which for the Pages Router means middleware plus `getInitialProps` in _app,
 * and that would disable Automatic Static Optimization for the public marketing
 * pages. The hash costs nothing at runtime.
 *
 * If next-themes changes this snippet, the hash goes stale and theming silently
 * breaks. tests/security-config.test.ts recomputes it from the library's actual
 * render output and fails if this value drifts — treat a failure there as
 * "update this constant", not as a flaky test.
 */
const THEME_SCRIPT_HASH = "'sha256-cd+HpnSsLaEz1lKWBNn+k+xOe1m2p5ZgfjoyNvHy9eU='";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Meta's own snippet is inline, which this policy does not allow and the
  // deploy-time CSP check would fail. src/components/MetaPixel.tsx loads their
  // library as a plain src script instead, so only the host is needed here.
  `script-src 'self' ${THEME_SCRIPT_HASH} https://kelma.chat https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src 'self' https://kelma.chat",
  "img-src 'self' data: blob: https://kelma.chat https://www.facebook.com https://smart.com.mt https://www.smart.com.mt https://images.smart.com.mt https://cdn.smart.com.mt https://static.smart.com.mt https://media.smart.com.mt https://img.smart.com.mt https://assets.smart.com.mt https://www.greens.com.mt https://welbees.mt https://pavipama.com.mt https://www.pavipama.com.mt",
  "connect-src 'self' https://kelma.chat wss://kelma.chat https://www.facebook.com",
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
  // Strict mode double-invokes effects in development only — it has no effect on
  // a production build. It was previously off with no recorded reason, which
  // gave up the cheapest available detector for missing effect cleanup.
  reactStrictMode: true,
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
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
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
