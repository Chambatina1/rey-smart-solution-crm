import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* No standalone output - use standard next start */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
