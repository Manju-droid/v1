import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Production optimizations
  reactStrictMode: true,

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  
  // Transpile workspace packages for Next.js
  transpilePackages: ['@v/shared', '@v/api-client'],

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
