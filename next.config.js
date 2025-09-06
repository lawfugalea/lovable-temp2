// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',          // <-- needed for .next/standalone
  reactStrictMode: true,         // optional
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
};

module.exports = nextConfig;