import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['openai', 'groq-sdk'],
};

export default nextConfig;
