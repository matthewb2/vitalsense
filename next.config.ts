import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'mksolution.dothome.co.kr',
        port: '',
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
