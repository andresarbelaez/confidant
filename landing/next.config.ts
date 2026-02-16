import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/confidant',
  images: { unoptimized: true },
  // Resolve and transpile the local confidant-chat-ui package (file:../packages/confidant-chat-ui)
  transpilePackages: ['confidant-chat-ui'],
};

export default nextConfig;
