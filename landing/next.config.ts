import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // No basePath: site served at root for confidant.one; triggers redeploy for custom domain 
  basePath: '',
  images: { unoptimized: true },
  // Resolve and transpile the local confidant-chat-ui package (file:../packages/confidant-chat-ui)
  transpilePackages: ['confidant-chat-ui', 'confidant-design-tokens'],
};

export default nextConfig;
