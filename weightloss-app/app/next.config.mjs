/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // We need to allow large request bodies for photo uploads.
  // The actual size limit is enforced in the API handler.
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb'
    }
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      },
      {
        source: '/uploads/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=3600' }
        ]
      }
    ];
  }
};

export default nextConfig;
