// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',          // <-- needed for .next/standalone
  outputFileTracingRoot: __dirname, // Fix workspace root warning
  reactStrictMode: false,        // Disable strict mode
  eslint: {
    ignoreDuringBuilds: true,    // Ignore ESLint errors during build
  },
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
    domains: [
      'smart.com.mt',
      'www.smart.com.mt',
      'images.smart.com.mt',
      'cdn.smart.com.mt',
      'static.smart.com.mt',
      'media.smart.com.mt',
      'img.smart.com.mt',
      'assets.smart.com.mt'
    ],
    unoptimized: true, // Disable Next.js image optimization for external images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async redirects() {
    return [
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
    return [];
  },
};

module.exports = nextConfig;