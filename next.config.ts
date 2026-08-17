import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Champion pages check every skin's art against the CDN before rendering it,
  // so their prerender time depends on latency we don't control. The default 60
  // is enough locally and too tight on CI.
  staticPageGenerationTimeout: 180,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ddragon.leagueoflegends.com",
        pathname: "/cdn/**",
      },
    ],
    // Splash art is the only thing large enough to be worth resizing.
    deviceSizes: [640, 828, 1080, 1200, 1920],
  },
};

export default nextConfig;
