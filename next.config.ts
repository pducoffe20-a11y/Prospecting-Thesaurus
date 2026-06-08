import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // Disable ESLint during production build to avoid compilation failure if rules mismatch
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable typechecking during build for quick compilation
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
