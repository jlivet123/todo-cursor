/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure assets are served from the correct base path
  basePath: '',
  // Server external packages
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  // Handle static file serving
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Configure webpack to handle chunk loading
  webpack: (config, { isServer, dev }) => {
    // Disable chunk splitting in development to prevent chunk loading issues
    if (dev) {
      config.optimization.splitChunks = false;
      config.optimization.runtimeChunk = false;
    }
    
    // Add error handling for chunk loading
    config.output.chunkLoadingGlobal = 'webpackJsonp';
    
    return config;
  },
  // Add error handling for chunk loading
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;
