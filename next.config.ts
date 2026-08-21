import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the whole studio is client-side, so it can be served by any
  // static file server — including a one-line server inside a Tenki sandbox.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
