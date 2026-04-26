import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@noble/secp256k1', '@noble/hashes'],
  turbopack: {},
};

export default nextConfig;
