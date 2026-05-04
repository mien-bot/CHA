import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*.pmtiles",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range" },
          { key: "Access-Control-Expose-Headers", value: "Content-Range, Content-Length" },
        ],
      },
    ];
  },
};

export default nextConfig;
