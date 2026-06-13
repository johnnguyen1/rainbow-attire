import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static build deployable to classic Firebase Hosting
  output: "export",
  trailingSlash: true,
  images: {
    // No image optimization server in a static export
    unoptimized: true,
  },
};

export default nextConfig;
