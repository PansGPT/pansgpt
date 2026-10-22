import "./env";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ["@pansgpt/ui", "@pansgpt/types"],
};

export default nextConfig;
