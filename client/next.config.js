/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
const useLocalApiProxy = !isProduction && publicApiUrl === '/api';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '/api',
  },
  async rewrites() {
    if (!useLocalApiProxy) {
      return [];
    }

    return [{
      source: '/api/:path*',
      destination: 'http://127.0.0.1:3000/:path*',
    }];
  },
};

module.exports = nextConfig;
