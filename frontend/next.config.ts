import type { NextConfig } from "@/node_modules/next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "archive.org",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.intra.42.fr",
      },
    ],
    qualities: [75, 90, 100],
  },
};

export default nextConfig;


// next.config.js
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "image.tmdb.org",
//       },
//     ],
//     qualities: [75, 90],
//   },
// };

// module.exports = nextConfig;