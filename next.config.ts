import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "unpdf", "pg"],
};

export default nextConfig;
