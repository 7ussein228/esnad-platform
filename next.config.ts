import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev-tools "N" indicator (bottom-left in `next dev`).
  // Production builds never include it anyway.
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
