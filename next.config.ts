import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:path*",
          has: [{ type: "host", value: "go.xierra.xyz" }],
          destination: "/GO/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
