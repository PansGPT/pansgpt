import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pansgpt/ui', '@pansgpt/types']
};

export default nextConfig;
