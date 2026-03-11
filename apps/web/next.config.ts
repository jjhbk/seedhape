import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@seedhape/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
