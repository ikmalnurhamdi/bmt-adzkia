import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Impor ikon lucide per-ikon saja, bukan seluruh paket
    optimizePackageImports: ["lucide-react"],
  },
}

export default nextConfig