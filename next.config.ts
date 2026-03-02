import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore: Mengabaikan peringatan tipe data di editor
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;