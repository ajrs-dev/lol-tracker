import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
