import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/confidant',
  images: { unoptimized: true },
};

export default nextConfig;
