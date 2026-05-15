import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Without this, browsers can cache the old sw.js for up to 24h after a
  // deploy, so the SHA-stamped new build never reaches `install` and the
  // update toast in src/components/sw-register.tsx never fires.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
