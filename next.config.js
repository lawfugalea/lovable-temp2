// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',          // <-- needed for .next/standalone
  reactStrictMode: true,         // optional
  async redirects() {
    return [
      { source: '/api/invites/accept', destination: '/invites/accept', permanent: false },
    ];
  },
};

module.exports = nextConfig;
